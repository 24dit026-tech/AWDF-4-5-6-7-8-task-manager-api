const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

let hitCount = 0;
let missCount = 0;

module.exports = {
  cache,
  getStats: () => ({
    hits: hitCount,
    misses: missCount,
    keysCount: cache.keys().length,
    keys: cache.keys(),
    stdTTL: 60
  }),
  recordHit: () => {
    hitCount++;
  },
  recordMiss: () => {
    missCount++;
  },
  resetStats: () => {
    hitCount = 0;
    missCount = 0;
  }
};
