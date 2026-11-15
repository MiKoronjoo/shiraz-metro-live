import type { Language } from "@/lib/types";

const TIME_ZONE = "Asia/Tehran";

export function getTehranSecondsOfDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 3600 + Number(values.minute) * 60 + Number(values.second);
}

export function formatTehranClock(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function formatGregorianDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatJalaliDate(date: Date, language: Language): string {
  return new Intl.DateTimeFormat(
    language === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian",
    {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  ).format(date);
}
