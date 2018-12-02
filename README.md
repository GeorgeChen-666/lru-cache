# lru-cache
A Javascript LRU-cache for node and/or browser, featuring:
* LRU cache logic
* Alternate keys
* Singleton caches per value type
* Event registry for cache change events
* No dependencies

## Installation
```javascript
npm install --save @swarmy/lru-cache
```

## Motivation
There are for sure more than a handful of different LRU-cache implementations flying around on npm.

What makes this one unique is that it features the use of alternate keys and an event registry for cache change events.

Alternate keys are useful in situations where certain cache consumers have no access to the primary key, or would have to construct or fetch the primary key in advance.

Cache events are useful to have a central point to handle object changes in an application with multiple models. E.g. register all models as listeners and ensure that all entity updates and deletes go over the cache. Than you can ensure that each update or delete of a certain entity, be it due to a change coming from a certain controller or due to a server push, will keep all models in sync. I have applications where I have no need to cache for performance reasons, but still use this pattern to keep my Redux state up to date (by having a single cache listener that dispatches a corresponding action).

## Basic Usage

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
    * [JSDoc](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/docs/index.html)

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
    * [JSDoc](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/docs/index.html)

## Quality
* [Test results](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/test-report.html)
* [Test coverage](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/coverage/index.html)
* [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/performance-report.html)

## Develop
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

## Detailed Usage

### Caching <a name="caching-detail"></a>
WIP

### Cache Events <a name="cache-events-detail"></a>
WIP

## Performance
* Compared to a native Javascript Map, the LRU logic implies performance impact on get, set and delete. It's just the price to pay for having a LRU cache.
    * See [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/performance-report.html)
    * However, the methods are still O(1). (Only setMaxSize has O(size-newMaxSize), if size>newMaxSize)
* Compared to a LRU cache without cache events, the is additional performance impact on get, set and delete.
    * Again see [Performance tests](https://rawcdn.githack.com/gneu77/lru-cache/a58e345708cb07d4f24434eba9ea4760d61a264b/performance-report.html)
    * However, if you are caching for performance, then because the fetching of values is significantly more time consuming. So whether you save 400ms or only 399ms hardly makes a difference here.
    * If you are not caching for performance reasons, but to have the change events, well than again it's just the price to pay for the event handling.

## Questions

### Why can I not differentiate between insert and update in the change events?
Garbage collected languages without weak references make the use of some patterns impossible. Two of these patterns affect this library:
1. One cannot implement an instance-cache, hence a cache that ensures to not discard an entry, as long as this entry is referenced from somewhere outside the cache. If upon calling the set method, the value is not already in the cache, there is no way to tell, if it was never there, or if it was there an has been LRU discarded.
2. One cannot implement event registries that reference listeners only weakly. Thus, it is up to the consumker of this library to ensure that no memory leaks occur due to not unregistered event listeners.

### Why can I not just have a sorted list with all changes in the cache event, instead of sorting myself by order attribute?
* I just did not want to further increase the size of change object by another array holding redundant data.
* However, maybe in a future version, I will make it configurable to optionally include such a list.
