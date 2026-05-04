
const DATA_SCALE = 1000;
const ITERATIONS = 1000;

function runBenchmark() {
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

  const totalMapTime = mapSetupTime + mapLookupTime;
  const improvement = (arrayTime / totalMapTime).toFixed(2);

  return {
    config: {
      dataScale: DATA_SCALE,
      iterations: ITERATIONS
    },
    results: {
      arrayFindTotalTimeMs: arrayTime.toFixed(2),
      mapSetupTimeMs: mapSetupTime.toFixed(2),
      mapGetTotalTimeMs: mapLookupTime.toFixed(2),
      mapTotalTimeMs: totalMapTime.toFixed(2),
      performanceImprovement: `${improvement}x`
    }
  };
}

const benchmarkResults = runBenchmark();
console.log(JSON.stringify(benchmarkResults, null, 2));
