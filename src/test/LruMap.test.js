import {LruMap} from "../LruMap";

describe("LruMap", () => {
  it("should take maxSize as constructor argument and should provide getMaxSize method", () => {
    const size = 50;
    const lruMap = LruMap(size);
    expect(lruMap.getMaxSize()).toEqual(size);
  });

  it("should provide set and get methods like a Map", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    expect(lruMap.get("key1")).toEqual("value1");
    lruMap.set("key1", "value1_modified");
    expect(lruMap.get("key1")).toEqual("value1_modified");
    expect(typeof lruMap.get("key2")).toEqual("undefined");
  });

  it("should let the set method return the removed entry in case maxSize was exceeded, else null", () => {
    const size2 = 2;
    const lruMap = LruMap(size2);
    expect(lruMap.set("key1", "value1")).toEqual(null);
    expect(lruMap.set("key2", "value2")).toEqual(null);
    expect(lruMap.set("key3", "value3").key).toEqual("key1");
  });

  it("should provide a getSize method", () => {
    const size1 = 1;
    const size2 = 2;
    const lruMap = LruMap(size2);
    lruMap.set("key1", "value1");
    expect(lruMap.getSize()).toEqual(size1);
    lruMap.set("key1", "value1_modified");
    expect(lruMap.getSize()).toEqual(size1);
    lruMap.set("key2", "value2");
    expect(lruMap.getSize()).toEqual(size2);
    lruMap.set("key3", "value3"); // should remove key1
    expect(lruMap.getSize()).toEqual(size2);
    lruMap.delete("key2");
    expect(lruMap.getSize()).toEqual(size1);
  });

  it("should provide a delete method that returns false in case the to be deleted key was not in the map", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    expect(lruMap.delete("key1")).toBeTruthy();
    expect(lruMap.delete("key1")).toBeFalsy();
  });

  it("should provide a setMaxSize method that returns an array of removed entries in case the newMaxSize is smaller than map size", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    lruMap.set("key2", "value2");
    lruMap.set("key3", "value3");
    lruMap.set("key4", "value4");
    const size2 = 2;
    const removals = lruMap.setMaxSize(size2);
    expect(removals.length).toEqual(size2);
    expect(removals[0].key).toEqual("key1");
    expect(removals[1].key).toEqual("key2");
  });

  it("should set maxSize to null (meaning infinite) in case 0 is provided as argument", () => {
    const lruMap = LruMap(0);
    expect(lruMap.getMaxSize()).toEqual(null);
    lruMap.setMaxSize(1);
    expect(lruMap.getMaxSize()).toEqual(1);
    lruMap.setMaxSize(0);
    expect(lruMap.getMaxSize()).toEqual(null);
  });

  it("should provide a forEach method like a Map", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    lruMap.set("key2", "value2");
    const items = [];
    lruMap.forEach((value, key) => {
      items.push({key, value});
    });
    const size2 = 2;
    expect(items.length).toEqual(size2);
    expect(items[0].key).toEqual("key1");
    expect(items[1].key).toEqual("key2");
  });

  it("should provide a map method", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    lruMap.set("key2", "value2");
    const items = lruMap.map((value, key) => ({key, value}));
    const size2 = 2;
    expect(items.length).toEqual(size2);
    expect(items[0].key).toEqual("key1");
    expect(items[1].key).toEqual("key2");
  });

  it("should provide a clear method that returns an array of removed entries", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    lruMap.set("key2", "value2");
    const removals = lruMap.clear();
    const size2 = 2;
    expect(removals.length).toEqual(size2);
    expect(removals[0].key).toEqual("key1");
    expect(removals[1].key).toEqual("key2");
  });

  it("should provide correct LRU logic", () => {
    const lruMap = LruMap();
    lruMap.set("key1", "value1");
    lruMap.set("key2", "value2");
    lruMap.set("key3", "value3");
    lruMap.set("key4", "value4");
    lruMap.set("key2", "value2");
    // expected order: key1 -> key3 -> key4 -> key2
    let keys = lruMap.map((value, key) => key);
    const size4 = 4;
    expect(keys.length).toEqual(size4);
    expect(keys[0]).toEqual("key1");
    expect(keys[1]).toEqual("key3");
    expect(keys[2]).toEqual("key4");
    expect(keys[3]).toEqual("key2");

    const size2 = 2;
    lruMap.delete("key1");
    // expected order: key3 -> key4 -> key2
    lruMap.setMaxSize(size2);
    // expected order: key4 -> key2
    keys = lruMap.map((value, key) => key);
    expect(keys.length).toEqual(size2);
    expect(keys[0]).toEqual("key4");
    expect(keys[1]).toEqual("key2");

    const size3 = 3;
    lruMap.setMaxSize(size3);
    lruMap.delete("key2");
    lruMap.set("key5", "value5");
    lruMap.set("key6", "value6");
    lruMap.set("key4", "value4");
    // expected order: key5 -> key6 -> key4
    lruMap.delete("key6");
    // expected order: key5 -> key4
    keys = lruMap.map((value, key) => key);
    expect(keys.length).toEqual(size2);
    expect(keys[0]).toEqual("key5");
    expect(keys[1]).toEqual("key4");
  });

});
