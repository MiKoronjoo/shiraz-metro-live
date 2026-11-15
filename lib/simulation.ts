import { metroLines } from "@/data/metro-data";
import { bearingAtDistance, buildCumulativeDistances, pointAtDistance } from "@/lib/geo";
import type {
  DaySimulation,
  DirectionSchedule,
  MetroLine,
  PreparedLine,
  ScheduledTrip,
  ServiceMode,
  StationArrival,
  TrainState,
  TripStopEvent,
  VehicleTimeline,
} from "@/lib/types";

const FINAL_TERMINAL_DISPLAY_SECONDS = 5 * 60;

export function parseClockTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60;
}

export function formatSecondsAsClock(seconds: number, locale: "fa" | "en"): string {
  const normalized = ((Math.round(seconds) % 86400) + 86400) % 86400;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const output = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return locale === "fa" ? output.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]) : output;
}

function prepareLine(line: MetroLine): PreparedLine {
  const cumulativeDistances = buildCumulativeDistances(line.path);
  const stationDistances = Object.fromEntries(
    line.stations.map((station) => [
      station.id,
      cumulativeDistances[Math.min(station.pathIndex, cumulativeDistances.length - 1)],
    ]),
  );
  return { ...line, cumulativeDistances, stationDistances };
}

function createTrip(
  line: PreparedLine,
  schedule: DirectionSchedule,
  departureSeconds: number,
  ordinal: number,
): ScheduledTrip {
  const stationById = new Map(line.stations.map((station) => [station.id, station]));
  const events: TripStopEvent[] = schedule.stopOffsets.map((stop, index) => {
    const station = stationById.get(stop.stationId);
    if (!station) throw new Error(`Unknown station ${stop.stationId} on ${line.id}`);
    const departure = departureSeconds + stop.departureOffsetSeconds;
    const dwell = index === 0 ? 0 : station.dwellSeconds ?? 30;
    return {
      stationId: station.id,
      distance: line.stationDistances[station.id],
      arrivalSeconds: departure - dwell,
      departureSeconds: departure,
      dwellSeconds: dwell,
      terminal: false,
    };
  });

  const terminal = stationById.get(schedule.destinationStationId);
  if (!terminal) throw new Error(`Unknown terminal ${schedule.destinationStationId} on ${line.id}`);
  const arrivalSeconds = departureSeconds + schedule.terminalArrivalOffsetSeconds;
  events.push({
    stationId: terminal.id,
    distance: line.stationDistances[terminal.id],
    arrivalSeconds,
    dwellSeconds: 0,
    terminal: true,
  });

  return {
    id: `${line.id}-${schedule.id}-${ordinal}`,
    lineId: line.id,
    direction: schedule.id,
    originStationId: schedule.originStationId,
    destinationStationId: schedule.destinationStationId,
    departureSeconds,
    arrivalSeconds,
    events,
    trainId: "",
  };
}

function tripsForSchedule(line: PreparedLine, schedule: DirectionSchedule): ScheduledTrip[] {
  const first = parseClockTime(schedule.firstDeparture);
  const last = parseClockTime(schedule.lastDeparture);
  const interval = schedule.intervalMinutes * 60;
  const trips: ScheduledTrip[] = [];
  let ordinal = 1;
  for (let departure = first; departure <= last; departure += interval) {
    trips.push(createTrip(line, schedule, departure, ordinal));
    ordinal += 1;
  }
  return trips;
}

interface MutableVehicle {
  trainId: string;
  lineId: string;
  location: string;
  availableAt: number;
  trips: ScheduledTrip[];
}

function assignVehicles(lineId: string, trips: ScheduledTrip[]): VehicleTimeline[] {
  const vehicles: MutableVehicle[] = [];
  const sorted = [...trips].sort((a, b) => a.departureSeconds - b.departureSeconds || a.direction.localeCompare(b.direction));

  for (const trip of sorted) {
    const candidates = vehicles
      .filter((vehicle) => vehicle.location === trip.originStationId && vehicle.availableAt <= trip.departureSeconds)
      .sort((a, b) => b.availableAt - a.availableAt);

    let vehicle = candidates[0];
    if (!vehicle) {
      vehicle = {
        trainId: `L${lineId.replace("line-", "")}-T${vehicles.length + 1}`,
        lineId,
        location: trip.originStationId,
        availableAt: Number.NEGATIVE_INFINITY,
        trips: [],
      };
      vehicles.push(vehicle);
    }

    trip.trainId = vehicle.trainId;
    vehicle.trips.push(trip);
    vehicle.location = trip.destinationStationId;
    vehicle.availableAt = trip.arrivalSeconds;
  }

  return vehicles.map(({ trainId, trips: vehicleTrips }) => ({
    trainId,
    lineId,
    trips: vehicleTrips.sort((a, b) => a.departureSeconds - b.departureSeconds),
  }));
}

export function createDaySimulation(mode: ServiceMode): DaySimulation {
  const preparedLines = Object.fromEntries(metroLines.map((line) => [line.id, prepareLine(line)]));
  const trips: ScheduledTrip[] = [];
  const vehicles: VehicleTimeline[] = [];

  for (const line of Object.values(preparedLines)) {
    const service = mode === "holiday" ? line.schedules.holiday : line.schedules.regular;
    if (!service || (mode === "holiday" && line.closedOnHoliday)) continue;
    const lineTrips = [
      ...tripsForSchedule(line, service.forward),
      ...tripsForSchedule(line, service.backward),
    ];
    trips.push(...lineTrips);
    vehicles.push(...assignVehicles(line.id, lineTrips));
  }

  return { mode, lines: preparedLines, trips, vehicles };
}

function stateDuringTrip(
  simulation: DaySimulation,
  trip: ScheduledTrip,
  secondsOfDay: number,
): TrainState {
  const line = simulation.lines[trip.lineId];
  const directionSign: 1 | -1 = trip.direction === "forward" ? 1 : -1;

  for (const event of trip.events) {
    if (
      event.departureSeconds !== undefined &&
      event.dwellSeconds > 0 &&
      secondsOfDay >= event.arrivalSeconds &&
      secondsOfDay < event.departureSeconds
    ) {
      return {
        trainId: trip.trainId,
        lineId: trip.lineId,
        direction: trip.direction,
        destinationStationId: trip.destinationStationId,
        position: pointAtDistance(line.path, line.cumulativeDistances, event.distance),
        bearing: bearingAtDistance(line.path, line.cumulativeDistances, event.distance, directionSign),
        status: "stopped",
        currentStationId: event.stationId,
        nextStationId: event.stationId,
        countdownSeconds: Math.max(0, event.departureSeconds - secondsOfDay),
      };
    }
  }

  for (let index = 0; index < trip.events.length - 1; index += 1) {
    const current = trip.events[index];
    const next = trip.events[index + 1];
    const movementStart = current.departureSeconds ?? current.arrivalSeconds;
    const movementEnd = next.arrivalSeconds;
    if (secondsOfDay >= movementStart && secondsOfDay < movementEnd) {
      const progress = movementEnd === movementStart ? 1 : (secondsOfDay - movementStart) / (movementEnd - movementStart);
      const distance = current.distance + (next.distance - current.distance) * progress;
      return {
        trainId: trip.trainId,
        lineId: trip.lineId,
        direction: trip.direction,
        destinationStationId: trip.destinationStationId,
        position: pointAtDistance(line.path, line.cumulativeDistances, distance),
        bearing: bearingAtDistance(line.path, line.cumulativeDistances, distance, directionSign),
        status: "moving",
        nextStationId: next.stationId,
        countdownSeconds: Math.max(0, movementEnd - secondsOfDay),
      };
    }
  }

  const terminal = trip.events[trip.events.length - 1];
  return {
    trainId: trip.trainId,
    lineId: trip.lineId,
    direction: trip.direction,
    destinationStationId: trip.destinationStationId,
    position: pointAtDistance(line.path, line.cumulativeDistances, terminal.distance),
    bearing: bearingAtDistance(line.path, line.cumulativeDistances, terminal.distance, directionSign),
    status: "terminating",
    currentStationId: terminal.stationId,
    nextStationId: terminal.stationId,
    countdownSeconds: 0,
  };
}

export function getTrainStates(simulation: DaySimulation, secondsOfDay: number): TrainState[] {
  const states: TrainState[] = [];

  for (const vehicle of simulation.vehicles) {
    const activeTrip = vehicle.trips.find(
      (trip) => secondsOfDay >= trip.departureSeconds && secondsOfDay <= trip.arrivalSeconds,
    );
    if (activeTrip) {
      states.push(stateDuringTrip(simulation, activeTrip, secondsOfDay));
      continue;
    }

    const previous = [...vehicle.trips]
      .reverse()
      .find((trip) => trip.arrivalSeconds < secondsOfDay);
    const next = vehicle.trips.find((trip) => trip.departureSeconds > secondsOfDay);

    if (previous && next && previous.destinationStationId === next.originStationId) {
      const line = simulation.lines[vehicle.lineId];
      const distance = line.stationDistances[previous.destinationStationId];
      const nextDirectionSign: 1 | -1 = next.direction === "forward" ? 1 : -1;
      states.push({
        trainId: vehicle.trainId,
        lineId: vehicle.lineId,
        direction: next.direction,
        destinationStationId: next.destinationStationId,
        position: pointAtDistance(line.path, line.cumulativeDistances, distance),
        bearing: bearingAtDistance(line.path, line.cumulativeDistances, distance, nextDirectionSign),
        status: "terminating",
        currentStationId: previous.destinationStationId,
        nextStationId: next.destinationStationId,
        countdownSeconds: Math.max(0, next.departureSeconds - secondsOfDay),
        nextDepartureSeconds: next.departureSeconds,
      });
      continue;
    }

    if (previous && !next && secondsOfDay <= previous.arrivalSeconds + FINAL_TERMINAL_DISPLAY_SECONDS) {
      states.push(stateDuringTrip(simulation, previous, previous.arrivalSeconds));
    }
  }

  return states;
}

function stationArrivalOnTrip(trip: ScheduledTrip, stationId: string): number | undefined {
  const event = trip.events.find((item) => item.stationId === stationId);
  return event?.arrivalSeconds;
}

export function getNextArrivals(
  simulation: DaySimulation,
  stationId: string,
  secondsOfDay: number,
  limit = 2,
): StationArrival[] {
  const stationLine = Object.values(simulation.lines).find((line) => line.stations.some((station) => station.id === stationId));
  const station = stationLine?.stations.find((item) => item.id === stationId);
  if (!station || station.serviceStatus !== "active-stop") return [];

  return simulation.trips
    .filter((trip) => trip.lineId === station.lineId)
    .map((trip) => ({ trip, arrivalSeconds: stationArrivalOnTrip(trip, stationId) }))
    .filter((item): item is { trip: ScheduledTrip; arrivalSeconds: number } =>
      item.arrivalSeconds !== undefined && item.arrivalSeconds >= secondsOfDay,
    )
    .sort((a, b) => a.arrivalSeconds - b.arrivalSeconds)
    .slice(0, limit)
    .map(({ trip, arrivalSeconds }) => ({
      trainId: trip.trainId,
      lineId: trip.lineId,
      direction: trip.direction,
      destinationStationId: trip.destinationStationId,
      arrivalSeconds,
      countdownSeconds: arrivalSeconds - secondsOfDay,
    }));
}

export function getServiceWindow(simulation: DaySimulation, lineId: string): { start: number; end: number } | undefined {
  const trips = simulation.trips.filter((trip) => trip.lineId === lineId);
  if (trips.length === 0) return undefined;
  return {
    start: Math.min(...trips.map((trip) => trip.departureSeconds)),
    end: Math.max(...trips.map((trip) => trip.arrivalSeconds)),
  };
}
