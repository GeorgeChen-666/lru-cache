import {
  getCache,
  cacheTransaction,
  registerCacheChangedHandler,
} from "../LruCache";

const VALUE_TYPE_1 = "valueType1";
const VALUE_TYPE_2 = "valueType2";

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
