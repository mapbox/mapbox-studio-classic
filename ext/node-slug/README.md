# [slug](https://github.com/dodo/node-slug)

slugifies every string, even when it contains unicode!

Make strings url-safe.

- respecting [RFC 3986](https://tools.ietf.org/html/rfc3986)
- Comprehensive tests
- No dependencies (except the unicode table)
- Not in coffee-script (except the tests lol)
- Coerces foreign symbols to their english equivalent
- Works in browser (window.slug) and AMD/CommonJS-flavoured module loaders (except the unicode symbols unless you use browserify but who wants to download a ~2mb js file, right?)

```
npm install slug
```

```
bower install slug
```

## example

```javascript
var slug = require('slug')
var print = console.log.bind(console, '>')

print(slug('i ♥ unicode'))
// > i-love-unicode

print(slug('unicode ♥ is ☢')) // yes!
// > unicode-love-is-radioactive

print(slug('i ♥ unicode', '_')) // If you prefer something else then `-` as seperator
// > i_love_unicode

slug.charmap['♥'] = 'freaking love' // change default charmap or use option {charmap:{…}} as 2. argument
print(slug('I ♥ UNICODE').toLowerCase()) // If you prefer lower case
// > i-freaking-love-unicode

print(slug('i <3 unicode'))
// > i-love-unicode
```

## options

```javascript
// options is either object or replacement (sets options.replacement)
slug('string', [{options} || 'replacement']);
```

```javascript
slug.defaults.mode ='pretty';
slug.defaults.modes['rfc3986'] = {
    replacement: '-',      // replace spaces with replacement
    symbols: true,         // replace unicode symbols or not
    remove: null,          // (optional) regex to remove characters
    charmap: slug.charmap, // replace special characters
    multicharmap: slug.multicharmap // replace multi-characters
};
slug.defaults.modes['pretty'] = {
    replacement: '-',
    symbols. true,
    remove: /[.]/g,
    charmap: slug.charmap,
    multicharmap: slug.multicharmap
};
```

[![Build Status](https://secure.travis-ci.org/dodo/node-slug.png)](http://travis-ci.org/dodo/node-slug)

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/dodo/node-slug/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

