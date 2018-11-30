import {LruMap} from "./LruMap";

/** @namespace @swife/lru-cache */

const DEFAULT_MAX_SIZE = 500;

let nextHandlerKey = 0;
const keyToChangedHandler = new Map();


/**
 * Register a handler that is called when value(s) get updated/inserted/removed in/to/from a cache.
 * If the cache has already exceeded its maxSize, there is no way to know if a cache.set (or setAll) is an insert or
 * an update (because JS does not yet provide weak references), so an insert event can be insert or update.
 * The returned handle can be used to unregister the handler, or to deactivate/activate it (initial state is active).
 * @memberof @swife/lru-cache
 * @function
 * @param {function} changedHandler - A function that will be called with an object parameter of the following shape
 *                   {
 *                     valueTypes: Set(),
 *                     <valueType>: {
 *                       inserts: [{key, value, alternateKeys}],
 *                       removes: [{key, value, alternateKeys, isLruRemove, isClear}]
 *                     },
 *                     ...
 *                   }
 * @param {string} valueTypes - An array specifying the cache value types the handler should be called for (default: null)
 *                 If null, it will be called for all object types
 *                 If not null and a bulk (transactional) change has multiple valueTypes of which only some are of
 *                 interest for the handler, then also the other types will be part of the argument (all or nothing)
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
    },
  };
  handler.activate = () => {
    handler.isActive = true;
  };
  handler.deactivate = () => {
    handler.isActive = false;
  };
  handler.isRegistered = () => keyToChangedHandler.has(key);
  keyToChangedHandler.set(key, handler);
  return handler;
};


const handleTransactionChangeObject = changeObject => {
  const errors = [];
  let handled = 0;
  keyToChangedHandler.forEach(handler => {
    if (handler.isActive) {
      let doCall = handler.valueTypes === null;
      if (!doCall) {
        for (let i = 0; i < handler.valueTypes.length; ++i) {
          if (changeObject.valueTypes.has(handler.valueTypes[i])) {
            doCall = true;
            break;
          }
        }
      }
      if (doCall) {
        try {
          handler.changedHandler(changeObject);
        }
        catch(error) {
          errors.push(error);
        }
        finally {
          handled += 1;
        }
      }
    }
  });
  if (errors.length > 0) {
    let message = "handleTransactionChangeObject: " + String(errors.length) + " of " + String(handled) + " handlers threw an error: ";
    errors.forEach(error => {
      message += error.message + ", ";
    });
    throw new Error(message);
  }
};


let transactionChangeObject = null;
let batchedCallbacksOrPromises = [];

const cacheTransactionRecursive = callbackOrPromise => {
  if (typeof callbackOrPromise.finally === "function") {
    callbackOrPromise.finally(() => {
      const next = batchedCallbacksOrPromises.shift();
      if (typeof next === "undefined") {
        try {
          handleTransactionChangeObject(transactionChangeObject);
        }
        finally {
          transactionChangeObject = null;
        }
      }
      else {
        cacheTransactionRecursive(next);
      }
    });
  }
  else {
    try {
      callbackOrPromise();
    }
    finally {
      try {
        handleTransactionChangeObject(transactionChangeObject);
      }
      finally {
        transactionChangeObject = null;
      }
    }
  }
};


/** Pass a callback or a promise. All cache changes happening inside the callback or promise will be batched into a single
 *  change object that will be dispatched to handlers after the callback/promise has finished. If this is called while there
 *  is already another transaction in progress, the two transactions will just be batched together.
 * @memberof @swife/lru-cache
 * @function
 * @param {function | Promise} callbackOrPromise - callback or promise to be executed within the transaction
 * @return {undefined} void
 */
export const cacheTransaction = callbackOrPromise => {
  if (transactionChangeObject !== null) {
    // There is already a transaction in progress, so we will just batch this one together with the one being in progress:
    batchedCallbacksOrPromises.push(callbackOrPromise);
    return;
  }
  transactionChangeObject = {
    valueTypes: new Set(),
  };
  cacheTransactionRecursive(callbackOrPromise);
};


const handleChange = (valueType, keyValueAlternateKeysIsLruRemove, fieldNameAdd, fieldNameUnchanged) => {
  let changeObject = transactionChangeObject;
  const batchChanges = changeObject !== null;
  if (changeObject === null) {
    changeObject = {
      valueTypes: new Set(),
    };
  }
  if (changeObject.valueTypes.has(valueType)) {
    changeObject[fieldNameAdd].push(keyValueAlternateKeysIsLruRemove);
  }
  else {
    changeObject.valueTypes.add(valueType);
    changeObject[fieldNameAdd] = [keyValueAlternateKeysIsLruRemove];
    changeObject[fieldNameUnchanged] = [];
  }
  if (!batchChanges) {
    handleTransactionChangeObject(changeObject);
  }
};

const handleInsert = (valueType, keyValueAlternateKeys) => {
  handleChange(valueType, keyValueAlternateKeys, "inserts", "removes");
};

const handleRemove = (valueType, keyValueAlternateKeysIsLruRemove) => {
  handleChange(valueType, keyValueAlternateKeysIsLruRemove, "removes", "inserts");
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

const setAll = (valueType, lruMap, alternateKeyToKey, keyValueArray, keyToAlternateKeys) => {
  if (!Array.isArray(keyValueArray)) {
    throw new Error("LruCache::setAll: argument.keyValueArray must be an array");
  }
  cacheTransaction(() => {
    keyValueArray.forEach(pair => {
      const key = pair.key;
      const value = pair.value;
      let entry = lruMap.get(key);
      let alternateKeys = [];
      if (keyToAlternateKeys !== null && keyToAlternateKeys.has(key)) {
        alternateKeys = keyToAlternateKeys.get(key);
        if (!Array.isArray(alternateKeys)) {
          alternateKeys = alternateKeys ? [alternateKeys] : [];
        }
        alternateKeys.forEach(altKey => {
          if (alternateKeyToKey.has(altKey) && alternateKeyToKey.get(altKey) !== key) {
            throw new Error("LruCache::setAll: alternate key '" + altKey + "' is given for key '" + key + "' and value type '" + valueType + "' but is already used for key '" + alternateKeyToKey.get(altKey) + "'");
          }
        });
      }
      alternateKeys = new Set(alternateKeys);
      if (typeof entry === "undefined") {
        entry = {
          key,
          value,
          alternateKeys,
        };
        lruMap.set(key, entry);
      }
      else {
        entry.value = value;
        entry.alternateKeys = new Set([...entry.alternateKeys, ...alternateKeys]);
      }
      const removed = lruMap.set(key, entry);
      alternateKeys.forEach(altKey => {
        alternateKeyToKey.set(altKey, key);
      });
      handleInsert(valueType, {entry});
      if (removed !== null) {
        removed.value.alternateKeys.forEach(altKey => {
          alternateKeyToKey.delete(altKey);
        });
        handleRemove(valueType, {...entry, isLruRemove: true, isClear: false});
      }
    });
  });
};

const entryGetter = (key, alternateKeyToKey, lruMap) => {
  let entry = lruMap.get(key);
  if (typeof entry === "undefined" && alternateKeyToKey.has(key)) {
    entry = lruMap.get(alternateKeyToKey.get(key));
  }
  return entry;
};

/** Cannot be instantiated directly. Use 'getCache' to get a cache instance.
 * @class LruCache
 * @param {string} valueType - The value type of this cache
 * @param {maxSize} maxSize - The maximum number of entries for the given value type (default: 500)
 */
function LruCache(valueType, maxSize = DEFAULT_MAX_SIZE) {
  const self = this instanceof LruCache ? this : Object.create(LruCache.prototype);
  const lruMap = LruMap(maxSize);
  const alternateKeyToKey = new Map();

  /** Insert or update multiple cache entries.
   *  If alternate keys are provided and an already existing entry already has alternate keys, these will be extended.
   *  A corresponding cache changed event will be dispatched.
   *  If an inserts lead to cache max size being exceeded, the changed event will contain both, inserts and removes.
   * @memberof LruCache
   * @function
   * @param {object} - object with 'keyValueArray' and optional 'keyToAlternateKeys'
   * @returns {undefined} void
   */
  self.setAll = ({keyValueArray, keyToAlternateKeys = null}) => {
    setAll(valueType, lruMap, alternateKeyToKey, keyValueArray, keyToAlternateKeys);
  };

  /** Like 'setAll', but returning a Promise that is executed in another event loop.
   * @memberof LruCache
   * @function
   */
  self.setAllAsync = asyncWrap(self.setAll);

  /** Insert or update a cache entry.
   *  If alternate keys are provided and an already existing entry already has alternate keys, these will be extended.
   *  A corresponding cache changed event will be dispatched.
   *  If an insert leads to cache max size being exceeded, the cached change event will contain both, insert and remove.
   * @memberof LruCache
   * @function
   * @param {object} - object with 'key' and 'value' and optional 'alternateKeys'
   * @returns {undefined} void
   */
  self.set = ({key, value, alternateKeys = null}) => {
    if (alternateKeys === null) {
      self.setAll({
        keyValueArray: [{key, value}],
      });
    }
    else {
      const keyToAlternateKeys = new Map();
      keyToAlternateKeys.set(key, alternateKeys);
      self.setAll({
        keyValueArray: [{key, value}],
        keyToAlternateKeys,
      });
    }
  };

  /** Like 'set', but returning a Promise that is executed in another event loop.
   * @memberof LruCache
   * @function
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
    let entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap);
    if (typeof entry === "undefined") {
      return entry;
    }
    lruMap.set(entry.key, entry); // to make it the newest (last recent used)
    return entry.value;
  };

  /** Like 'get', but not making the corresponding entry the last recently used.
   * @memberof LruCache
   * @function
   * @param {string} keyOrAlternateKey - The key or alternate key of the value
   * @returns {object | undefined} object, if the key is in cache, else undefined
   */
  self.getWithoutLruChange = keyOrAlternateKey => {
    let entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap);
    if (typeof entry === "undefined") {
      return entry;
    }
    return entry.value;
  };

  /** Delete entry from cache by key or alternate key.
   *  A corresponding cache changed event will be dispatched.
   * @memberof LruCache
   * @function
   * @param {string} keyOrAlternateKey - The key or alternate key of the to be deleted value
   * @returns {boolean} true, if the key was in the cache.
   */
  self.delete = keyOrAlternateKey => {
    const entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap);
    if (typeof entry === "undefined") {
      return false;
    }
    lruMap.delete(entry.key);
    entry.alternateKeys.forEach(altKey => {
      alternateKeyToKey.delete(altKey);
    });
    handleRemove(valueType, {...entry, isLruRemove: false, isClear: false});
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
    keyValueArray.forEach(keyValuePair => {
      cacheTransaction(() => {
        handleRemove(valueType, {...keyValuePair.value, isLruRemove: false, isClear: true});
      });
    });
  };

  /** Get the number of currently cached objects.
   * @memberof LruCache
   * @function
   * @returns {int} current number of entries in this cache
   */
  self.getSize = lruMap.getSize();

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
  self.getMaxSize = lruMap.getMaxSize();

  /** Set a new max size for this cache.
   *  If this leads to the removal of cache entries, a corresponding cache changed event will be dispatched.
   * @memberof LruCache
   * @function
   * @param {int} newMaxSize - the new max number of entries for this cache.
   * @returns {undefined} void
   */
  self.setMaxSize = newMaxSize => {
    const keyValueArray = lruMap.setMaxSize(newMaxSize);
    keyValueArray.forEach(keyValuePair => {
      cacheTransaction(() => {
        handleRemove(valueType, {...keyValuePair.value, isLruRemove: true, isClear: false});
      });
    });
  };

  return self;
}


const valueTypeToCache = new Map();


/**
 * Get a LruCache for the given valueType.
 * If a cache for this type already exists, the existing cache instance will be returned (LruCache is a singleton per value type).
 * @memberof @swife/lru-cache
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
 * @memberof @swife/lru-cache
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
