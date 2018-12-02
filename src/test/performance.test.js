/* eslint-disable no-magic-number */

import {LruMap} from "../LruMap";
import {
  getCache,
  cacheTransaction,
  registerCacheChangedHandler,
} from "../LruCache";

const testKeys = [];
const testValues = [];
const nData = 1000000;
const nLoops = 3;
const nUpdates = (2 * nData * nLoops) - nData;
const nGetLoops = nLoops * 10;
const nGets = nData * nGetLoops;

const VALUE_TYPE = "PT";

const getRandomString = () => Math.random().toString(36).substr(2, 10);

const getRandomKey = getRandomString;
const getRandomValue = getRandomString;


beforeAll(() => {
  for (let i = 0; i < nData; ++i) {
    testKeys.push(getRandomKey());
    testValues.push(getRandomValue());
  }
});


describe("Performance Javascript Object", () => {

  const map = {};
  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in a normal Javascript Object", () => {
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map[testKeys[i]] = testValues[i];
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        map[testKeys[i]] = testValues[j];
      }
    }
  });

  it("should measure the time for " + nGets + " by-key-accesses on normal Javascript Object", () => {
    for (let n = 0; n < nGetLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map[testKeys[i]];
      }
    }
  });

});

describe("Performance Javascript Map", () => {

  const map = new Map();
  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in a normal Javascript Map", () => {
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map.set(testKeys[i], testValues[i]);
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        map.set(testKeys[i], testValues[j]);
      }
    }
  });

  it("should measure the time for " + nGets + " 'get' calls on normal Javascript Map", () => {
    for (let n = 0; n < nGetLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map.get(testKeys[i]);
      }
    }
  });

});


describe("Performance LruMap", () => {

  const map1 = new LruMap();

  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in LruMap with infinite maxSize", () => {
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map1.set(testKeys[i], testValues[i]);
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        map1.set(testKeys[i], testValues[j]);
      }
    }
  });

  it("should measure the time for " + nGets + " 'getWithoutLruChange' calls on LruMap", () => {
    for (let n = 0; n < nGetLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map1.getWithoutLruChange(testKeys[i]);
      }
    }
  });

  it("should measure the time for " + nGets + " 'get' calls on LruMap (making the corresponding entry the most recently used)", () => {
    for (let n = 0; n < nGetLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map1.get(testKeys[i]);
      }
    }
  });

  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in LruMap with maxSize 3", () => {
    const map = new LruMap(3);
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map.set(testKeys[i], testValues[i]);
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        map.set(testKeys[i], testValues[j]);
      }
    }
  });

});


describe("Performance LruCache without listeners", () => {

  afterEach(() => {
    // We do this in afterEach, because we don't want to measure the time for the clear
    getCache(VALUE_TYPE).clear();
  });

  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in LruCache with infinite maxSize and no event listener", () => {
    const cache = getCache(VALUE_TYPE);
    cache.setMaxSize(null);
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        cache.set(testKeys[i], testValues[i]);
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        cache.set(testKeys[i], testValues[j]);
      }
    }
  });

  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in LruCache with maxSize 3 and no event listener", () => {
    const cache = getCache(VALUE_TYPE);
    cache.setMaxSize(3);
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        cache.set(testKeys[i], testValues[i]);
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        cache.set(testKeys[i], testValues[j]);
      }
    }
  });

});

