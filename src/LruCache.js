import {LruMap} from "./LruMap";

const DEFAULT_MAX_SIZE = 500;

let nextHandlerKey = 0;
const keyToChangedHandler = new Map();

/**
 * Register a handler that is called when value(s) get updated/inserted/removed in/to/from a cache.
 * If the cache has already exceeded its maxSize, there is no way to know if a cache.set (or setAll) is an insert or
 * an update (because JS does not yet provide weak references), so an insert event can be insert or update.
 * The returned handle can be used to unregister the handler, or to deactivate/activate it (initial state is active).
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
 * @return {object} handlerHandle - An object with methods unregister, activate, deactivate and isRegistered and with fields isActive, objectType and onUpdatedHandler
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
 *  is already another transaction in progress, the two transactions will just be batched together.*/
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

function LruCache(valueType, maxSize = DEFAULT_MAX_SIZE) {
  const self = this instanceof LruCache ? this : Object.create(LruCache.prototype);
  const lruMap = LruMap(maxSize);
  const alternateKeyToKey = new Map();

  /** */
  self.setAll = ({keyValueArray, keyToAlternateKeys = null}) => {
    setAll(valueType, lruMap, alternateKeyToKey, keyValueArray, keyToAlternateKeys);
  };

  /** */
  self.setAllAsync = asyncWrap(self.setAll);

  /** Insert or update a cache entry.
   *  If alternate keys are provided and an already existing entry already has alternate keys, these will be extended.
   * @param {object} - object with 'key' and 'value' an optional 'alternateKeys'
   * @return {undefined} void
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

  /** */
  self.setAsync = asyncWrap(self.set);

  /** */
  self.get = keyOrAlternateKey => {
    let entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap);
    if (typeof entry === "undefined") {
      return entry;
    }
    lruMap.set(entry.key, entry); // to make it the newest (last recent used)
    return entry.value;
  };

  /** */
  self.getWithoutLruChange = keyOrAlternateKey => {
    let entry = entryGetter(keyOrAlternateKey, alternateKeyToKey, lruMap);
    if (typeof entry === "undefined") {
      return entry;
    }
    return entry.value;
  };

  /** */
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

  /** */
  self.forEach = lruMap.forEach;

  /** */
  self.getEntries = () => lruMap.map(entry => entry);

  /** */
  self.clear = () => {
    const keyValueArray = lruMap.clear();
    alternateKeyToKey.clear();
    keyValueArray.forEach(keyValuePair => {
      cacheTransaction(() => {
        handleRemove(valueType, {...keyValuePair.value, isLruRemove: false, isClear: true});
      });
    });
  };

  /** */
  self.getSize = lruMap.getSize();

  /** */
  self.getValueType = () => valueType;

  /** */
  self.getMaxSize = lruMap.getMaxSize();

  /** */
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
 * Get a LRU cache for the given valueType.
 * If a cache for this type already exists, the existing cache instance will be returned.
 * The default max size of the cache is 500, but can be changed via cache.setMaxSize.
 * @param {string} valueType - The type of object being cached.
 * @return {object} - A cache object with methods set, setAsync, setAll, setAllAsync, get, getWithoutLruChange, delete, clear, getValueType, getMaxSize, setMaxSize, getSize, forEach and getEntries.
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
 * Will dispatch a single change event with all changes batched together
 * @return {void}
 */
export const clearAllCaches = () => {
  cacheTransaction(() => {
    valueTypeToCache.forEach(cache => {
      cache.clear();
    });
  });
};
