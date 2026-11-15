import type { Language, TrainStatus } from "@/lib/types";

export const strings = {
  fa: {
    appName: "متروی زنده شیراز",
    estimated: "موقعیت تقریبی بر اساس برنامه زمان‌بندی",
    search: "جستجوی ایستگاه",
    regularDay: "روز عادی",
    holiday: "تعطیل",
    holidayMode: "حالت تعطیل",
    darkMode: "حالت تاریک",
    lightMode: "حالت روشن",
    fullscreen: "تمام‌صفحه",
    exitFullscreen: "خروج از تمام‌صفحه",
    allLines: "همه خطوط",
    line: "خط",
    liveTrains: "قطار فعال",
    serviceActive: "سرویس فعال",
    serviceClosed: "سرویس تعطیل است",
    serviceStarts: "شروع سرویس",
    serviceEnded: "سرویس امروز پایان یافته",
    nextArrivals: "رسیدن‌های بعدی",
    noMoreTrains: "قطار دیگری برای امروز نیست",
    trainsDoNotStop: "قطار در این ایستگاه توقف ندارد",
    underConstruction: "در دست احداث",
    activeStop: "ایستگاه فعال",
    passThrough: "عبوری بدون توقف",
    direction: "به سمت",
    arrivesIn: "رسیدن تا",
    departsIn: "حرکت تا",
    reversesIn: "حرکت برگشت تا",
    atTerminal: "در پایانه",
    moving: "در حال حرکت",
    stopped: "متوقف در ایستگاه",
    terminating: "در حال تغییر مسیر",
    now: "اکنون",
    gregorian: "میلادی",
    solarHijri: "هجری شمسی",
    approximateRoute: "مسیر تقریبی",
    routeNotice: "مسیر خط ۱ از نقشه مرجع بازسازی شده و مسیر خط ۲ فعلاً تقریبی است.",
    selectStation: "برای دیدن زمان رسیدن، یک ایستگاه را انتخاب کنید.",
    noSearchResults: "ایستگاهی پیدا نشد",
    stations: "ایستگاه‌ها",
    active: "فعال",
    closed: "تعطیل",
    startsIn: "شروع تا",
    train: "قطار",
    countdownNow: "اکنون",
    language: "English",
  },
  en: {
    appName: "Shiraz Metro Live",
    estimated: "Estimated position based on the timetable",
    search: "Search stations",
    regularDay: "Regular day",
    holiday: "Holiday",
    holidayMode: "Holiday mode",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    allLines: "All lines",
    line: "Line",
    liveTrains: "live trains",
    serviceActive: "Service active",
    serviceClosed: "Service closed",
    serviceStarts: "Service starts",
    serviceEnded: "Service ended for today",
    nextArrivals: "Next arrivals",
    noMoreTrains: "No more trains today",
    trainsDoNotStop: "Trains pass through without stopping",
    underConstruction: "Under construction",
    activeStop: "Active station",
    passThrough: "Pass-through station",
    direction: "Toward",
    arrivesIn: "Arrives in",
    departsIn: "Departs in",
    reversesIn: "Reverses in",
    atTerminal: "At terminal",
    moving: "Moving",
    stopped: "Stopped at station",
    terminating: "Turning around",
    now: "Now",
    gregorian: "Gregorian",
    solarHijri: "Solar Hijri",
    approximateRoute: "Approximate route",
    routeNotice: "Line 1 was reconstructed from the reference map; Line 2 is currently approximate.",
    selectStation: "Select a station to see arrival times.",
    noSearchResults: "No stations found",
    stations: "Stations",
    active: "Active",
    closed: "Closed",
    startsIn: "Starts in",
    train: "Train",
    countdownNow: "Now",
    language: "فارسی",
  },
} as const;

export function t(language: Language) {
  return strings[language];
}

export function statusLabel(language: Language, status: TrainStatus): string {
  return strings[language][status];
}

export function localizeDigits(value: string, language: Language): string {
  if (language === "en") return value;
  return value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function formatCountdown(totalSeconds: number, language: Language): string {
  if (totalSeconds <= 1) return strings[language].countdownNow;
  const rounded = Math.ceil(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${language === "fa" ? "س" : "h"}`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}${language === "fa" ? "د" : "m"}`);
  if (hours === 0) parts.push(`${seconds}${language === "fa" ? "ث" : "s"}`);
  return localizeDigits(parts.join(" "), language);
}
