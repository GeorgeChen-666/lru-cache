# lru-cache
A Javascript LRU-cache for node and/or browser, featuring:
* LRU cache logic
* Alternate keys
* Value getter for cache fails
* Singleton caches per value type
* Event registry for cache change events
* No dependencies

## Table of Contents
1. [What's New](#section-news)
2. [Installation](#section-installation)
3. [Motivation](#section-motivation)
4. [Basic Usage](#section-basic-usage)
5. [Quality](#section-quality)
6. [Develop](#section-develop)
7. [Detailed Usage](#section-detailed-usage)
8. [Performance](#section-performance)
9. [Questions](#section-questions)
10. [Roadmap](#section-roadmap)


## What's New <a name="section-news"></a>
### Version 3.2.0
* LruCache methods `get` and `getWithoutLruChange` now take custom entry getter as optional third argument.
    * If provided, a custom entry getter takes precedence over one set by `setEntryGetter`

### Version 3.1.0
* New LruCache method `setEntryGetter`
    * Use it to set a function that provides a key-value-alternateKeys object (as expected by `set`)
    * If in a call to `get` or `getWithoutLruChange`, the given key is not in the cache and an entryGetter is set, then the entry getter will be called
        * In case of a synchronous entry getter, the returned entry will be inserted into the cache and the value is returned to the caller of the get method
        * In case of an asynchronous entry getter, a Promise will be returned to the caller of the get method
            * Subsequent calls to `get` or `getWithoutLruChange` will return the same Promise, until it is resolved
            * The Promise resolves to the `entry.value` returned by the entry getter
            * After the Promise resolved, the entry will be in the cache
* New LruCache method `has`
    * To test if a key or alternate key is in the cache
    * Prior to 3.1.0, `getWithoutLruChange` could be used in all cases to test if a value is already cached. However, now the `has` method might be mandatory to do so in case an entry getter was set.

## Installation <a name="section-installation"></a>
```javascript
npm install --save @swarmy/lru-cache
```

## Motivation <a name="section-motivation"></a>
There are for sure more than a handful of different LRU-cache implementations flying around on npm.

What makes this one unique is that it features the use of alternate keys and an event registry for cache change events.

Alternate keys are useful in situations where certain cache consumers have no access to the primary key, or would have to construct or fetch the primary key in advance.

Cache events are useful to have a central point to handle object changes in an application with multiple models. E.g. register all models as listeners and ensure that all entity updates and deletes go over the cache. Than you can ensure that each update or delete of a certain entity, be it due to a change coming from a certain controller or due to a server push, will keep all models in sync. I have applications where I have no need to cache for performance reasons, but still use this pattern to keep my Redux state up to date (by having a single cache listener that dispatches a corresponding action).

## Basic Usage <a name="section-basic-usage"></a>

### Caching
```javascript
import {getCache} from "@swarmy/lru-cache";
// If you use in nodejs and prefer the old-fashioned way:
// var getCache = require("@swarmy/lru-cache").getCache;

...
const userCache = getCache("User");
userCache.set(user.id, user);
...
let user = userCache.get(userId);
if (!user) {
    user = await fetchUser(userId);
}
...
```
* For the same value type (here "User"), getCache will always return the same cache instance.
* For detailed description of all cache methods, have a look at
    * [Detailed Usage](#caching-detail)
    * [JSDoc](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/docs/index.html)

### Cache Events
To register for all cache change events
```javascript
import {registerCacheChangedHandler} from "@swarmy/lru-cache";

registerCacheChangedHandler(changeObject => {
    console.log("changes:", changeObject);
});
```
* For detailed description of all cache methods, have a look at
    * [Detailed Usage](#cache-events-detail)
    * [JSDoc](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/docs/index.html)

## Quality <a name="section-quality"></a>
* [Test results](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/test-report.html)
* [Test coverage](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/coverage/index.html)
* [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/performance-report.html)

## Develop <a name="section-develop"></a>
```javascript
git clone https://github.com/gneu77/lru-cache.git
cd lru-cache
npm install
// no you can do:
npm run build
npm run test
npm run test-performance
npm run generate-doc
```

## Detailed Usage <a name="section-detailed-usage"></a>

### Caching <a name="caching-detail"></a>
The following 4 functions can be imported from lru-cache:

Method | Arguments | Returns | Description
--- | --- | --- | ---
`cacheTransaction` | callbackOrPromise: function\|Promise | undefined | All cache events (set, delete, etc.) within the callback will be combined into a single event that will be dispatched when finished.
`clearAllCaches` | none | undefined | All existing cache instances will be invalidated. If dispatchClearRemoves is set true for a cache, then a single event will be dispatched for the clear.
`getCache` | valueType: string | LruCache | Return LruCache for given value type. For the same value type, the same cache instance will be returned (LruCache is a per-value-type singleton.
`registerCacheChangedHandler` | changedHandler: function, valueTypes: Array\|string | handlerHandle: object | changedHandler will be called with corresponding cache event. If valueTypes is not specified or null, the handler will receive all cache events. Else it will only receive cache events for the given type(s). The returned handlerHandle has the methods `unregister`, `deactivate`, `activate` and `isRegisterd`. It also has the fields `isActive` and `valueType`

LruCache has the following methods:

Method | Arguments | Returns | Description
--- | --- | --- | ---
`clear` | none | undefined | Invalidate the cache. If dispatchClearRemoves is set true for the cache, then a single event will be dispatched for the clear.
`delete` | key: string | wasInCache: boolean | Remove an entry from the cache. A corresponding cache event will be dispatched. Here, no alternate key is allowed!
`dispatchClearRemoves` | newValue: boolean | undefined | Set whether a cache clear should dispatch a cache event (default: false).
`dispatchLruRemoves` | newValue: boolean | undefined | Set whether a LRU-remove (entry being removed due to exceeded cache size) should dispatch a cache event (default: false).
`forEach` | callback: function | undefined | Iterate over the cache from olodest to newest value. Callback receives cache entry as argument, being an object with `key`, `value` and `alternateKeys`.
`get` | keyOrAlternateKey: string, notFromCache: boolean (default: false), customEntryGetter: function (default: null) | value | Get cached value or undefined. The returned value will be made the newest value in the cache. If an entry getter is set (see `setEntryGetter`), this getter will be used in case of a cache miss. If the entry getter is an async function, then a Promise will be returned that resolves to the value (Subsequent calls to get will return the same Promise until resolved, so the entry getter is called only once). If notFromCache is set true, the value will be taken from entry getter, even if a value is already cached. If in this case no entry getter was set, a corresponding error will be thrown. A custom entry getter can also be specified as optional third argument.
`getEntries` | none | Array | Returns an array with all cache entries, order from oldest to newest.
`getMaxSize` | none | Int | Returns the current max size of the cache.
`getSize` | none | Int | Returns the number of entries in the cache.
`getValueType` | none | string | Returns the value type of the cache.
`getWithoutLruChange` | keyOrAlternateKey: string, notFromCache: boolean (default: false), customEntryGetter: function (default: null) | value | Like `get`, but without making the entry the newest in the cache.
`has` | keyOrAlternateKey: string | isInCache: boolean | True, if the key or alternate key is in the cache.
`set` | keyValueAlternateKeys: object | undefined | Insert or update a value in the cache. The argument must be an object with `key` and `value`. Optionally it can also have `alternateKeys`, being string or array of strings. After set, the value will be the newest in the cache. Dispatches a corresponding cache event. If an insert exceeds the max cache size and dispatchLruRemoves is set true, it will be included in the event.
`setAll` | Array\[keyValueAlternateKeys\] | undefined | Like `set`, but for an array of cache entries. Leading to a single cache event.
`setAllAsync` | Array\[keyValueAlternateKeys\] | Promise | Like `setAll`, but performing insert and event dispatch in another event loop, resolving the returned promise afterwards.
`setAsync` | keyValueAlternateKeys: object | Promise | Like `set`, but performing insert and event dispatch in another event loop, resolving the returned promise afterwards.
`setEntryGetter` | entryGetter: function | undefined | Set a getter that can be used to retrieve a cache entry (keyValueAlternateKeys-object) by key in case it is not yet in the cache. For values that might be called by alternate key, the getter should also be able to handle this.
`setMaxSize` | newMaxSize: int | undefined | Change the max size of the cache (default: 500). If the new maxSize is less than the old and this leads to LRU-removes and dispatchLruRemoves is set true, then a single cache event will be dispatched.


### Cache Events <a name="cache-events-detail"></a>
* Especially in more complex UIs, there might be multiple models holding the same type of entity.
* If an entity gets updated, you need a strategy to ensure all models get updated correspondingly.
* Of course the developer implementing the update should not be required to know all models of all screens that might hold an entity of this type
    * Even if he would know them it would be a nightmare, if he had to update all the models
    * Even if he would update all the models, as soon as another developer changes one of the models half a year later, or adds a new model, the application would be broken
* Like always in programming there are many different approaches to this problem. The event-based approach described here is just one of them (not necessarily the best, but if you need caching anyways, then it's handy to combine this):
    * Whenever an updated entity is retrieved, it is put into the cache, leading to a corresponding cache event
    * Whenever an entity is deleted, delete is also called on the cache, leading to a corresponding cache event
    * Whenever a new model is implemented, it is registered for cache events for the object types it is holding
    * Whenever a model receives a cache event, it can check whether it must replace or remove an entity

Here is the structure of the cache change event argument:
```javascript
{
    valueTypes: Set(),
    <valueType>: {
        inserts: [{key, value, alternateKeys, order}],
        clearRemoves: [{key, value, alternateKeys, order}],
        lruRemoves: [{key, value, alternateKeys, order}],
        deleteRemoves: [{key}],
    },
    ...
}
```
* The order can be used to determine, if an insert happened before or after a remove.
* Note that by default, lruRemoves and clearRemoves are empty (usually these removes are not of any interest)
* In case of a cache delete, the corresponding entity might not have been in the cache (being removed in a clear or by LRU logic).
    * Thus, deleteRemoves only contain the key of the deleted entity.
    * For the same reason, the delete method cannot be used with an alternate key, because there would be no way to tell if the given argument is key or alternate key

## Performance <a name="section-performance"></a>
* Compared to a native Javascript Map, the LRU logic implies performance impact on get, set and delete. It's just the price to pay for having a LRU cache.
* Also compared to LRU maps that do not support alternate keys, there is a performance impact on get in case of cache misses.
    * See [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/performance-report.html)
    * However, get, set and delete are still O(1). (setMaxSize has O(size-newMaxSize), if size>newMaxSize)
* Compared to a LRU cache without cache events, there is additional performance impact on get, set and delete.
    * Again see [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/f5eded25881c8c2e143d7338b427fe28a223d2b9/performance-report.html)
    * However, if you are caching for performance, then because the fetching of values is significantly more time consuming. So whether you save 400ms or only 399ms hardly makes a difference here.
    * If you are not caching for performance reasons, but to have the change events, well than again it's just the price to pay for the event handling.

## Questions <a name="section-questions"></a>

### Why can I not differentiate between insert and update in the change events?
Garbage collected languages without weak references make the use of some patterns impossible. Two of these patterns affect this library:
1. One cannot implement an instance-cache, hence a cache that ensures to not discard an entry, as long as this entry is referenced from somewhere outside the cache. If upon calling the set method, the value is not already in the cache, there is no way to tell, if it was never there, or if it was there an has been LRU discarded.
2. One cannot implement event registries that reference listeners only weakly. Thus, it is up to the consumker of this library to ensure that no memory leaks occur due to not unregistered event listeners.

### Why can I not just have a sorted list with all changes in the cache event, instead of sorting myself by order attribute?
* I just did not want to further increase the size of change object by another array holding redundant data.
* However, maybe in a future version, I will make it configurable to optionally include such a list.

## Roadmap <a name="section-roadmap"></a>

### 3.2.x
* Fix issues that might occur
* Improve README
* Bring test coverage two 100%
* Add further performance tests

### 3.3.0
* Add option to use LruMap instead of LruCache (the LruMap is a currently not exported pure LRU cache, while the LruCache is a wrapper adding the event handling)

### 3.4.0
* Make shape and content of change events configurable (with the current shape being used as default).
