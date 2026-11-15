"use client";

import { Fragment, useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { allStations } from "@/data/metro-data";
import { formatCountdown, statusLabel, t } from "@/lib/i18n";
import type { Language, MetroLine, TrainState } from "@/lib/types";

const SHIRAZ_CENTER: [number, number] = [29.615, 52.535];

interface MetroMapProps {
  lines: MetroLine[];
  visibleLineIds: string[];
  trains: TrainState[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  language: Language;
  darkMode: boolean;
}

function MapViewport({
  lines,
  visibleLineIds,
  selectedStationId,
}: Pick<MetroMapProps, "lines" | "visibleLineIds" | "selectedStationId">) {
  const map = useMap();

  useEffect(() => {
    const station = lines.flatMap((line) => line.stations).find((item) => item.id === selectedStationId);
    if (station) map.flyTo(station.position, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [selectedStationId, lines, map]);

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (selectedStationId) return;
    const points = lines
      .filter((line) => visibleLineIds.includes(line.id))
      .flatMap((line) => line.path);
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
  }, [lines, map, selectedStationId, visibleLineIds]);

  return null;
}

function createTrainIcon(train: TrainState, color: string): L.DivIcon {
  return L.divIcon({
    className: "train-marker-shell",
    html: `<div class="train-marker" style="--train-color:${color}"><span class="train-arrow" style="transform:rotate(${train.bearing}deg)"></span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -21],
  });
}

export default function MetroMap({
  lines,
  visibleLineIds,
  trains,
  selectedStationId,
  onSelectStation,
  language,
  darkMode,
}: MetroMapProps) {
  const lineById = useMemo(() => new Map(lines.map((line) => [line.id, line])), [lines]);
  const copy = t(language);

  return (
    <div className={`leaflet-map-wrap ${darkMode ? "dark-map" : ""}`}>
      <MapContainer
        center={SHIRAZ_CENTER}
        zoom={12}
        minZoom={10}
        maxZoom={19}
        zoomControl
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {lines.filter((line) => visibleLineIds.includes(line.id)).map((line) => {
          const startStation = line.stations.find((station) => station.id === line.activePathStartStationId)!;
          const endStation = line.stations.find((station) => station.id === line.activePathEndStationId)!;
          const activeStart = Math.min(startStation.pathIndex, endStation.pathIndex);
          const activeEnd = Math.max(startStation.pathIndex, endStation.pathIndex);
          const activePath = line.path.slice(activeStart, activeEnd + 1);

          return (
            <Fragment key={line.id}>
              {line.id === "line-2" && (
                <Polyline
                  positions={line.path}
                  pathOptions={{ color: line.color, weight: 5, opacity: 0.38, dashArray: "9 10" }}
                />
              )}
              <Polyline
                positions={activePath}
                pathOptions={{ color: line.color, weight: 7, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
              />

              {line.stations.map((station) => {
                const selected = station.id === selectedStationId;
                const isConstruction = station.serviceStatus === "under-construction";
                const isPassThrough = station.serviceStatus === "pass-through";
                const isInterchange = Boolean(station.interchangeWith?.length);
                const radius = selected
                  ? (isInterchange ? 11 : 9)
                  : isInterchange
                    ? (line.id === "line-1" ? 9 : 5)
                    : isConstruction
                      ? 6
                      : 7;
                return (
                  <CircleMarker
                    key={station.id}
                    center={station.position}
                    radius={radius}
                    pathOptions={{
                      color: line.color,
                      weight: selected ? 4 : 2.5,
                      fillColor: isPassThrough ? line.color : darkMode ? "#111827" : "#ffffff",
                      fillOpacity: isConstruction ? 0.12 : isPassThrough ? 0.28 : 1,
                      dashArray: isConstruction ? "3 3" : isPassThrough ? "2 2" : undefined,
                    }}
                    eventHandlers={{ click: () => onSelectStation(station.id) }}
                  >
                    <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                      <strong>{station.name[language]}</strong>
                      <br />
                      <span>{line.name[language]} · {isConstruction ? copy.underConstruction : isPassThrough ? copy.passThrough : copy.activeStop}</span>
                    </Tooltip>
                  </CircleMarker>
                );
              })}
            </Fragment>
          );
        })}

        {trains.map((train) => {
          const line = lineById.get(train.lineId);
          if (!line) return null;
          const destination = allStations.find((station) => station.id === train.destinationStationId);
          const nextStation = allStations.find((station) => station.id === train.nextStationId);
          const countdownLabel = train.status === "stopped"
            ? copy.departsIn
            : train.status === "terminating"
              ? copy.reversesIn
              : copy.arrivesIn;

          return (
            <Marker
              key={train.trainId}
              position={train.position}
              icon={createTrainIcon(train, line.color)}
              zIndexOffset={1000}
            >
              <Popup className="train-popup" closeButton={false} minWidth={230} maxWidth={280}>
                <div className="train-card" dir={language === "fa" ? "rtl" : "ltr"}>
                  <div className="train-card-head">
                    <span className="train-card-line" style={{ backgroundColor: line.color }}>{line.name[language]}</span>
                    <strong>{train.trainId}</strong>
                  </div>
                  <div className={`train-status ${train.status}`}>
                    <span />{statusLabel(language, train.status)}
                  </div>
                  <p>{copy.direction} <strong>{destination?.name[language] ?? train.destinationStationId}</strong></p>
                  {nextStation && train.countdownSeconds !== undefined && (
                    <div className="train-countdown">
                      <span>{countdownLabel} {train.status === "terminating" ? "" : nextStation.name[language]}</span>
                      <strong>{formatCountdown(train.countdownSeconds, language)}</strong>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapViewport lines={lines} visibleLineIds={visibleLineIds} selectedStationId={selectedStationId} />
      </MapContainer>
    </div>
  );
}
