const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const fs = require("node:fs");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const {
  createDaySimulation,
  getNextArrivals,
  getTrainStates,
  parseClockTime,
} = require(path.join(root, "lib/simulation.ts"));

const regular = createDaySimulation("regular");
const holiday = createDaySimulation("holiday");

const fleetByLine = Object.fromEntries(
  ["line-1", "line-2"].map((lineId) => [lineId, regular.vehicles.filter((vehicle) => vehicle.lineId === lineId).length]),
);
assert.deepEqual(fleetByLine, { "line-1": 7, "line-2": 1 });
assert.equal(holiday.trips.some((trip) => trip.lineId === "line-2"), false);
assert.equal(holiday.vehicles.some((vehicle) => vehicle.lineId === "line-2"), false);

const turnaroundStates = getTrainStates(regular, parseClockTime("06:18"));
const line2Turnaround = turnaroundStates.find((train) => train.lineId === "line-2");
assert(line2Turnaround, "Line 2 train should remain visible during turnaround");
assert.equal(line2Turnaround.status, "terminating");
assert.equal(Math.round(line2Turnaround.countdownSeconds), 120);

const movingStates = getTrainStates(regular, parseClockTime("06:21"));
const line2Moving = movingStates.find((train) => train.lineId === "line-2");
assert(line2Moving, "Line 2 train should be active after its backward departure");
assert.equal(line2Moving.status, "moving");
assert(Number.isFinite(line2Moving.position[0]) && Number.isFinite(line2Moving.position[1]));
assert(Number.isFinite(line2Moving.bearing));

assert.deepEqual(getNextArrivals(regular, "dowlat", parseClockTime("06:00")), []);
assert(getNextArrivals(regular, "adelabad", parseClockTime("06:00")).length > 0);

for (const second of [parseClockTime("06:00"), parseClockTime("12:00"), parseClockTime("21:00")]) {
  for (const train of getTrainStates(regular, second)) {
    assert(Number.isFinite(train.position[0]) && Number.isFinite(train.position[1]));
    assert(train.position[0] > 29.4 && train.position[0] < 29.8);
    assert(train.position[1] > 52.3 && train.position[1] < 52.7);
  }
}

console.log("Simulation smoke test passed.");
console.log(`Regular fleet: Line 1 = ${fleetByLine["line-1"]}, Line 2 = ${fleetByLine["line-2"]}`);
console.log(`Regular trips: ${regular.trips.length}; holiday trips: ${holiday.trips.length}`);
