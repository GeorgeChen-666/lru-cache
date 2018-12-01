# lru-cache
A Javascript LRU-cache for node and/or browser, featuring:
* LRU cache logic
* Alternate keys
* Singleton caches per value type
* Event registry for cache change events

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
    await fetchUser(userId);
}
```
* For the same value type (here "User"), getCache will always return the same cache instance.
* For detailed description of all cache methods, have a look at
    * [Detailed Usage](#caching-detail)
    * [JSDoc](http://htmlpreview.github.com/?https://github.com/gneu77/lru-cache/blob/master/docs/index.html)

### Cache Events
WIP

## Quality
* [Test results](http://htmlpreview.github.com/?https://github.com/gneu77/lru-cache/blob/master/test-report.html)
* [Test coverage](http://htmlpreview.github.com/?https://github.com/gneu77/lru-cache/blob/master/coverage/index.html)
* [Performance tests](http://htmlpreview.github.com/?https://github.com/gneu77/lru-cache/blob/master/performance-report.html)

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

### Cache Events
WIP