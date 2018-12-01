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


describe("Performance Javascript Map", () => {

  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in a normal Javascript Map", () => {
    const map = new Map();
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


describe("Performance LruMap", () => {

  it("should measure the time for " + nData + " inserts and " + nUpdates + " updates in LruMap with infinite maxSize", () => {
    const map = new LruMap();
    for (let n = 0; n < nLoops; ++n) {
      for (let i = 0; i < nData; ++i) {
        map.set(testKeys[i], testValues[i]);
      }
      for (let i = 0, j = nData - 1; i < nData; ++i, --j) {
        map.set(testKeys[i], testValues[j]);
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

