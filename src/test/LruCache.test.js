/* eslint-disable no-magic-number, max-lines */

import {
  getCache,
  cacheTransaction,
  registerCacheChangedHandler,
  clearAllCaches,
} from "../LruCache";

const VALUE_TYPE_1 = "valueType1";
const VALUE_TYPE_2 = "valueType2";
const VALUE_TYPE_3 = "valueType3";
const DEFAULT_CACHE_SIZE = 500;


beforeAll(() => {
  getCache(VALUE_TYPE_1).dispatchLruRemoves(true);
  getCache(VALUE_TYPE_1).dispatchClearRemoves(true);
  getCache(VALUE_TYPE_2).dispatchLruRemoves(true);
  getCache(VALUE_TYPE_2).dispatchClearRemoves(true);
});

afterAll(() => {
  getCache(VALUE_TYPE_1).dispatchLruRemoves(false);
  getCache(VALUE_TYPE_1).dispatchClearRemoves(false);
  getCache(VALUE_TYPE_2).dispatchLruRemoves(false);
  getCache(VALUE_TYPE_2).dispatchClearRemoves(false);
  getCache(VALUE_TYPE_1).clear();
  getCache(VALUE_TYPE_2).clear();
});


describe("LruCache", () => {
  it("should provide a 'set' method for a key/value pair and a 'get' method to retrieve by key", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
    });
    expect(cache1.get("key1")).toEqual("value1 of type 1");

    cache1.clear();
  });

  it("should allow to pass an array of alternate keys to 'set' method. 'get' and 'has' must also work with the alternate key", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
      alternateKeys: ["myAltKey1", "myAltKey2"],
    });
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1");
    expect(cache1.get("myAltKey2")).toEqual("value1 of type 1");
    expect(typeof cache1.get("myAltKey3")).toEqual("undefined");
    expect(cache1.has("key1")).toBeTruthy();
    expect(cache1.has("myAltKey2")).toBeTruthy();
    expect(cache1.has("myAltKey3")).toBeFalsy();

    cache1.clear();
  });

  it("should provide a 'setAsync' method that also supports alternate keys", async () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let setPromise = cache1.setAsync({
      key: "key1",
      value: "value1 of type 1",
      alternateKeys: ["myAltKey1"],
    });
    expect(typeof cache1.get("key1")).toEqual("undefined");
    await setPromise;
    expect(cache1.get("key1")).toEqual("value1 of type 1");

    setPromise = cache1.setAsync({
      key: "key1",
      value: "value1 of type 1 modified",
      alternateKeys: ["myAltKey2"], // will extend the existing alternate key
    });
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1");
    expect(typeof cache1.get("myAltKey2")).toEqual("undefined");
    await setPromise;
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1 modified");
    expect(cache1.get("myAltKey2")).toEqual("value1 of type 1 modified");

    cache1.clear();
  });

  it("should provide a 'setAll' method that supports alternateKeys and allow for alternateKeys to be a string instead of an array", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: ["myAltKey1"],
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    expect(cache1.get("key1")).toEqual("value1 of type 1");
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1");
    expect(cache1.get("myAltKey2")).toEqual("value2 of type 1");

    cache1.clear();
  });

  it("should throw when no array is passed to 'setAll'", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
      alternateKeys: "myAltKey1",
    });
    expect(() => {
      cache1.setAll({
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey1",
      })
    }).toThrow("LruCache::setAll: keyValueAlternateKeysArray must be an array");

    cache1.clear();
  });

  it("should provide a 'setAllAsync' method", async () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let setAllPromise = cache1.setAllAsync([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: ["myAltKey1"],
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    expect(typeof cache1.get("key1")).toEqual("undefined");
    await setAllPromise;
    expect(cache1.get("key1")).toEqual("value1 of type 1");

    cache1.clear();
  });

  it("should throw when trying to use an alternate key that is already used for another key", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
      alternateKeys: "myAltKey1",
    });
    expect(() => {
      cache1.set({
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey1",
      })
    }).toThrow("LruCache::setAll: alternate key 'myAltKey1' is given for key 'key2' and value type '" + VALUE_TYPE_1 + "' but is already used for key 'key1'");

    cache1.clear();
  });

  it("should provide a 'setMaxSize' and 'getMaxSize' method and should use max size infinite, if null or 0 is passed to 'setMaxSize'", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    const newSize = 37;
    expect(cache1.getMaxSize()).toEqual(DEFAULT_CACHE_SIZE);
    cache1.setMaxSize(newSize);
    expect(cache1.getMaxSize()).toEqual(newSize);

    cache1.setMaxSize(0);
    expect(cache1.getMaxSize()).toEqual(null);
    cache1.setMaxSize(newSize);
    cache1.setMaxSize(null);
    expect(cache1.getMaxSize()).toEqual(null);

    cache1.setMaxSize(DEFAULT_CACHE_SIZE);
    cache1.clear();
  });

  it("should provide a 'getSize' method", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    expect(cache1.getSize()).toEqual(0);

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: ["myAltKey1"],
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    expect(cache1.getSize()).toEqual(2);

    cache1.set({
      key: "key1",
      value: "value1 of type 1 modified",
    });
    expect(cache1.getSize()).toEqual(2);

    cache1.clear();
    expect(cache1.getSize()).toEqual(0);
  });

  it("should provide a 'delete' method that works with key, but not with alternate key", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    const deleteResult1 = cache1.delete("key1");
    const deleteResult2 = cache1.delete("key1");
    expect(cache1.getSize()).toEqual(1);
    const deleteResult3 = cache1.delete("myAltKey2");
    const deleteResult4 = cache1.delete("key2");
    expect(deleteResult1).toBeTruthy();
    expect(deleteResult2).toBeFalsy();
    expect(deleteResult3).toBeFalsy();
    expect(deleteResult4).toBeTruthy();
    expect(cache1.getSize()).toEqual(0);

    cache1.clear();
  });

  it("should provide a 'getValueType' method", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    expect(cache1.getValueType()).toEqual(VALUE_TYPE_1);
    cache1.clear();
  });

  it("should provide a 'getEntries' method", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    const entries = cache1.getEntries();
    expect(entries[1].alternateKeys.has("myAltKey2")).toBeTruthy();

    cache1.clear();
  });

  it("should provide a 'forEach' method that iterates from oldest to newest entry", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    let entries = [];
    cache1.forEach(entry => {
      entries.push(entry);
    });
    expect(entries[1].alternateKeys.has("myAltKey2")).toBeTruthy();
    cache1.get("key1");
    entries = [];
    cache1.forEach(entry => {
      entries.push(entry);
    });
    expect(entries[1].alternateKeys.has("myAltKey1")).toBeTruthy();

    cache1.clear();
  });

  it("should provide a method to define an entry getter that is used in case of a cache miss", () => {
    const type3GetterSync = key => ({
      key,
      value: key + "_value",
      alternateKeys: [key + "_alternate"],
    });

    const cache = getCache(VALUE_TYPE_3);
    cache.setEntryGetter(type3GetterSync);

    cache.set({
      key: "key1",
      value: "value1",
    });
    expect(cache.get("key1")).toEqual("value1");
    expect(cache.get("key2")).toEqual("key2_value");
    expect(cache.get("key2_alternate")).toEqual("key2_value");

    cache.setEntryGetter(null);
    cache.clear();
  });

  it("should provide a method to define an async entry getter that is used in case of a cache miss", async () => {
    let nCalls = 0;
    const type3GetterAsync = key => new Promise(resolve => {
      nCalls += 1;
      setTimeout(() => {
        resolve({
          key,
          value: key + "_value",
          alternateKeys: [key + "_alternate"],
        });
      }, 200)
    });

    const cache = getCache(VALUE_TYPE_3);
    cache.setEntryGetter(type3GetterAsync);

    expect(typeof cache.get("key1") === "object").toBeTruthy();
    expect(typeof cache.get("key1").then === "function").toBeTruthy();
    const val = await cache.get("key1");
    expect(val).toEqual("key1_value");
    expect(cache.get("key1")).toEqual("key1_value");
    // We must also ensure that the getter was called only once:
    expect(nCalls).toEqual(1);

    cache.setEntryGetter(null);
    cache.clear();
  });

  it("should handle the case where a getter returns undefined", async () => {
    let nCalls = 0;
    const type3GetterAsync = () => new Promise(resolve => {
      nCalls += 1;
      setTimeout(() => {
        resolve(undefined); // eslint-disable-line no-undefined
      }, 200)
    });

    const cache = getCache(VALUE_TYPE_3);
    cache.setEntryGetter(type3GetterAsync);

    expect(typeof cache.get("key1") === "object").toBeTruthy();
    expect(typeof cache.get("key1").then === "function").toBeTruthy();
    let val = await cache.get("key1");
    expect(typeof val).toEqual("undefined");
    expect(typeof cache.get("key1")).toEqual("object");
    val = await cache.get("key1");
    expect(typeof val).toEqual("undefined");
    // We must also ensure that the getter was called only once:
    expect(nCalls).toEqual(2);

    cache.setEntryGetter(null);
    cache.clear();
  });

  it("should take the value from the entry getter and not from the cache, if specified in get", () => {
    const type3GetterSync = key => ({
      key,
      value: key + "_value",
      alternateKeys: [key + "_alternate"],
    });

    const cache = getCache(VALUE_TYPE_3);
    cache.setEntryGetter(type3GetterSync);

    cache.set({
      key: "key1",
      value: "value1",
    });
    expect(cache.get("key1")).toEqual("value1");
    expect(cache.get("key1", true)).toEqual("key1_value");
    expect(cache.get("key1")).toEqual("key1_value");

    cache.setEntryGetter(null);
    cache.clear();
  });

  it("should throw, if value should be taken from entry getter and no entry getter is defined", () => {
    const cache = getCache(VALUE_TYPE_3);

    cache.set({
      key: "key1",
      value: "value1",
    });
    expect(cache.get("key1")).toEqual("value1");
    expect(() => {
      cache.get("key1", true);
    }).toThrow("called get with notFromCache, but no entry getter was set");

    cache.clear();
  });

  it("should be possible to override a set entry getter by passing a custom one to the get method", () => {
    const type3GetterSync = key => ({
      key,
      value: key + "_value",
      alternateKeys: [key + "_alternate"],
    });

    const customType3GetterSync = key => ({
      key,
      value: key + "_value_custom",
      alternateKeys: [key + "_alternate"],
    });

    const cache = getCache(VALUE_TYPE_3);
    cache.setEntryGetter(type3GetterSync);

    cache.set({
      key: "key1",
      value: "value1",
    });
    expect(cache.get("key1")).toEqual("value1");
    expect(cache.get("key2")).toEqual("key2_value");
    expect(cache.get("key2_alternate")).toEqual("key2_value");
    expect(cache.get("key2", false, customType3GetterSync)).toEqual("key2_value");
    expect(cache.get("key2_alternate", false, customType3GetterSync)).toEqual("key2_value");
    expect(cache.get("key2", true, customType3GetterSync)).toEqual("key2_value_custom");
    expect(cache.get("key2")).toEqual("key2_value_custom");
    expect(cache.get("key2_alternate")).toEqual("key2_value_custom");

    cache.setEntryGetter(null);
    cache.clear();
  });

});


describe("getCache", () => {
  it("should return the same LruCache instance for the same value type (LruCache must be a per-valueType-singleton)", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    const cache2 = getCache(VALUE_TYPE_2);
    const cache3 = getCache(VALUE_TYPE_1);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
    });

    cache2.set({
      key: "key1",
      value: "value1 of type 2",
    });

    expect(cache3.get("key1")).toEqual("value1 of type 1");

    cache1.clear();
    expect(typeof cache3.get("key1")).toEqual("undefined");

    cache2.clear();
  });
});


describe("clearAllCaches", () => {
  it("should clear all caches", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    const cache2 = getCache(VALUE_TYPE_2);

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: ["myAltKey1"],
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    cache2.setAll([
      {
        key: "key1",
        value: "value1 of type 2",
        alternateKeys: ["myAltKey1"],
      },
      {
        key: "key2",
        value: "value2 of type 2",
        alternateKeys: "myAltKey2",
      },
    ]);

    expect(cache1.get("key1")).toEqual("value1 of type 1");
    expect(cache2.get("key1")).toEqual("value1 of type 2");
    clearAllCaches();
    expect(typeof cache1.get("key1")).toEqual("undefined");
    expect(typeof cache2.get("key1")).toEqual("undefined");
  });
});


describe("registerCacheChangedHandler", () => {

  it("should register a listener to cache change events and return a handlerHandle to activate/deactivate or unregister the listener", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeCounter = 0;
    const handlerHandle = registerCacheChangedHandler(() => {
      changeCounter += 1;
    });
    expect(handlerHandle.isActive).toBeTruthy();
    expect(handlerHandle.isRegistered()).toBeTruthy();

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
    });
    expect(changeCounter).toEqual(1);

    handlerHandle.deactivate();
    expect(handlerHandle.isActive).toBeFalsy();
    cache1.set({
      key: "key1",
      value: "value1 of type 1 mod1",
    });
    expect(changeCounter).toEqual(1);

    handlerHandle.activate();
    expect(handlerHandle.isActive).toBeTruthy();
    cache1.set({
      key: "key1",
      value: "value1 of type 1 mod2",
    });
    expect(changeCounter).toEqual(2);

    handlerHandle.unregister();
    expect(handlerHandle.isRegistered()).toBeFalsy();
    cache1.set({
      key: "key1",
      value: "value1 of type 1 mod3",
    });
    expect(changeCounter).toEqual(2);

    cache1.clear();
  });

  it("should call a listener only once in case of setAll", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeCounter = 0;
    const handlerHandle = registerCacheChangedHandler(() => {
      changeCounter += 1;
    });

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    expect(changeCounter).toEqual(1);

    handlerHandle.unregister();
    cache1.clear();
  });

  it("should create correct change events for set", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeObject = null;
    const handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    });

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].deleteRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].clearRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].lruRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(2);
    expect(changeObject[VALUE_TYPE_1].inserts[0].key).toEqual("key1");
    expect(changeObject[VALUE_TYPE_1].inserts[0].value).toEqual("value1 of type 1");
    expect(changeObject[VALUE_TYPE_1].inserts[0].alternateKeys.has("myAltKey1")).toBeTruthy();

    handlerHandle.unregister();
    cache1.clear();
  });

  it("should throw an error in case of throwing change handlers, but still keep the cache consistent", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    const handlerHandle = registerCacheChangedHandler(() => {
      throw new Error("this is a test");
    });

    expect(() => {
      cache1.setAll([
        {
          key: "key1",
          value: "value1 of type 1",
          alternateKeys: "myAltKey1",
        },
        {
          key: "key2",
          value: "value2 of type 1",
          alternateKeys: "myAltKey2",
        },
      ])
    }).toThrow("handleTransactionChangeObject: 1 of 1 handlers threw an error: this is a test, ");
    expect(cache1.get("key1")).toEqual("value1 of type 1");
    expect(cache1.get("key2")).toEqual("value2 of type 1");
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1");

    handlerHandle.unregister();
    cache1.clear();
  });

  it("should create correct change events for delete", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeObject = null;
    const handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    });

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    cache1.delete("key1");
    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].deleteRemoves.length).toEqual(1);
    expect(changeObject[VALUE_TYPE_1].clearRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].lruRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].deleteRemoves[0].key).toEqual("key1");

    handlerHandle.unregister();
    cache1.clear();
  });

  it("should create correct change events for clear", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeObject = null;
    const handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    });

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    cache1.clear();
    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].clearRemoves.length).toEqual(2);
    expect(changeObject[VALUE_TYPE_1].deleteRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].lruRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].clearRemoves[0].key).toEqual("key1");
    expect(changeObject[VALUE_TYPE_1].clearRemoves[0].value).toEqual("value1 of type 1");
    expect(changeObject[VALUE_TYPE_1].clearRemoves[0].alternateKeys.has("myAltKey1")).toBeTruthy();

    handlerHandle.unregister();
    cache1.clear();
  });

  it("should create correct change events for LRU removes", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setMaxSize(1);

    let changeObject = null;
    const handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    });

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);
    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].clearRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].deleteRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].lruRemoves.length).toEqual(1);
    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(2);
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].key).toEqual("key1");
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].value).toEqual("value1 of type 1");
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].alternateKeys.has("myAltKey1")).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].inserts[0].key).toEqual("key1");
    expect(changeObject[VALUE_TYPE_1].inserts[0].value).toEqual("value1 of type 1");
    expect(changeObject[VALUE_TYPE_1].inserts[0].alternateKeys.has("myAltKey1")).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].inserts[1].key).toEqual("key2");
    expect(changeObject[VALUE_TYPE_1].inserts[1].value).toEqual("value2 of type 1");
    expect(changeObject[VALUE_TYPE_1].inserts[1].alternateKeys.has("myAltKey2")).toBeTruthy();

    cache1.setMaxSize(DEFAULT_CACHE_SIZE);
    handlerHandle.unregister();
    cache1.clear();
  });

  it("should create correct change events if setMaxSize leads to LRU removes", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeObject = null;
    const handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    });

    cache1.setAll([
      {
        key: "key1",
        value: "value1 of type 1",
        alternateKeys: "myAltKey1",
      },
      {
        key: "key2",
        value: "value2 of type 1",
        alternateKeys: "myAltKey2",
      },
    ]);

    cache1.setMaxSize(1);

    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();
    expect(changeObject[VALUE_TYPE_1].clearRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].deleteRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].lruRemoves.length).toEqual(1);
    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].key).toEqual("key1");
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].value).toEqual("value1 of type 1");
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].alternateKeys.has("myAltKey1")).toBeTruthy();

    cache1.setMaxSize(DEFAULT_CACHE_SIZE);
    handlerHandle.unregister();
    cache1.clear();
  });

  it("should only listen to events of the given value types", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    const cache2 = getCache(VALUE_TYPE_2);

    let changeCounter = 0;
    const handlerHandle = registerCacheChangedHandler(() => {
      changeCounter += 1;
    }, [VALUE_TYPE_2]);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
    });
    expect(changeCounter).toEqual(0);

    cache2.set({
      key: "key1",
      value: "value1 of type 2",
    });
    expect(changeCounter).toEqual(1);

    handlerHandle.unregister();
    cache1.clear();
    cache2.clear();
  });

});


describe("cacheTransaction", () => {
  it("should batch change events inside a cache transaction into a single change event being dispatched", () => {
    const cache1 = getCache(VALUE_TYPE_1);
    const cache2 = getCache(VALUE_TYPE_2);

    cache1.setMaxSize(2);

    let changeObject = null;
    let handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    });

    cacheTransaction(() => {
      cache1.setAll([
        {
          key: "key1", // order 0
          value: "value1 of type 1",
          alternateKeys: "myAltKey1",
        },
        {
          key: "key2", // order 1
          value: "value2 of type 1",
          alternateKeys: "myAltKey2",
        },
      ]); // 2 inserts
      expect(changeObject).toEqual(null);

      cache1.set({
        key: "key2", // order 2
        value: "value2 of type 1 modified",
      }); // 3 inserts (key2 in two versions)
      expect(changeObject).toEqual(null);

      cache1.set({
        key: "key3", // order 3  => key1 lruRemove order 4
        value: "value3 of type 1 modified",
      }); // 4 inserts and 1 lruRemove
      expect(changeObject).toEqual(null);

      cache2.set({
        key: "key1", // order 5
        value: "value1 of type 2",
      }); // VT1: 4 inserts and 1 lruRemove / VT2: 1 insert
      expect(changeObject).toEqual(null);

      cache1.delete("key2"); // order 6
      // VT1: 4 inserts and 1 lruRemove and 1 deleteRemove / VT2: 1 insert
      expect(changeObject).toEqual(null);

      cache2.clear(); // order 7
      // VT1: 4 inserts and 1 lruRemove and 1 deleteRemove / VT2: 1 insert and 1 clearRemove
      expect(changeObject).toEqual(null);
    });

    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();
    expect(changeObject.valueTypes.has(VALUE_TYPE_2)).toBeTruthy();

    expect(changeObject[VALUE_TYPE_1].clearRemoves.length).toEqual(0);
    expect(changeObject[VALUE_TYPE_2].clearRemoves.length).toEqual(1);

    expect(changeObject[VALUE_TYPE_1].deleteRemoves.length).toEqual(1);
    expect(changeObject[VALUE_TYPE_2].deleteRemoves.length).toEqual(0);

    expect(changeObject[VALUE_TYPE_1].lruRemoves.length).toEqual(1);
    expect(changeObject[VALUE_TYPE_2].lruRemoves.length).toEqual(0);

    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(4);
    expect(changeObject[VALUE_TYPE_2].inserts.length).toEqual(1);

    expect(changeObject[VALUE_TYPE_1].inserts[0].order).toEqual(0);
    expect(changeObject[VALUE_TYPE_1].inserts[1].order).toEqual(1);
    expect(changeObject[VALUE_TYPE_1].inserts[2].order).toEqual(2);
    expect(changeObject[VALUE_TYPE_1].inserts[3].order).toEqual(3);
    expect(changeObject[VALUE_TYPE_1].lruRemoves[0].order).toEqual(4);
    expect(changeObject[VALUE_TYPE_2].inserts[0].order).toEqual(5);
    expect(changeObject[VALUE_TYPE_1].deleteRemoves[0].order).toEqual(6);
    expect(changeObject[VALUE_TYPE_2].clearRemoves[0].order).toEqual(7);

    expect(changeObject[VALUE_TYPE_1].inserts[1].value).toEqual("value2 of type 1");
    expect(changeObject[VALUE_TYPE_1].inserts[2].value).toEqual("value2 of type 1 modified");

    changeObject = null;
    handlerHandle.unregister();
    handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    }, [VALUE_TYPE_2]);
    cache1.set({
      key: "key2", // order 2
      value: "value2 of type 1 modified again",
    });
    expect(changeObject).toEqual(null); // handler listens only to VT2 changes involved

    cache2.set({
      key: "key2", // order 2
      value: "value2 of type 2 modified again",
    });
    expect(changeObject[VALUE_TYPE_2].inserts.length).toEqual(1);

    handlerHandle.unregister();
    cache1.clear();
    cache2.clear();
  });

  it("should handle a promise instead of a callback", async () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setMaxSize(2);

    let changeObject = null;
    const handlerHandle = registerCacheChangedHandler(changes => {
      changeObject = changes;
    }, [VALUE_TYPE_1]);

    const promise = new Promise(resolve => {
      setTimeout(() => {
        cache1.setAll([
          {
            key: "key1", // order 0
            value: "value1 of type 1",
            alternateKeys: "myAltKey1",
          },
          {
            key: "key2", // order 1
            value: "value2 of type 1",
            alternateKeys: "myAltKey2",
          },
        ]);
        expect(changeObject).toEqual(null);

        resolve();
      }, 0)
    });

    cacheTransaction(promise);

    expect(changeObject).toEqual(null);

    await promise;

    expect(changeObject.valueTypes.has(VALUE_TYPE_1)).toBeTruthy();

    expect(changeObject[VALUE_TYPE_1].inserts.length).toEqual(2);

    handlerHandle.unregister();
    cache1.clear();
  });
});
