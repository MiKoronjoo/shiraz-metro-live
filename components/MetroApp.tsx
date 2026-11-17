"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import { allStations, metroLines } from "@/data/metro-data";
import { formatCountdown, localizeDigits, t } from "@/lib/i18n";
import {
  createDaySimulation,
  formatSecondsAsClock,
  getNextArrivals,
  getServiceWindow,
  getTrainStates,
} from "@/lib/simulation";
import {
  formatGregorianDate,
  formatJalaliDate,
  formatTehranClock,
  getTehranSecondsOfDay,
} from "@/lib/time";
import type { Language, Station } from "@/lib/types";

const MetroMap = dynamic(() => import("@/components/MetroMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      <span className="map-loading-pulse" />
      <span>Loading map…</span>
    </div>
  ),
});

function useLiveClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return now;
}

function Icon({ name }: { name: "moon" | "sun" | "expand" | "collapse" | "train" | "search" | "calendar" }) {
  const paths = {
    moon: <path d="M20.4 14.2A8.4 8.4 0 0 1 9.8 3.6 8.5 8.5 0 1 0 20.4 14.2Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    expand: <path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5" />,
    collapse: <path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5" />,
    train: <><rect x="6" y="3" width="12" height="15" rx="4" /><path d="M8 21l2-3m6 3-2-3M8.5 8h7M9 14h.01M15 14h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

export default function MetroApp() {
  const appRef = useRef<HTMLDivElement | null>(null);
  const now = useLiveClock();
  const [language, setLanguage] = useState<Language>("fa");
  const [holidayMode, setHolidayMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [visibleLineIds, setVisibleLineIds] = useState<string[]>(["line-1", "line-2"]);
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("metro-language") as Language | null;
    const storedDark = window.localStorage.getItem("metro-dark");
    const storedHoliday = window.localStorage.getItem("metro-holiday");
    if (storedLanguage === "fa" || storedLanguage === "en") setLanguage(storedLanguage);
    if (storedDark !== null) setDarkMode(storedDark === "true");
    else setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (storedHoliday !== null) setHolidayMode(storedHoliday === "true");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  useEffect(() => window.localStorage.setItem("metro-language", language), [language]);
  useEffect(() => window.localStorage.setItem("metro-dark", String(darkMode)), [darkMode]);
  useEffect(() => window.localStorage.setItem("metro-holiday", String(holidayMode)), [holidayMode]);

  const copy = t(language);
  const currentNow = now ?? new Date(0);
  const secondsOfDay = getTehranSecondsOfDay(currentNow);
  const simulation = useMemo(
    () => createDaySimulation(holidayMode ? "holiday" : "regular"),
    [holidayMode],
  );
  const trainStates = useMemo(
    () => getTrainStates(simulation, secondsOfDay),
    [simulation, secondsOfDay],
  );
  const visibleTrains = trainStates.filter((train) => visibleLineIds.includes(train.lineId));

  const stationById = useMemo(
    () => new Map(allStations.map((station) => [station.id, station])),
    [],
  );
  const lineById = useMemo(() => new Map(metroLines.map((line) => [line.id, line])), []);
  const selectedStation = stationById.get(selectedStationId);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredStations = allStations.filter((station) => {
    if (!visibleLineIds.includes(station.lineId)) return false;
    if (!normalizedQuery) return true;
    return `${station.name.fa} ${station.name.en}`.toLocaleLowerCase().includes(normalizedQuery);
  });

  const toggleLine = (lineId: string) => {
    setVisibleLineIds((current) => {
      if (current.includes(lineId)) {
        return current.length === 1 ? current : current.filter((item) => item !== lineId);
      }
      return [...current, lineId];
    });
  };

  const selectStation = useCallback((stationId: string) => {
    setSelectedStationId(stationId);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await appRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  };

  const selectedArrivals = selectedStation
    ? getNextArrivals(simulation, selectedStation.id, secondsOfDay, 3)
    : [];

  return (
    <div
      ref={appRef}
      className={`metro-app ${darkMode ? "theme-dark" : "theme-light"}`}
      dir={language === "fa" ? "rtl" : "ltr"}
      lang={language}
    >
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><Icon name="train" /></div>
          <div>
            <h1>{copy.appName}</h1>
            <p><span className="live-dot" />{copy.estimated}</p>
          </div>
        </div>

        <div className="clock-block" aria-label={copy.now}>
          <strong>{formatTehranClock(currentNow, language)}</strong>
          <span>{copy.solarHijri}: {formatJalaliDate(currentNow, language)}</span>
          <span>{copy.gregorian}: {formatGregorianDate(currentNow, language)}</span>
        </div>

        <div className="top-actions">
          <button className="control-button language-button" onClick={() => setLanguage(language === "fa" ? "en" : "fa")}>
            {copy.language}
          </button>
          <label className="holiday-toggle control-button">
            <Icon name="calendar" />
            <span>{copy.holidayMode}</span>
            <input
              type="checkbox"
              checked={holidayMode}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setHolidayMode(event.target.checked)}
            />
            <span className="switch" aria-hidden />
          </label>
          <button
            className="icon-button"
            onClick={() => setDarkMode((value) => !value)}
            title={darkMode ? copy.lightMode : copy.darkMode}
            aria-label={darkMode ? copy.lightMode : copy.darkMode}
          >
            <Icon name={darkMode ? "sun" : "moon"} />
          </button>
          <button
            className="icon-button"
            onClick={toggleFullscreen}
            title={isFullscreen ? copy.exitFullscreen : copy.fullscreen}
            aria-label={isFullscreen ? copy.exitFullscreen : copy.fullscreen}
          >
            <Icon name={isFullscreen ? "collapse" : "expand"} />
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <section className="search-panel">
            <div className="search-box">
              <Icon name="search" />
              <input
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder={copy.search}
                aria-label={copy.search}
              />
              {query && <button onClick={() => setQuery("")} aria-label="Clear">×</button>}
            </div>
            <div className="line-filters">
              {metroLines.map((line) => {
                const active = visibleLineIds.includes(line.id);
                return (
                  <button
                    key={line.id}
                    className={active ? "line-chip active" : "line-chip"}
                    onClick={() => toggleLine(line.id)}
                    style={{ "--line-color": line.color } as CSSProperties}
                  >
                    <span className="line-chip-dot" />
                    {line.name[language]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="service-grid">
            {metroLines.map((line) => {
              const window = getServiceWindow(simulation, line.id);
              const activeCount = trainStates.filter((train) => train.lineId === line.id).length;
              let status: string = copy.serviceClosed;
              let detail: string = holidayMode && line.closedOnHoliday ? copy.holiday : copy.closed;
              let stateClass: string = "closed";
              if (window) {
                if (secondsOfDay < window.start) {
                  status = copy.serviceStarts;
                  detail = `${formatCountdown(window.start - secondsOfDay, language)} · ${formatSecondsAsClock(window.start, language)}`;
                  stateClass = "upcoming";
                } else if (secondsOfDay <= window.end) {
                  status = copy.serviceActive;
                  detail = `${localizeDigits(String(activeCount), language)} ${copy.liveTrains}`;
                  stateClass = "active";
                } else {
                  status = copy.serviceEnded;
                  detail = formatSecondsAsClock(window.end, language);
                }
              }
              return (
                <article key={line.id} className={`service-card ${stateClass}`} style={{ "--line-color": line.color } as CSSProperties}>
                  <div className="service-card-title"><span />{line.name[language]}</div>
                  <strong>{status}</strong>
                  <small>{detail}</small>
                </article>
              );
            })}
          </section>

          {!selectedStation && (
            <section className="station-detail station-hint">{copy.selectStation}</section>
          )}

          {selectedStation && (
            <StationDetail
              station={selectedStation}
              language={language}
              arrivals={selectedArrivals}
              secondsOfDay={secondsOfDay}
              holidayMode={holidayMode}
              lineColor={lineById.get(selectedStation.lineId)?.color ?? "#666"}
            />
          )}

          <section className="station-list-panel">
            <div className="section-heading">
              <h2>{copy.stations}</h2>
              <span>{localizeDigits(String(filteredStations.length), language)}</span>
            </div>
            <div className="station-list">
              {filteredStations.map((station) => {
                const line = lineById.get(station.lineId)!;
                const arrivals = getNextArrivals(simulation, station.id, secondsOfDay, 1);
                return (
                  <button
                    key={station.id}
                    className={`station-row ${selectedStationId === station.id ? "selected" : ""}`}
                    onClick={() => selectStation(station.id)}
                    style={{ "--line-color": line.color } as CSSProperties}
                  >
                    <span className={`station-symbol ${station.serviceStatus}`} />
                    <span className="station-row-copy">
                      <strong>{station.name[language]}</strong>
                      <small>{line.name[language]}</small>
                    </span>
                    <span className="station-row-time">
                      {station.serviceStatus === "under-construction"
                        ? copy.underConstruction
                        : station.serviceStatus === "pass-through"
                          ? copy.passThrough
                          : arrivals[0]
                            ? formatCountdown(arrivals[0].countdownSeconds, language)
                            : copy.closed}
                    </span>
                  </button>
                );
              })}
              {filteredStations.length === 0 && <div className="empty-state">{copy.noSearchResults}</div>}
            </div>
          </section>

          <p className="route-notice">ⓘ {copy.routeNotice}</p>
        </aside>

        <section className="map-panel" aria-label="Shiraz metro map">
          <MetroMap
            lines={metroLines}
            visibleLineIds={visibleLineIds}
            trains={visibleTrains}
            selectedStationId={selectedStationId}
            onSelectStation={selectStation}
            language={language}
            darkMode={darkMode}
          />
          <div className="map-live-badge"><span className="live-dot" />{localizeDigits(String(visibleTrains.length), language)} {copy.liveTrains}</div>
        </section>
      </main>
    </div>
  );
}

function StationDetail({
  station,
  language,
  arrivals,
  secondsOfDay,
  holidayMode,
  lineColor,
}: {
  station: Station;
  language: Language;
  arrivals: ReturnType<typeof getNextArrivals>;
  secondsOfDay: number;
  holidayMode: boolean;
  lineColor: string;
}) {
  const copy = t(language);
  let badge: string = copy.activeStop;
  if (station.serviceStatus === "under-construction") badge = copy.underConstruction;
  if (station.serviceStatus === "pass-through") badge = copy.passThrough;

  return (
    <section className="station-detail" style={{ "--line-color": lineColor } as CSSProperties}>
      <div className="station-detail-head">
        <div>
          <span className="station-detail-line">{copy.line} {station.lineId.replace("line-", "")}</span>
          <h2>{station.name[language]}</h2>
        </div>
        <span className={`status-pill ${station.serviceStatus}`}>{badge}</span>
      </div>

      {station.serviceStatus === "pass-through" && <p className="station-message">{copy.trainsDoNotStop}</p>}
      {station.serviceStatus === "under-construction" && <p className="station-message">{copy.underConstruction}</p>}
      {station.serviceStatus === "active-stop" && (
        <div className="arrival-list">
          <h3>{copy.nextArrivals}</h3>
          {arrivals.map((arrival) => (
            <div className="arrival-row" key={`${arrival.trainId}-${arrival.arrivalSeconds}`}>
              <div>
                <strong>{copy.direction} {stationName(arrival.destinationStationId, language)}</strong>
                <small>{arrival.trainId} · {formatSecondsAsClock(arrival.arrivalSeconds, language)}</small>
              </div>
              <span>{formatCountdown(arrival.arrivalSeconds - secondsOfDay, language)}</span>
            </div>
          ))}
          {arrivals.length === 0 && (
            <p className="station-message">{holidayMode && station.lineId === "line-2" ? copy.serviceClosed : copy.noMoreTrains}</p>
          )}
        </div>
      )}
    </section>
  );
}

function stationName(stationId: string, language: Language): string {
  return allStations.find((station) => station.id === stationId)?.name[language] ?? stationId;
}
