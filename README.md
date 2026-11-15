# Shiraz Metro Live

A responsive, bilingual Persian/English PWA that estimates the live positions of Shiraz metro trains from timetable data. The browser continuously derives positions from the current `Asia/Tehran` time; the page does not need to refresh.

## Included in this implementation

- Responsive mobile and desktop layout
- Persian RTL and English LTR modes
- Line 1 regular and holiday timetables, with a 15-minute headway
- Line 2 regular timetable, with a 40-minute headway and holiday closure
- Manual holiday-mode toggle
- Solar Hijri and Gregorian dates
- Continuously moving directional train markers
- Moving, stopped, and terminal-turnaround states
- Greedy fleet assignment that reuses the same trainset after it reverses direction
- Station search and line filters
- Next-arrival countdowns for every active-stop station
- Separate pass-through and under-construction station states
- Dark mode and full-screen mode
- Installable PWA manifest and a same-origin application-shell service worker
- OpenStreetMap attribution

The calculated minimum timetable fleet is currently 7 trains for Line 1 and 1 train for Line 2.

## Quick start

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create a production static export:

```bash
npm run build
```

The deployable site is written to `out/`. Preview that export locally with:

```bash
npm start
```

## Important accuracy notice

This is not GPS tracking. Train positions are estimates derived from the published schedule, station dwell time, route distance, and the current Tehran time.

Line 1's path was georeferenced from the supplied Leaflet SVG against all 20 supplied station coordinates. The route passes exactly through those station coordinates, while intermediate bends remain an approximation of the reference map.

Line 2 currently uses its station coordinates as an approximate polyline. Replace it with a proper route polyline when one becomes available.

## Data model

Primary data lives in:

- `data/metro-data.ts` — lines, stations, service states, and schedules
- `data/line1-path.json` — generated Line 1 route points
- `scripts/generate-line1-route.py` — reproducible SVG-to-geographic route generator

Station service states:

```ts
"active-stop" | "pass-through" | "under-construction"
```

A station may override the default 30-second dwell:

```ts
dwellSeconds?: number
```

## Timetable interpretation

Times at non-terminal active stations are departure times. With the default 30-second dwell, a `06:12` departure means a `06:11:30` arrival.

Terminal arrival times are stored explicitly as offsets. The fleet allocator links a train to the next possible opposite-direction departure at the same terminal. The gap between arrival and departure becomes the calculated turnaround time.

Line 2 pass-through stations `Dowlat` and `Rahmat` are visible on the map but have no arrival countdown and no dwell. The movement time through them is interpolated by distance between the surrounding timed stops.

## Replacing the Line 2 path

1. Export or draw the route as an ordered list of `[latitude, longitude]` points.
2. Replace `line2Path` in `data/metro-data.ts`.
3. Set each Line 2 station's `pathIndex` to the index of its exact route point.
4. Set `approximatePath` to `false` when the geometry is trustworthy.

The simulation engine requires no changes.

## Adding a station

1. Insert the station in route order.
2. Add its coordinate and `pathIndex`.
3. Choose its service status.
4. Add a `stopOffset` only when trains stop and a published departure time exists.
5. Adjust the terminal arrival offset if the route has been extended.

## Adding a line

Add another `MetroLine` object to `metroLines` in `data/metro-data.ts`. The map, filters, fleet assignment, simulation, station list, and next-arrival UI are data-driven.

## Continuous animation

The UI uses `requestAnimationFrame`, throttled to five state updates per second. Every update is calculated from the real current time rather than from the previous marker position. When a background tab resumes, trains immediately jump to their correct timetable-derived positions instead of continuing from stale state.

## PWA note

`public/sw.js` caches same-origin application assets only. OpenStreetMap tiles are deliberately not placed in the application cache.
