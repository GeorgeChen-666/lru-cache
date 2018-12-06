# lru-cache
A Javascript LRU-cache for node and/or browser, featuring:
* LRU cache logic
* Alternate keys
* Singleton caches per value type
* Event registry for cache change events
* No dependencies

## Table of Contents
1. [Installation](#section-installation)
2. [Motivation](#section-motivation)
3. [Basic Usage](#section-basic-usage)
4. [Quality](#section-quality)
5. [Develop](#section-develop)
6. [Detailed Usage](#section-detailed-usage)
7. [Performance](#section-performance)
8. [Questions](#section-questions)
9. [Roadmap](#section-roadmap)


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
    * [JSDoc](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/docs/index.html)

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
    * [JSDoc](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/docs/index.html)

## Quality <a name="section-quality"></a>
* [Test results](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/test-report.html)
* [Test coverage](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/coverage/index.html)
* [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/performance-report.html)

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
`delete` | keyOrAlternateKey: string | wasInCache: boolean | Remove an entry from the cache. A corresponding cache event will be dispatched.
`dispatchClearRemoves` | newValue: boolean | undefined | Set whether a cache clear should dispatch a cache event (default: false).
`dispatchLruRemoves` | newValue: boolean | undefined | Set whether a LRU-remove (entry being removed due to exceeded cache size) should dispatch a cache event (default: false).
`forEach` | callback: function | undefined | Iterate over the cache from olodest to newest value. Callback receives cache entry as argument, being an object with `key`, `value` and `alternateKeys`.
`get` | keyOrAlternateKey: string | value | get cached value or undefined. The returned value will be made the newest value in the cache.
`getEntries` | none | Array | Returns an array with all cache entries, order from oldest to newest.
`getMaxSize` | none | Int | Returns the current max size of the cache.
`getSize` | none | Int | Returns the number of entries in the cache.
`getValueType` | none | string | Returns the value type of the cache.
`getWithoutLruChange` | keyOrAlternateKey: string | value | Like `get`, but without making the entry the newest in the cache.
`set` | keyValueAlternateKeys: object | undefined | Insert or update a value in the cache. The argument must be an object with `key` and `value`. Optionally it can also have `alternateKeys`, being string or array of strings. After set, the value will be the newest in the cache. Dispatches a corresponding cache event. If an insert exceeds the max cache size and dispatchLruRemoves is set true, it will be included in the event.
`setAll` | Array\[keyValueAlternateKeys\] | undefined | Like `set`, but for an array of cache entries. Leading to a single cache event.
`setAllAsync` | Array\[keyValueAlternateKeys\] | Promise | Like `setAll`, but performing insert and event dispatch in another event loop, resolving the returned promise afterwards.
`set` | keyValueAlternateKeys: object | Promise | Like `set`, but performing insert and event dispatch in another event loop, resolving the returned promise afterwards.
`setMaxSize` | newMaxSize | undefined | Change the max size of the cache (default: 500). If the new maxSize is less than the old and this leads to LRU-removes and dispatchLruRemoves is set true, then a single cache event will be dispatched.


### Cache Events <a name="cache-events-detail"></a>
WIP

## Performance <a name="section-performance"></a>
* Compared to a native Javascript Map, the LRU logic implies performance impact on get, set and delete. It's just the price to pay for having a LRU cache.
    * See [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/performance-report.html)
    * However, the methods are still O(1). (Only setMaxSize has O(size-newMaxSize), if size>newMaxSize)
* Compared to a LRU cache without cache events, the is additional performance impact on get, set and delete.
    * Again see [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/a03482ca34b4dd7decf6d6057e56c8a8cee7fb6e/performance-report.html)
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

### 2.0.x
* Fix issues that might occur
* Fill in missing parts of this README
* Bring test coverage two 100%
* Add further performance tests

### 2.1.0
* Add option to use LruMap instead of LruCache (the LruMap is a currently not exported pure LRU cache, while the LruCache is a wrapper adding the event handling)

### 2.2.0
* Make shape and content of change events configurable (with the current shape being used as default).
