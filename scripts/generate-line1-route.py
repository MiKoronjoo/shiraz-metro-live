#!/usr/bin/env python3
"""Generate a georeferenced Line 1 polyline from the supplied Leaflet SVG.

The Leaflet SVG path uses local layer-pixel coordinates. Every station marker is
projected onto that SVG path, then each station-to-station section is mapped to
Web Mercator with a local similarity transform. SVG uses a downward-positive Y
axis, so Y is flipped before transformation. This makes every supplied station
coordinate exact while preserving the bends drawn in the source SVG instead of
mirroring each station-to-station section.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "line1-path.json"

SVG_PATH_POINTS = [
    (5, -61), (-71, -189), (-227, -434), (-236, -443), (-310, -492),
    (-314, -496), (-346, -516), (-397, -553), (-453, -590), (-455, -593),
    (-464, -599), (-469, -601), (-479, -601), (-486, -598), (-502, -599),
    (-508, -591), (-508, -587), (-515, -581), (-519, -580), (-521, -582),
    (-528, -602), (-531, -606), (-557, -634), (-563, -643), (-595, -677),
    (-630, -709), (-656, -740), (-656, -768), (-659, -782), (-652, -803),
    (-652, -852), (-656, -867), (-676, -893), (-682, -917), (-693, -934),
    (-699, -947), (-712, -963), (-718, -966), (-725, -965), (-827, -912),
    (-842, -907),
]

# Ordered from Shahid Dastgheyb to Ehsan after projection onto the red SVG path.
STATION_MARKERS = [
    (5, -61), (-23, -107), (-47, -148), (-77, -198), (-113, -255),
    (-141, -300), (-178, -358), (-207, -403), (-233, -439), (-297, -484),
    (-337, -511), (-387, -545), (-458, -595), (-505, -595), (-557, -635),
    (-657, -749), (-652, -828), (-726, -964), (-775, -939), (-842, -907),
]

STATIONS = [
    ("shahid-dastgheyb", 29.551737, 52.599138),
    ("shahid-doran", 29.5586872, 52.5945809),
    ("forsat-shirazi", 29.564944, 52.590445),
    ("janbazan", 29.572326, 52.585322),
    ("ghadir", 29.580681, 52.579204),
    ("razi", 29.587457, 52.574220),
    ("fazilat", 29.596131, 52.567872),
    ("kaveh", 29.602899, 52.562893),
    ("valiasr", 29.608238, 52.558521),
    ("vakilorroaya", 29.612416, 52.551784),
    ("zandiyeh", 29.618908, 52.540671),
    ("imam-hossein", 29.6240701, 52.5319584),
    ("namazi", 29.6314651, 52.5197410),
    ("shahid-avini", 29.631524, 52.511749),
    ("shahid-motahari", 29.637420, 52.502764),
    ("qasrodasht", 29.655225, 52.485423),
    ("shahed", 29.666233, 52.486525),
    ("mirza-shirazi", 29.6865746, 52.4736781),
    ("shariati", 29.6827061, 52.4650396),
    ("ehsan", 29.6782824, 52.4547140),
]

EARTH_RADIUS = 6_378_137.0


def distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def cumulative(points: list[tuple[float, float]]) -> list[float]:
    values = [0.0]
    for start, end in zip(points, points[1:]):
        values.append(values[-1] + distance(start, end))
    return values


def project_to_polyline(
    point: tuple[float, float],
    points: list[tuple[float, float]],
    cumulative_distances: list[float],
) -> tuple[float, tuple[float, float]]:
    best: tuple[float, float, tuple[float, float]] | None = None
    px, py = point
    for index, (start, end) in enumerate(zip(points, points[1:])):
        ax, ay = start
        bx, by = end
        vx, vy = bx - ax, by - ay
        denom = vx * vx + vy * vy
        t = 0.0 if denom == 0 else ((px - ax) * vx + (py - ay) * vy) / denom
        t = max(0.0, min(1.0, t))
        projected = (ax + t * vx, ay + t * vy)
        error = distance(point, projected)
        along = cumulative_distances[index] + t * distance(start, end)
        if best is None or error < best[0]:
            best = (error, along, projected)
    assert best is not None
    return best[1], best[2]


def svg_complex(point: tuple[float, float]) -> complex:
    """Convert SVG layer pixels (Y points down) to Cartesian coordinates."""
    return complex(point[0], -point[1])


def mercator(lat: float, lon: float) -> complex:
    x = EARTH_RADIUS * math.radians(lon)
    y = EARTH_RADIUS * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return complex(x, y)


def unmercator(point: complex) -> tuple[float, float]:
    lon = math.degrees(point.real / EARTH_RADIUS)
    lat = math.degrees(2 * math.atan(math.exp(point.imag / EARTH_RADIUS)) - math.pi / 2)
    return lat, lon


def point_at_svg_distance(
    target: float,
    points: list[tuple[float, float]],
    cumulative_distances: list[float],
) -> tuple[float, float]:
    if target <= 0:
        return points[0]
    if target >= cumulative_distances[-1]:
        return points[-1]
    for index in range(len(points) - 1):
        if cumulative_distances[index + 1] >= target:
            segment = cumulative_distances[index + 1] - cumulative_distances[index]
            ratio = 0.0 if segment == 0 else (target - cumulative_distances[index]) / segment
            ax, ay = points[index]
            bx, by = points[index + 1]
            return ax + (bx - ax) * ratio, ay + (by - ay) * ratio
    return points[-1]


def densify(points: Iterable[complex], max_step_meters: float = 35.0) -> list[complex]:
    source = list(points)
    output = [source[0]]
    for start, end in zip(source, source[1:]):
        length = abs(end - start)
        steps = max(1, math.ceil(length / max_step_meters))
        for step in range(1, steps + 1):
            output.append(start + (end - start) * (step / steps))
    return output


def main() -> None:
    svg_cumulative = cumulative(SVG_PATH_POINTS)
    controls = [project_to_polyline(marker, SVG_PATH_POINTS, svg_cumulative) for marker in STATION_MARKERS]
    control_distances = [item[0] for item in controls]
    control_pixels = [svg_complex(item[1]) for item in controls]
    control_mercator = [mercator(lat, lon) for _, lat, lon in STATIONS]

    transformed: list[complex] = []
    station_output_indices: list[int] = []

    for station_index in range(len(STATIONS) - 1):
        source_start = control_pixels[station_index]
        source_end = control_pixels[station_index + 1]
        target_start = control_mercator[station_index]
        target_end = control_mercator[station_index + 1]
        transform = (target_end - target_start) / (source_end - source_start)

        section_distances = [control_distances[station_index]]
        section_distances.extend(
            value
            for value in svg_cumulative
            if control_distances[station_index] < value < control_distances[station_index + 1]
        )
        section_distances.append(control_distances[station_index + 1])

        section_svg = [
            svg_complex(point_at_svg_distance(value, SVG_PATH_POINTS, svg_cumulative))
            for value in section_distances
        ]
        section_target = [target_start + (point - source_start) * transform for point in section_svg]
        dense_section = densify(section_target)

        if station_index == 0:
            station_output_indices.append(0)
            transformed.extend(dense_section)
        else:
            transformed.extend(dense_section[1:])
        station_output_indices.append(len(transformed) - 1)

    path = [[round(lat, 7), round(lon, 7)] for lat, lon in map(unmercator, transformed)]
    station_indices = {
        station[0]: station_output_indices[index]
        for index, station in enumerate(STATIONS)
    }

    payload = {
        "source": "Leaflet SVG supplied by the project owner; georeferenced against supplied station coordinates",
        "coordinateOrder": "[latitude, longitude]",
        "approximate": True,
        "path": path,
        "stationPathIndices": station_indices,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(path)} path points to {OUTPUT}")


if __name__ == "__main__":
    main()
