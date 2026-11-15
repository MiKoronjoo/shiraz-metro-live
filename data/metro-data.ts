import line1PathData from "@/data/line1-path.json";
import type {
  DirectionSchedule,
  LatLngTuple,
  MetroLine,
  ServiceDaySchedule,
  Station,
} from "@/lib/types";

const DEFAULT_DWELL_SECONDS = 30;

function station(
  lineId: string,
  id: string,
  fa: string,
  en: string,
  position: LatLngTuple,
  pathIndex: number,
  serviceStatus: Station["serviceStatus"] = "active-stop",
  interchangeWith?: string[],
): Station {
  return {
    id,
    lineId,
    name: { fa, en },
    position,
    pathIndex,
    serviceStatus,
    dwellSeconds: serviceStatus === "active-stop" ? DEFAULT_DWELL_SECONDS : 0,
    interchangeWith,
  };
}

const line1Index = line1PathData.stationPathIndices as Record<string, number>;
const line1Path = line1PathData.path as LatLngTuple[];

const line1Stations: Station[] = [
  station("line-1", "shahid-dastgheyb", "شهید دستغیب", "Shahid Dastgheyb", [29.551737, 52.599138], line1Index["shahid-dastgheyb"]),
  station("line-1", "shahid-doran", "شهید دوران", "Shahid Doran", [29.5586872, 52.5945809], line1Index["shahid-doran"]),
  station("line-1", "forsat-shirazi", "فرصت شیرازی", "Forsat-e Shirazi", [29.564944, 52.590445], line1Index["forsat-shirazi"]),
  station("line-1", "janbazan", "جانبازان", "Janbazan", [29.572326, 52.585322], line1Index.janbazan),
  station("line-1", "ghadir", "غدیر", "Ghadir", [29.580681, 52.579204], line1Index.ghadir),
  station("line-1", "razi", "رازی", "Razi", [29.587457, 52.57422], line1Index.razi),
  station("line-1", "fazilat", "فضیلت", "Fazilat", [29.596131, 52.567872], line1Index.fazilat),
  station("line-1", "kaveh", "کاوه", "Kaveh", [29.602899, 52.562893], line1Index.kaveh),
  station("line-1", "valiasr", "ولیعصر", "Valiasr", [29.608238, 52.558521], line1Index.valiasr),
  station("line-1", "vakilorroaya", "وکیل الرعایا", "Vakilorroaya", [29.612416, 52.551784], line1Index.vakilorroaya),
  station("line-1", "zandiyeh", "زندیه", "Zandiyeh", [29.618908, 52.540671], line1Index.zandiyeh),
  station("line-1", "l1-imam-hossein", "امام حسین", "Imam Hossein", [29.6240701, 52.5319584], line1Index["imam-hossein"], "active-stop", ["line-2"]),
  station("line-1", "namazi", "نمازی", "Namazi", [29.6314651, 52.519741], line1Index.namazi),
  station("line-1", "shahid-avini", "شهید آوینی", "Shahid Avini", [29.631524, 52.511749], line1Index["shahid-avini"]),
  station("line-1", "shahid-motahari", "شهید مطهری", "Shahid Motahari", [29.63742, 52.502764], line1Index["shahid-motahari"]),
  station("line-1", "qasrodasht", "قصردشت", "Qasrodasht", [29.655225, 52.485423], line1Index.qasrodasht),
  station("line-1", "shahed", "شاهد", "Shahed", [29.666233, 52.486525], line1Index.shahed),
  station("line-1", "mirza-shirazi", "میرزای شیرازی", "Mirza-ye Shirazi", [29.6865746, 52.4736781], line1Index["mirza-shirazi"]),
  station("line-1", "shariati", "دکتر شریعتی", "Shari'ati", [29.6827061, 52.4650396], line1Index.shariati),
  station("line-1", "ehsan", "احسان", "Ehsan", [29.6782824, 52.454714], line1Index.ehsan),
];

function line1Direction(
  id: DirectionSchedule["id"],
  firstDeparture: string,
  lastDeparture: string,
): DirectionSchedule {
  if (id === "forward") {
    return {
      id,
      originStationId: "shahid-dastgheyb",
      destinationStationId: "ehsan",
      firstDeparture,
      lastDeparture,
      intervalMinutes: 15,
      stopOffsets: [
        ["shahid-dastgheyb", 0], ["shahid-doran", 2], ["forsat-shirazi", 4],
        ["janbazan", 6], ["ghadir", 8], ["razi", 10], ["fazilat", 12],
        ["kaveh", 14], ["valiasr", 16], ["vakilorroaya", 18],
        ["zandiyeh", 20], ["l1-imam-hossein", 22], ["namazi", 24],
        ["shahid-avini", 26], ["shahid-motahari", 28], ["qasrodasht", 32],
        ["shahed", 35], ["mirza-shirazi", 39], ["shariati", 40],
      ].map(([stationId, minutes]) => ({ stationId: String(stationId), departureOffsetSeconds: Number(minutes) * 60 })),
      terminalArrivalOffsetSeconds: 41.5 * 60,
    };
  }

  return {
    id,
    originStationId: "ehsan",
    destinationStationId: "shahid-dastgheyb",
    firstDeparture,
    lastDeparture,
    intervalMinutes: 15,
    stopOffsets: [
      ["ehsan", 0], ["shariati", 2], ["mirza-shirazi", 4], ["shahed", 8],
      ["qasrodasht", 10], ["shahid-motahari", 14], ["shahid-avini", 16],
      ["namazi", 18], ["l1-imam-hossein", 21], ["zandiyeh", 23],
      ["vakilorroaya", 25], ["valiasr", 27], ["kaveh", 29], ["fazilat", 31],
      ["razi", 33], ["ghadir", 35], ["janbazan", 37], ["forsat-shirazi", 39],
      ["shahid-doran", 41],
    ].map(([stationId, minutes]) => ({ stationId: String(stationId), departureOffsetSeconds: Number(minutes) * 60 })),
    terminalArrivalOffsetSeconds: 42.5 * 60,
  };
}

const line1Regular: ServiceDaySchedule = {
  forward: line1Direction("forward", "06:10", "22:10"),
  backward: line1Direction("backward", "06:05", "22:05"),
};

const line1Holiday: ServiceDaySchedule = {
  forward: line1Direction("forward", "07:10", "21:10"),
  backward: line1Direction("backward", "07:05", "21:05"),
};

const line2StationRaw = [
  ["shokoufeh", "شکوفه", "Shokoufeh", 29.572879, 52.486998, "under-construction"],
  ["ghahramanan", "قهرمانان", "Ghahramanan", 29.5701791, 52.4965036, "active-stop"],
  ["adelabad", "شهدای عادل‌آباد", "Adelabad", 29.5803673, 52.5063302, "active-stop"],
  ["dowlat", "دولت", "Dowlat", 29.5882256, 52.5081335, "pass-through"],
  ["rahmat", "رحمت", "Rahmat", 29.5974761, 52.5107135, "pass-through"],
  ["basij", "بسیج", "Basij", 29.6039128, 52.5158273, "active-stop"],
  ["esteghlal", "استقلال", "Esteghlal", 29.6139309, 52.5237246, "active-stop"],
  ["15-khordad", "۱۵ خرداد", "15-e Khordad", 29.619841, 52.528494, "under-construction"],
  ["l2-imam-hossein", "امام حسین", "Imam Hossein", 29.6240701, 52.5319584, "active-stop"],
  ["azadi", "آزادی", "Azadi", 29.630459, 52.537227, "under-construction"],
  ["atlasi", "اطلسی", "Atlasi", 29.629027, 52.551861, "under-construction"],
  ["hafezieh", "حافظ", "Hafezieh", 29.625134, 52.557473, "under-construction"],
  ["saadieh", "کلبه سعدی", "Sa'adieh", 29.614496, 52.569521, "under-construction"],
] as const;

const line2Path: LatLngTuple[] = line2StationRaw.map((item) => [item[3], item[4]] as LatLngTuple);
const line2Stations: Station[] = line2StationRaw.map((item, index) =>
  station(
    "line-2",
    item[0],
    item[1],
    item[2],
    [item[3], item[4]],
    index,
    item[5],
    item[0] === "l2-imam-hossein" ? ["line-1"] : undefined,
  ),
);

const line2Regular: ServiceDaySchedule = {
  forward: {
    id: "forward",
    originStationId: "ghahramanan",
    destinationStationId: "l2-imam-hossein",
    firstDeparture: "06:00",
    lastDeparture: "18:00",
    intervalMinutes: 40,
    stopOffsets: [
      { stationId: "ghahramanan", departureOffsetSeconds: 0 },
      { stationId: "adelabad", departureOffsetSeconds: 3 * 60 },
      { stationId: "basij", departureOffsetSeconds: 10 * 60 },
      { stationId: "esteghlal", departureOffsetSeconds: 13 * 60 },
    ],
    terminalArrivalOffsetSeconds: 16 * 60,
  },
  backward: {
    id: "backward",
    originStationId: "l2-imam-hossein",
    destinationStationId: "ghahramanan",
    firstDeparture: "06:20",
    lastDeparture: "17:40",
    intervalMinutes: 40,
    stopOffsets: [
      { stationId: "l2-imam-hossein", departureOffsetSeconds: 0 },
      { stationId: "esteghlal", departureOffsetSeconds: 3 * 60 },
      { stationId: "basij", departureOffsetSeconds: 6 * 60 },
      { stationId: "adelabad", departureOffsetSeconds: 13 * 60 },
    ],
    terminalArrivalOffsetSeconds: 16 * 60,
  },
};

export const metroLines: MetroLine[] = [
  {
    id: "line-1",
    number: 1,
    name: { fa: "خط ۱", en: "Line 1" },
    color: "#e53935",
    path: line1Path,
    stations: line1Stations,
    activePathStartStationId: "shahid-dastgheyb",
    activePathEndStationId: "ehsan",
    approximatePath: true,
    closedOnHoliday: false,
    schedules: { regular: line1Regular, holiday: line1Holiday },
  },
  {
    id: "line-2",
    number: 2,
    name: { fa: "خط ۲", en: "Line 2" },
    color: "#1f9d55",
    path: line2Path,
    stations: line2Stations,
    activePathStartStationId: "ghahramanan",
    activePathEndStationId: "l2-imam-hossein",
    approximatePath: true,
    closedOnHoliday: true,
    schedules: { regular: line2Regular },
  },
];

export const allStations = metroLines.flatMap((line) => line.stations);
export const defaultDwellSeconds = DEFAULT_DWELL_SECONDS;
