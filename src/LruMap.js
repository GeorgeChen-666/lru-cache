
/* eslint-disable no-param-reassign */
const makeNewest = (entry, entryList) => {
  if (entry === entryList.newest) {
    // entry already is newest
    return;
  }
  if (entryList.newest === null) {
    // first entry
    entryList.newest = entry;
    entryList.oldest = entry;
    return;
  }
  const eNext = entry.next;
  const ePrev = entry.prev;
  const oldNewest = entryList.newest;
  entry.next = null;
  entry.prev = entryList.newest;
  entryList.newest = entry;
  if (eNext !== null) {
    eNext.prev = ePrev;
    if (entryList.oldest === entry) {
      entryList.oldest = eNext;
    }
  }
  if (oldNewest !== null) {
    oldNewest.next = entry;
    entry.prev = oldNewest;
  }
  if (ePrev !== null) {
    ePrev.next = eNext;
  }
};

/* eslint-disable no-param-reassign */
const removeEntry = (entry, entryList, keyToEntry) => {
  if (entry.next === null) {
    entryList.newest = entry.prev;
  }
  else {
    entry.next.prev = entry.prev;
  }
  if (entry.prev === null) {
    entryList.oldest = entry.next;
  }
  else {
    entry.prev.next = entry.next;
  }
  keyToEntry.delete(entry.key);
};

const removeOldest = (entryList, keyToEntry) => {
  const removedEntry = entryList.oldest;
  if (keyToEntry.delete(entryList.oldest.key)) {
    entryList.oldest = entryList.oldest.next;
    if (entryList.oldest !== null) {
      entryList.oldest.prev = null;
    }
  }
  delete removedEntry.next;
  delete removedEntry.prev;
  return removedEntry;
};

const shrinkToMaxSize = (maxSize, entryList, keyToEntry) => {
  const removals = [];
  if (maxSize === null) {
    return removals;
  }
  while (keyToEntry.size > maxSize) {
    removals.push(removeOldest(entryList, keyToEntry));
  }
  return removals;
};


/** Map object that provides LRU logic, removing oldest entry in case adding a new one exceeds the set max size
 * @param {int} maxSize - maximum size for the LRU Map. If null or not specified, then the size is unlimited
 * @return {LruMap} - an object with methods setMaxSize, getMaxSize, getSize, set, get, delete, clear, forEach and map
 */
export function LruMap(maxSize = null) {
  const self = this instanceof LruMap ? this : Object.create(LruMap.prototype);
  let sizeLimit = maxSize;
  if (sizeLimit === 0) {
    sizeLimit = null;
  }
  const keyToEntry = new Map();
  const entryList = {
    newest: null,
    oldest: null,
  };

  /** Change the max size of the LruMap. Will return an array of removed entries as key-value-objects (empty in case the existing list had not to be shrinked) */
  self.setMaxSize = newMaxSize => {
    sizeLimit = newMaxSize;
    if (sizeLimit === 0) {
      sizeLimit = null;
    }
    return shrinkToMaxSize(sizeLimit, entryList, keyToEntry);
  };

  /** Return current maxSize */
  self.getMaxSize = () => sizeLimit;

  /** Return current size */
  self.getSize = () => keyToEntry.size;

  /** Make the given item the newest. If the key already exists in the map, the corresponding item will be replaced by the given one. In case of maxSize being exceeded, the removed entry will be returned (as object with key and value), else null */
  self.set = (key, value) => {
    let entry = keyToEntry.get(key);
    if (typeof entry === "undefined") {
      entry = {
        key,
        value,
        next: null,
        prev: null,
      };
      keyToEntry.set(key, entry);
    }
    else {
      entry.value = value;
    }
    makeNewest(entry, entryList);
    const removals = shrinkToMaxSize(sizeLimit, entryList, keyToEntry);
    return removals.length === 1 ? removals[0] : null;
  };

  /** Return value for key (undefined if not exists) */
  self.get = key => {
    const entry = keyToEntry.get(key);
    if (typeof entry === "undefined") {
      return entry;
    }
    return entry.value;
  };

  /** Remove the entry with the given key from the map. Returns false, in case the key was not in the map */
  self.delete = key => {
    const entry = keyToEntry.get(key);
    if (typeof entry === "undefined") {
      return false;
    }
    removeEntry(entry, entryList, keyToEntry);
    return true;
  };

  /** Given callback will receive value as first parameter and key as second parameter. Iterates from oldest to newest */
  self.forEach = callback => {
    let next = entryList.oldest;
    while (next !== null) {
      callback(next.value, next.key); // eslint-disable-line callback-return
      next = next.next;
    }
  };

  /** Given callback will receive value as first parameter and key as second parameter. Returns an array. Iterates from oldest to newest */
  self.map = callback => {
    let next = entryList.oldest;
    const result = [];
    while (next !== null) {
      result.push(callback(next.value, next.key)); // eslint-disable-line callback-return
      next = next.next;
    }
    return result;
  };

  /** Will clear the map and return an array with the removed entries */
  self.clear = () => {
    const result = self.map((value, key) => ({key, value}));
    keyToEntry.clear();
    entryList.newest = null;
    entryList.oldest = null;
    return result;
  };

  return self;
}
