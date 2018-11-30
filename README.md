# lru-cache
A Javascript LRU-cache for node and/or browser, featuring:
* LRU cache logic
* Singleton caches per value type
* Event registry for cache change events

## Installation
```javascript
npm install --save @swarmy/lru-cache
```

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

## Develop
```javascript
git clone https://github.com/gneu77/lru-cache.git
cd lru-cache
npm install
// no you can do:
npm run build
npm run test
npm run generate-doc
```

## Detailed Usage

### Caching <a name="caching-detail"></a>
WIP

### Cache Events
WIP