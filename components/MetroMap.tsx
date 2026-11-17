
"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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

const stationHitIcon = L.divIcon({
  className: "station-hit-marker",
  html: '<span class="station-hit-marker-inner"></span>',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  tooltipAnchor: [0, -16],
});

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

// Keep marker sizes synchronized with the map zoom.
function MapZoomScale({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const updateZoom = () => onZoomChange(map.getZoom());

    updateZoom();
    map.on("zoomend", updateZoom);

    return () => {
      map.off("zoomend", updateZoom);
    };
  }, [map, onZoomChange]);

  return null;
}

function createTrainIcon(
  train: TrainState,
  color: string,
  visualSize: number,
): L.DivIcon {
  return L.divIcon({
    className: "train-marker-shell",
    html: `
      <div class="train-marker-hit">
        <div
          class="train-marker"
          style="--train-color:${color};--train-size:${visualSize}px"
        >
          <span
            class="train-arrow"
            style="transform:rotate(${train.bearing}deg)"
          ></span>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -visualSize / 2 - 8],
  });
}

function TrainMarker({
  train,
  color,
  visualSize,
  language,
}: {
  train: TrainState;
  color: string;
  visualSize: number;
  language: Language;
}) {
  const destination = allStations.find(
    (station) => station.id === train.destinationStationId,
  );

  const nextStation = allStations.find(
    (station) => station.id === train.nextStationId,
  );

  const copy = t(language);

  const countdownLabel =
    train.status === "stopped"
      ? copy.departsIn
      : train.status === "terminating"
        ? copy.reversesIn
        : copy.arrivesIn;

  const icon = useMemo(
    () => createTrainIcon(train, color, visualSize),
    [train.trainId, train.bearing, color, visualSize],
  );

  return (
    <Marker
      position={train.position}
      icon={icon}
      zIndexOffset={1000}
      riseOnHover
    >
      <Popup
        className="train-popup"
        closeButton={false}
        minWidth={230}
        maxWidth={280}
      >
        <div
          className="train-card"
          dir={language === "fa" ? "rtl" : "ltr"}
        >
          <div className="train-card-head">
            <span
              className="train-card-line"
              style={{ backgroundColor: color }}
            >
              {train.lineId.replace("line-", "")} {copy.line}
            </span>
            <strong>{train.trainId}</strong>
          </div>

          <div className={`train-status ${train.status}`}>
            <span />
            {statusLabel(language, train.status)}
          </div>

          <p>
            {copy.direction}{" "}
            <strong>
              {destination?.name[language] ?? train.destinationStationId}
            </strong>
          </p>

          {nextStation && train.countdownSeconds !== undefined && (
            <div className="train-countdown">
              <span>
                {countdownLabel}{" "}
                {train.status === "terminating"
                  ? ""
                  : nextStation.name[language]}
              </span>
              <strong>
                {formatCountdown(train.countdownSeconds, language)}
              </strong>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
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
  const lineById = useMemo(
    () => new Map(lines.map((line) => [line.id, line])),
    [lines],
  );

  const [zoom, setZoom] = useState(12);

  const handleZoomChange = useCallback((nextZoom: number) => {
    setZoom(nextZoom);
  }, []);

  // Zoom 10: 22px | Zoom 19: 34px
  const zoomProgress = Math.max(0, Math.min(1, (zoom - 10) / 9));
  const markerScale = 0.62 + zoomProgress * 0.38;

  const trainSize = Math.round(22 + zoomProgress * 12);

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
        <MapZoomScale onZoomChange={handleZoomChange} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {lines
          .filter((line) => visibleLineIds.includes(line.id))
          .map((line) => {
            const startStation = line.stations.find(
              (station) => station.id === line.activePathStartStationId,
            )!;

            const endStation = line.stations.find(
              (station) => station.id === line.activePathEndStationId,
            )!;

            const activeStart = Math.min(
              startStation.pathIndex,
              endStation.pathIndex,
            );

            const activeEnd = Math.max(
              startStation.pathIndex,
              endStation.pathIndex,
            );

            const activePath = line.path.slice(
              activeStart,
              activeEnd + 1,
            );

            return (
              <Fragment key={line.id}>
                {line.id === "line-2" && (
                  <Polyline
                    positions={line.path}
                    pathOptions={{
                      color: line.color,
                      weight: 5,
                      opacity: 0.38,
                      dashArray: "9 10",
                    }}
                  />
                )}

                <Polyline
                  positions={activePath}
                  pathOptions={{
                    color: line.color,
                    weight: 7,
                    opacity: 0.9,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />

                {line.stations.map((station) => {
                  const selected = station.id === selectedStationId;
                  const isConstruction =
                    station.serviceStatus === "under-construction";
                  const isPassThrough =
                    station.serviceStatus === "pass-through";
                  const isInterchange = Boolean(
                    station.interchangeWith?.length,
                  );

                  const radius = selected
                    ? isInterchange
                      ? 11
                      : 9
                    : isInterchange
                      ? line.id === "line-1"
                        ? 9
                        : 5
                      : isConstruction
                        ? 6
                        : 7;

                  return (
                    <Fragment key={station.id}>
                      {/* Dedicated station interaction marker */}
                      <Marker
                        position={station.position}
                        icon={stationHitIcon}
                        keyboard={true}
                        bubblingMouseEvents={false}
                        eventHandlers={{
                          click: (event) => {
                            event.originalEvent.stopPropagation();
                            onSelectStation(station.id);
                          },
                        }}
                      >
                        <Tooltip
                          direction="top"
                          offset={[80, 0]}
                          opacity={0.95}
                        >
                          <strong>{station.name[language]}</strong>
                          <br />
                          <span>
                            {line.name[language]} ·{" "}
                            {isConstruction
                              ? copy.underConstruction
                              : isPassThrough
                                ? copy.passThrough
                                : copy.activeStop}
                          </span>
                        </Tooltip>
                      </Marker>

                      {/* Visual station marker */}
                      <CircleMarker
                        center={station.position}
                        radius={Math.max(3, radius * markerScale)}
                        interactive={false}
                        pathOptions={{
                          color: line.color,
                          weight: selected ? 3 : 2,
                          fillColor: isPassThrough
                            ? line.color
                            : darkMode
                              ? "#111827"
                              : "#ffffff",
                          fillOpacity: isConstruction
                            ? 0.12
                            : isPassThrough
                              ? 0.28
                              : 1,
                          dashArray: isConstruction
                            ? "3 3"
                            : isPassThrough
                              ? "2 2"
                              : undefined,
                        }}
                      />
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}

        {trains.map((train) => {
          const line = lineById.get(train.lineId);
          if (!line) return null;

          return (
            <TrainMarker
              key={train.trainId}
              train={train}
              color={line.color}
              visualSize={trainSize}
              language={language}
            />
          );
        })}

        <MapViewport
          lines={lines}
          visibleLineIds={visibleLineIds}
          selectedStationId={selectedStationId}
        />
      </MapContainer>
    </div>
  );
}
