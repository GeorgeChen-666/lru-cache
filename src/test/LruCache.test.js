import {
  getCache,
  cacheTransaction,
  registerCacheChangedHandler,
} from "../LruCache";


const VALUE_TYPE_1 = "valueType1";
const VALUE_TYPE_2 = "valueType2";


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

  /*
  it("should provide a 'setAll' method that supports alternateKeys", () => {
    const cache1 = getCache(VALUE_TYPE_1);

    cache1.setAll({
      keyValueArray: [
        {key: "key1", value: ""}
      ],
      keyToAlternateKeys: new Map([

      ]),
      key: "key1",
      value: "value1 of type 1",
      alternateKeys: ["myAltKey1", "myAltKey2"],
    });
    expect(cache1.get("myAltKey1")).toEqual("value1 of type 1");
    expect(cache1.get("myAltKey2")).toEqual("value1 of type 1");
    expect(typeof cache1.get("myAltKey3")).toEqual("undefined");

    cache1.clear();
  });
  */
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
