
const DATA_SCALE = 1000;
const ITERATIONS = 1000;

function runBenchmark() {
  console.log(`Running benchmark with ${DATA_SCALE} maps and ${DATA_SCALE} markers, over ${ITERATIONS} iterations...`);

  // Setup data
  const maps = Array.from({ length: DATA_SCALE }, (_, i) => ({
    id: `map-${i}`,
    name: `Map ${i}`,
  }));

  const markers = Array.from({ length: DATA_SCALE }, (_, i) => ({
    id: `marker-${i}`,
    mapId: `map-${Math.floor(Math.random() * DATA_SCALE)}`,
    title: `Marker ${i}`,
  }));

  // Baseline: Array.find
  const startArray = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const marker of markers) {
      const map = maps.find(m => m.id === marker.mapId);
      // use map to avoid optimization
      if (!map) throw new Error("Map not found");
    }
  }
  const endArray = performance.now();
  const arrayTime = endArray - startArray;
  console.log(`Array.find total time: ${arrayTime.toFixed(2)}ms`);

  // Optimized: Map.get
  const startMapSetup = performance.now();
  const mapsById = new Map(maps.map(m => [m.id, m]));
  const endMapSetup = performance.now();
  const mapSetupTime = endMapSetup - startMapSetup;

  const startMap = performance.now();
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const marker of markers) {
      const map = mapsById.get(marker.mapId);
      if (!map) throw new Error("Map not found");
    }
  }
  const endMap = performance.now();
  const mapLookupTime = endMap - startMap;

  console.log(`Map setup time: ${mapSetupTime.toFixed(2)}ms`);
  console.log(`Map.get total time: ${mapLookupTime.toFixed(2)}ms`);
  console.log(`Map total time (setup + lookup): ${(mapSetupTime + mapLookupTime).toFixed(2)}ms`);

  const improvement = (arrayTime / (mapSetupTime + mapLookupTime)).toFixed(2);
  console.log(`Performance improvement: ${improvement}x`);
}

runBenchmark();
