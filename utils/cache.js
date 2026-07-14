const cache = {};

function get(key) {
  const item = cache[key];
  if (!item) return null;
  if (item.expiry && item.expiry < Date.now()) {
    delete cache[key];
    return null;
  }
  return item.value;
}

function set(key, value, ttlMs = 5 * 60 * 1000) {
  cache[key] = {
    value,
    expiry: Date.now() + ttlMs
  };
}

function clear(prefix) {
  if (!prefix) {
    for (const k in cache) {
      delete cache[k];
    }
  } else {
    for (const k in cache) {
      if (k.startsWith(prefix)) {
        delete cache[k];
      }
    }
  }
}

module.exports = { get, set, clear };
