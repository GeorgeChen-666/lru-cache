import {LruMap} from "./LruMap";

/** @namespace @swarmy/lru-cache */

const DEFAULT_MAX_SIZE = 500;

let nextHandlerKey = 0;
const keyToChangedHandler = new Map();
const valueTypeToActiveChangeHandlerKeys = new Map();
const allTypesActiveChangeHandlerKeys = new Set();

const addToActiveHandlerKeys = (key, valueTypes) => {
  if (valueTypes === null || (Array.isArray(valueTypes) && valueTypes.length === 0)) {
    allTypesActiveChangeHandlerKeys.add(key);
  }
  else {
    const types = Array.isArray(valueTypes) ? valueTypes : [valueTypes];
    types.forEach(valueType => {
      let activeChangeHandlerKeys = valueTypeToActiveChangeHandlerKeys.get(valueType);
      if (typeof activeChangeHandlerKeys === "undefined") {
        activeChangeHandlerKeys = new Set();
        valueTypeToActiveChangeHandlerKeys.set(valueType, activeChangeHandlerKeys);
      }
      activeChangeHandlerKeys.add(key);
    });
  }
};

const removeFromActiveHandlerKeys = (key, valueTypes) => {
  if (valueTypes === null || (Array.isArray(valueTypes) && valueTypes.length === 0)) {
    allTypesActiveChangeHandlerKeys.delete(key);
  }
  else {
    const types = Array.isArray(valueTypes) ? valueTypes : [valueTypes];
    types.forEach(valueType => {
      valueTypeToActiveChangeHandlerKeys.get(valueType).delete(key);
    });
  }
};

const getActiveHandlerKeys = valueTypes => {
  const types = typeof valueTypes === "string" ? [valueTypes] : valueTypes;
  const result = new Set();
  types.forEach(valueType => {
    const activeChangeHandlerKeys = valueTypeToActiveChangeHandlerKeys.get(valueType);
    if (typeof activeChangeHandlerKeys !== "undefined") {
      activeChangeHandlerKeys.forEach(key => {
        result.add(key);
      });
    }
  });
  allTypesActiveChangeHandlerKeys.forEach(key => {
    result.add(key);
  });
  return result;
};

const hasActiveHandler = valueType => {
  if (allTypesActiveChangeHandlerKeys.size > 0) {
    return true;
  }
  const activeChangeHandlerKeys = valueTypeToActiveChangeHandlerKeys.get(valueType);
  return typeof activeChangeHandlerKeys === "undefined" ? false : activeChangeHandlerKeys.size > 0;
};

/**
 * Register a handler that is called when value(s) get updated/inserted/removed in/to/from a cache.
 * If the cache has already exceeded its maxSize, there is no way to know if a cache.set (or setAll) is an insert or
 * an update (because JS does not yet provide weak references), so an insert event can be insert or update.
 * The returned handle can be used to unregister the handler, or to deactivate/activate it (initial state is active).
 * @memberof @swarmy/lru-cache
 * @function
 * @param {function} changedHandler - A function that will be called with an object parameter of the following shape:
 *                   {
 *                     valueTypes: Set(),
 *                     <valueType>: {
 *                       inserts: [{key, value, alternateKeys, order}],
 *                       clearRemoves: [{key, value, alternateKeys, order}],
 *                       lruRemoves: [{key, value, alternateKeys, order}],
 *                       deleteRemoves: [{key, value, alternateKeys, order}],
 *                     },
 *                     ...
 *                   }
 *                   The order can be used to determine e.g. if an entry was first inserted and then deleted, or first
 *                   deleted and then re-inserted (can happen in cache transactions).
 * @param {Array | string} valueTypes - An array or a single string specifying the cache value types the handler should be called for (default: null)
 *                 If null, it will be called for all object types
 *                 If not null and a bulk (transactional) change has multiple valueTypes of which only some are of
 *                 interest for the handler, then also the other types will be part of the argument (if at least one other active listener for the other types exist)
 * @return {object} handlerHandle - An object with methods unregister, activate, deactivate and isRegistered and with fields isActive, valueType and changedHandler
 */
export const registerCacheChangedHandler = (changedHandler, valueTypes = null) => {
  const key = nextHandlerKey;
  nextHandlerKey += 1;
  const handler = {
    changedHandler,
    valueTypes,
    isActive: true,
    unregister: () => {
      keyToChangedHandler.delete(key);
      removeFromActiveHandlerKeys(key, valueTypes);
    },
  };
  handler.activate = () => {
    handler.isActive = true;
    addToActiveHandlerKeys(key, valueTypes);
  };
  handler.deactivate = () => {
    handler.isActive = false;
    removeFromActiveHandlerKeys(key, valueTypes);
  };
  handler.isRegistered = () => keyToChangedHandler.has(key);
  keyToChangedHandler.set(key, handler);
  addToActiveHandlerKeys(key, valueTypes);
  return handler;
};


const handleTransactionChangeObject = changeObject => {
  const activeHandlerKeys = getActiveHandlerKeys(changeObject.valueTypes);
  const errors = [];
  let handled = 0;
  activeHandlerKeys.forEach(key => {
    const handler = keyToChangedHandler.get(key);
    try {
      handler.changedHandler(changeObject);
    }
    catch(error) {
      errors.push(error);
    }
    finally {
      handled += 1;
    }
  });
  if (errors.length > 0) {
    let message = "handleTransactionChangeObject: " + String(errors.length) + " of " + String(handled) + " handlers threw an error: ";
    errors.forEach(error => {
      message += error.message + ", ";
    });
    const error = new Error(message);
    error.errors = errors;
    throw error;
  }
};


let transactionChangeObject = null;
let changeOrder = 0;
let runningTransactions = 0;

/** Pass a callback or a promise. All cache changes happening inside the callback or promise will be batched into a single
 *  change object that will be dispatched to handlers after the callback/promise has finished. If this is called while there
 *  is already another transaction in progress, the two transactions will just be batched together.
 * @memberof @swarmy/lru-cache
 * @function
 * @param {function | Promise} callbackOrPromise - callback or promise to be executed within the transaction
 * @return {undefined} void
 */
export const cacheTransaction = callbackOrPromise => {
  if (transactionChangeObject === null) {
    transactionChangeObject = {
      valueTypes: new Set(),
    };
  }
  runningTransactions += 1;
  if (typeof callbackOrPromise.finally === "function") {
    callbackOrPromise.finally(() => {
      runningTransactions -= 1;
      if (runningTransactions === 0) {
        try {
          handleTransactionChangeObject(transactionChangeObject);
        }
        finally {
          transactionChangeObject = null;
          changeOrder = 0;
        }
      }
    });
  }
  else {
    try {
      callbackOrPromise();
    }
    finally {
      runningTransactions -= 1;
      if (runningTransactions === 0) {
        try {
          handleTransactionChangeObject(transactionChangeObject);
        }
        finally {
          transactionChangeObject = null;
          changeOrder = 0;
        }
      }
    }
  }
};

const handleChange = (valueType, keyValueAlternateKeys, fieldNameAdd, fieldNamesUnchanged) => {
  let changeObject = transactionChangeObject;
  const batchChanges = changeObject !== null;
  if (changeObject === null) {
    changeObject = {
      valueTypes: new Set(),
    };
  }
  if (changeObject.valueTypes.has(valueType)) {
    // Copying the original entry is not just done to add the order, but is mandatory to get the value
    // at the point of change and not the current cache value in the change event!
    changeObject[valueType][fieldNameAdd].push({...keyValueAlternateKeys, order: changeOrder++});
  }
  else {
    changeObject.valueTypes.add(valueType);
    changeObject[valueType] = {
      [fieldNameAdd]: [{...keyValueAlternateKeys, order: changeOrder++}],
    };
    fieldNamesUnchanged.forEach(fieldName => {
      changeObject[valueType][fieldName] = [];
    })
  }
  if (!batchChanges) {
    handleTransactionChangeObject(changeObject);
  }
};

let handleChanges = true;

const handleInsert = (valueType, keyValueAlternateKeys) => {
  if (handleChanges) {
    handleChange(valueType, keyValueAlternateKeys, "inserts", ["clearRemoves", "lruRemoves", "deleteRemoves"]);
  }
};

const handleClearRemove = (valueType, keyValueAlternateKeys) => {
  if (handleChanges) {
    handleChange(valueType, keyValueAlternateKeys, "clearRemoves", ["inserts", "lruRemoves", "deleteRemoves"]);
  }
};

const handleLruRemove = (valueType, keyValueAlternateKeys) => {
  if (handleChanges) {
    handleChange(valueType, keyValueAlternateKeys, "lruRemoves", ["clearRemoves", "inserts", "deleteRemoves"]);
  }
};

const handleDeleteRemove = (valueType, keyValueAlternateKeys) => {
  if (handleChanges) {
    handleChange(valueType, keyValueAlternateKeys, "deleteRemoves", ["clearRemoves", "lruRemoves", "inserts"]);
  }
};

const asyncWrap = syncFunction => (...args) => new Promise((resolve, reject) => {
  setTimeout(() => {
    try {
      const result = syncFunction(...args);
      resolve(result);
    }
    catch (e) {
      reject(e);
    }
  }, 0);
});

const wrapInTransaction = (valueType, transactionCallback) => {
  if (hasActiveHandler(valueType)) {
    cacheTransaction(transactionCallback);
  }
  else {
    try {
      handleChanges = false;
      transactionCallback();
    }
    finally {
      handleChanges = true;
    }
  }
};

const setAll = (valueType, lruMap, alternateKeyToKey, keyValueAlternateKeysArray, dispatchLruRemoves) => {
  if (!Array.isArray(keyValueAlternateKeysArray)) {
    throw new Error("LruCache::setAll: keyValueAlternateKeysArray must be an array");
  }
  wrapInTransaction(valueType, () => {
    keyValueAlternateKeysArray.forEach(({key, value, alternateKeys}) => {
      let entry = lruMap.get(key);
      let altKeys = Array.isArray(alternateKeys) ? alternateKeys : [];
      if (altKeys.length === 0 && typeof alternateKeys === "string") {
        altKeys = [alternateKeys];
      }
      altKeys.forEach(altKey => {
        if (alternateKeyToKey.has(altKey) && alternateKeyToKey.get(altKey) !== key) {
          throw new Error("LruCache::setAll: alternate key '" + altKey + "' is given for key '" + key + "' and value type '" + valueType + "' but is already used for key '" + alternateKeyToKey.get(altKey) + "'");
        }
      });
      altKeys = new Set(altKeys);
      if (typeof entry === "undefined") {
        entry = {
          key,
          value,
          alternateKeys: altKeys,
        };
      }
      else {
        entry.value = value;
        entry.alternateKeys = new Set([...entry.alternateKeys, ...altKeys]);
      }
      const removed = lruMap.set(key, entry);
      altKeys.forEach(altKey => {
        alternateKeyToKey.set(altKey, key);
      });
      handleInsert(valueType, entry);
      if (removed !== null) {
        removed.value.alternateKeys.forEach(altKey => {
          alternateKeyToKey.delete(altKey);
        });
        if (dispatchLruRemoves) {
          handleLruRemove(valueType, removed.value);
        }
      }
    });
  });
};

const entryGetter = (key, alternateKeyToKey, getter) => {
  let entry = getter(key);
  if (typeof entry === "undefined" && alternateKeyToKey.has(key)) {
    entry = getter(alternateKeyToKey.get(key));
  }
  return entry;
};

/** Cannot be instantiated directly! Use 'getCache' to get a cache instance.
 *  By default, cache events are dispatched only for inserts/updates and deletes.
 *  To dispatch also LRU removes and/or clear removes, use the corresponding setters.
 * @class LruCache
 * @param {string} valueType - The value type of this cache
 * @param {maxSize} maxSize - The maximum number of entries for the given value type (default: 500)
 */
function LruCache(valueType, maxSize = DEFAULT_MAX_SIZE) {
  const self = this instanceof LruCache ? this : Object.create(LruCache.prototype);
  const lruMap = LruMap(maxSize);
  const alternateKeyToKey = new Map();
  let dispatchLruRemoves = false;
  let dispatchClearRemoves = false;

  /** Set whether the cache should also dispatch events for LRU removes
   * @memberof LruCache
   * @function
   * @param {boolean} newValue - true, if LRU removes should be dispatched
   * @returns {undefined} void
   */
  self.dispatchLruRemoves = newValue => {
    dispatchLruRemoves = newValue;
  };

  /** Set whether the cache should also dispatch events for clear removes
   * @memberof LruCache
   * @function
   * @param {boolean} newValue - true, if clear removes should be dispatched
   * @returns {undefined} void
   */
  self.dispatchClearRemoves = newValue => {
    dispatchClearRemoves = newValue;
  };

  /** Insert or update multiple cache entries.
   *  If alternate keys are provided and an already existing entry already has alternate keys, these will be extended.
   *  A corresponding cache changed event will be dispatched.
   *  If inserts lead to cache max size being exceeded and dispatchLruRemoves is set to true, the cache change event will contain both, inserts and removes.
   *  It is even possible that an entry from the inserts is also contained in the removes.
   * @memberof LruCache
   * @function
   * @param {Array} keyValueAlternateKeysArray - array of objects with 'key', 'value' and optional 'alternateKeys'
   * @returns {undefined} void
   */
  self.setAll = keyValueAlternateKeysArray => {
    setAll(valueType, lruMap, alternateKeyToKey, keyValueAlternateKeysArray, dispatchLruRemoves);
  };

  /** Like 'setAll', but returning a Promise that is executed in another event loop.
   * @memberof LruCache
   * @function
   * @returns {Promise}
   */
  self.setAllAsync = asyncWrap(self.setAll);

  /** Insert or update a cache entry.
   *  If alternate keys are provided and an already existing entry already has alternate keys, these will be extended.
   *  A corresponding cache changed event will be dispatched.
   *  If an insert leads to cache max size being exceeded and dispatchLruRemoves is set to true, the cache change event will contain both, insert and remove.
   * @memberof LruCache
   * @function
   * @param {object} keyValueAlternateKeys - object with 'key' and 'value' and optional 'alternateKeys'
   * @returns {undefined} void
   */
  self.set = keyValueAlternateKeys => {
    self.setAll([keyValueAlternateKeys]);
  };

  /** Like 'set', but returning a Promise that is executed in another event loop.
   * @memberof LruCache
   * @function
   * @returns {Promise}
   */
  self.setAsync = asyncWrap(self.set);

  /** Get value from cache by either its key or one of its alternate keys (if exists).
   *  Returns undefined, if not in cache.
   *  Makes the corresponding entry the last recently used (use 'getWithoutLruChange' to avoid this).
   * @memberof LruCache
   * @function
   * @param {string} keyOrAlternateKey - The key or alternate key of the value
   * @returns {object | undefined} object, if the key is in cache, else undefined
   */
  self.get = keyOrAlternateKey => {
    const entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap.get);
    return typeof entry === "undefined" ? entry : entry.value;
  };

  /** Like 'get', but not making the corresponding entry the last recently used.
   * @memberof LruCache
   * @function
   * @param {string} keyOrAlternateKey - The key or alternate key of the value
   * @returns {object | undefined} object, if the key is in cache, else undefined
   */
  self.getWithoutLruChange = keyOrAlternateKey => {
    const entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap.getWithoutLruChange);
    return typeof entry === "undefined" ? entry : entry.value;
  };

  /** Delete entry from cache by key or alternate key.
   *  A corresponding cache changed event will be dispatched.
   * @memberof LruCache
   * @function
   * @param {string} keyOrAlternateKey - The key or alternate key of the to be deleted value
   * @returns {boolean} true, if the key was in the cache.
   */
  self.delete = keyOrAlternateKey => {
    const entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap.getWithoutLruChange);
    if (typeof entry === "undefined") {
      return false;
    }
    lruMap.delete(entry.key);
    entry.alternateKeys.forEach(altKey => {
      alternateKeyToKey.delete(altKey);
    });
    // It is important to wrap even single actions to get consistent behavior,
    // e.g. to always reset 'order', even after a delete
    wrapInTransaction(valueType, () => {
      handleDeleteRemove(valueType, entry);
    });
    return true;
  };

  /** Iterate over the cache from oldest to newest entry.
   *  The given callback gets a cache entry as argument (an object with 'key', 'value' and 'alternateKeys').
   * @memberof LruCache
   * @function
   */
  self.forEach = lruMap.forEach;

  /** Get an Array with all cache entries.
   * @memberof LruCache
   * @function
   * @returns {Array} cache entries (objects with 'key', 'value' and 'alternateKeys')
   */
  self.getEntries = () => lruMap.map(entry => entry);

  /** Clear the cache.
   *  A corresponding cache changed event will be dispatched.
   * @memberof LruCache
   * @function
   * @returns {undefined} void
   */
  self.clear = () => {
    const keyValueArray = lruMap.clear();
    alternateKeyToKey.clear();
    if (dispatchClearRemoves) {
      wrapInTransaction(valueType, () => {
        keyValueArray.forEach(keyValuePair => {
          handleClearRemove(valueType, keyValuePair.value);
        });
      });
    }
  };

  /** Get the number of currently cached objects.
   * @memberof LruCache
   * @function
   * @returns {int} current number of entries in this cache
   */
  self.getSize = lruMap.getSize;

  /** Get the value type of this cache.
   * @memberof LruCache
   * @function
   * @return {string} the value type
   */
  self.getValueType = () => valueType;

  /** Return the current max size of this cache.
   * @memberof LruCache
   * @function
   * @returns {int} max size of this cache
   */
  self.getMaxSize = lruMap.getMaxSize;

  /** Set a new max size for this cache.
   *  If this leads to the removal of cache entries and dispatchLruRemoves is set true, a corresponding cache changed event will be dispatched.
   * @memberof LruCache
   * @function
   * @param {int} newMaxSize - the new max number of entries for this cache.
   * @returns {undefined} void
   */
  self.setMaxSize = newMaxSize => {
    const keyValueArray = lruMap.setMaxSize(newMaxSize);
    wrapInTransaction(valueType, () => {
      keyValueArray.forEach(keyValuePair => {
        keyValuePair.value.alternateKeys.forEach(altKey => {
          alternateKeyToKey.delete(altKey);
        });
        if (dispatchLruRemoves) {
          handleLruRemove(valueType, keyValuePair.value);
        }
      });
    });
  };

  return self;
}


const valueTypeToCache = new Map();


/**
 * Get a LruCache for the given valueType.
 * If a cache for this type already exists, the existing cache instance will be returned (LruCache is a singleton per value type).
 * @memberof @swarmy/lru-cache
 * @function
 * @param {string} valueType - The type of object being cached.
 * @returns {LruCache} - A lru-cache object.
 * @see LruCache
 */
export const getCache = valueType => {
  let lruCache = valueTypeToCache.get(valueType);
  if (typeof lruCache === "undefined") {
    lruCache = LruCache(valueType);
    valueTypeToCache.set(valueType, lruCache);
  }
  return lruCache;
};

/**
 * Clear (invalidate) all existing caches.
 * Will dispatch a single change event with all changes batched together.
 * @memberof @swarmy/lru-cache
 * @function
 * @returns {void}
 */
export const clearAllCaches = () => {
  cacheTransaction(() => {
    valueTypeToCache.forEach(cache => {
      cache.clear();
    });
  });
};
