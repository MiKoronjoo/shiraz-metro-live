export type Language = "fa" | "en";
export type ServiceMode = "regular" | "holiday";
export type DirectionId = "forward" | "backward";
export type StationServiceStatus =
  | "active-stop"
  | "pass-through"
  | "under-construction";

export type LatLngTuple = [latitude: number, longitude: number];

export interface LocalizedText {
  fa: string;
  en: string;
}

export interface Station {
  id: string;
  lineId: string;
  name: LocalizedText;
  position: LatLngTuple;
  pathIndex: number;
  serviceStatus: StationServiceStatus;
  dwellSeconds?: number;
  interchangeWith?: string[];
}

export interface StopOffset {
  stationId: string;
  departureOffsetSeconds: number;
}

export interface DirectionSchedule {
  id: DirectionId;
  originStationId: string;
  destinationStationId: string;
  firstDeparture: string;
  lastDeparture: string;
  intervalMinutes: number;
  stopOffsets: StopOffset[];
  terminalArrivalOffsetSeconds: number;
}

export interface ServiceDaySchedule {
  forward: DirectionSchedule;
  backward: DirectionSchedule;
}

export interface MetroLine {
  id: string;
  number: number;
  name: LocalizedText;
  color: string;
  path: LatLngTuple[];
  stations: Station[];
  activePathStartStationId: string;
  activePathEndStationId: string;
  approximatePath: boolean;
  closedOnHoliday: boolean;
  schedules: {
    regular: ServiceDaySchedule;
    holiday?: ServiceDaySchedule;
  };
}

export interface PreparedLine extends MetroLine {
  cumulativeDistances: number[];
  stationDistances: Record<string, number>;
}

export interface TripStopEvent {
  stationId: string;
  distance: number;
  arrivalSeconds: number;
  departureSeconds?: number;
  dwellSeconds: number;
  terminal: boolean;
}

export interface ScheduledTrip {
  id: string;
  lineId: string;
  direction: DirectionId;
  originStationId: string;
  destinationStationId: string;
  departureSeconds: number;
  arrivalSeconds: number;
  events: TripStopEvent[];
  trainId: string;
}

export interface VehicleTimeline {
  trainId: string;
  lineId: string;
  trips: ScheduledTrip[];
}

export interface DaySimulation {
  mode: ServiceMode;
  lines: Record<string, PreparedLine>;
  trips: ScheduledTrip[];
  vehicles: VehicleTimeline[];
}

export type TrainStatus = "moving" | "stopped" | "terminating";

export interface TrainState {
  trainId: string;
  lineId: string;
  direction: DirectionId;
  destinationStationId: string;
  position: LatLngTuple;
  bearing: number;
  status: TrainStatus;
  currentStationId?: string;
  nextStationId?: string;
  countdownSeconds?: number;
  nextDepartureSeconds?: number;
}

export interface StationArrival {
  trainId: string;
  lineId: string;
  direction: DirectionId;
  destinationStationId: string;
  arrivalSeconds: number;
  countdownSeconds: number;
}
