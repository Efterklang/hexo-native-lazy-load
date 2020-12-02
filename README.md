# hexo-native-lazy-load

As is known, Chrome76 start to support native lazy load. And Firefox also has a open bug for this feature.

For more information about native lazy load go ahead and see [here](https://web.dev/native-lazy-loading)

This plugin add lazy load attribute to img tag.

## Installation

```bash
npm install hexo-native-lazy-load --save
```
## Usage

Add following setting to the site config file. That mean the `_config,yml` in root directory.

```yaml
lazy_load: #native load
  enable: true
```

The plugin only add attribute in post page by default. To add attribute in other page as well set `lazy_load.all` to true

```yaml
lazy_load:
  enable: true
  all: true
```

By default it will add fallback polyfill use lazysizes. It can be disable by setting `lazy_load.fallback` to false
It will also automatically add the width and height attribute to image tag when you are using `post_asset__folder` and put the image there. It can be disabled by setting `lazy_load.width_height` to false.

```yaml
lazy_load:
  enable: true
  fallback: false
  width_height: true
```
