import {
  getCache,
  cacheTransaction,
  registerCacheChangedHandler,
} from "../LruCache";


const VALUE_TYPE_1 = "valueType1";
const VALUE_TYPE_2 = "valueType2";
const DEFAULT_CACHE_SIZE = 500;


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

  it("should allow to pass an array of alternate keys to 'set' method. 'get' must also work with the alternate key", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
      alternateKeys: ["myAltKey1", "myAltKey2"],
    });
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1");
    expect(cache1.get("myAltKey2")).toEqual("value1 of type 1");
    expect(typeof cache1.get("myAltKey3")).toEqual("undefined");

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


describe("registerCacheChangedHandler", () => {
  it("should register a listener to cache change events", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeCounter = 0;
    registerCacheChangedHandler(() => {
      changeCounter += 1;
    });

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
    });
    expect(changeCounter).toEqual(1);

    cache1.clear();
    expect(changeCounter).toEqual(2);
  });

  it("should register a listener to cache change events", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    let changeCounter = 0;
    registerCacheChangedHandler(() => {
      changeCounter += 1;
    });

    cache1.set({
      key: "key1",
      value: "value1 of type 1",
    });
    expect(changeCounter).toEqual(1);

    cache1.clear();
    expect(changeCounter).toEqual(2);
  });
});
