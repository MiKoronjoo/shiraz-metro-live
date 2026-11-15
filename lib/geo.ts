import type { LatLngTuple } from "@/lib/types";

const EARTH_RADIUS_METERS = 6_371_008.8;

function radians(value: number): number {
  return (value * Math.PI) / 180;
}

function degrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function haversineDistance(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = radians(a[0]);
  const lat2 = radians(b[0]);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(b[1] - a[1]);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(value)));
}

export function buildCumulativeDistances(path: LatLngTuple[]): number[] {
  const result = [0];
  for (let index = 1; index < path.length; index += 1) {
    result.push(result[index - 1] + haversineDistance(path[index - 1], path[index]));
  }
  return result;
}

export function pointAtDistance(
  path: LatLngTuple[],
  cumulativeDistances: number[],
  requestedDistance: number,
): LatLngTuple {
  const maxDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  const distance = Math.max(0, Math.min(maxDistance, requestedDistance));

  let low = 0;
  let high = cumulativeDistances.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (cumulativeDistances[middle] < distance) low = middle + 1;
    else high = middle;
  }

  const endIndex = Math.max(1, low);
  const startIndex = endIndex - 1;
  const startDistance = cumulativeDistances[startIndex];
  const endDistance = cumulativeDistances[endIndex];
  const ratio = endDistance === startDistance ? 0 : (distance - startDistance) / (endDistance - startDistance);
  const start = path[startIndex];
  const end = path[endIndex];

  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

export function bearingBetween(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = radians(a[0]);
  const lat2 = radians(b[0]);
  const deltaLon = radians(b[1] - a[1]);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function bearingAtDistance(
  path: LatLngTuple[],
  cumulativeDistances: number[],
  distance: number,
  directionSign: 1 | -1,
): number {
  const total = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;
  const lookAhead = Math.min(20, Math.max(5, total / 1000));
  const from = pointAtDistance(path, cumulativeDistances, distance);
  const targetDistance = Math.max(0, Math.min(total, distance + directionSign * lookAhead));
  const to = pointAtDistance(path, cumulativeDistances, targetDistance);
  if (from[0] === to[0] && from[1] === to[1]) {
    const fallback = pointAtDistance(path, cumulativeDistances, distance - directionSign * lookAhead);
    return bearingBetween(fallback, from);
  }
  return bearingBetween(from, to);
}
