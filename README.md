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

## Srcset Support

This plugin now supports automatic generation of `srcset` attributes for responsive images. This is particularly useful when using image CDNs that support query parameters for resizing (like `https://demo.bitiful.com/girl.jpeg?w=200`).

```yaml
lazy_load:
  enable: true
  fallback: false
  width_height: true
  srcset: true  # Enable srcset generation (default: true)
  srcset_widths:  # Define srcset widths
    - 200
    - 400
    - 600
    - 800
    - 1200
  srcset_sizes_enable: false  # Enable sizes attribute (default: false)
  srcset_sizes: "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
```

### Srcset Configuration Options

- **`srcset`**: Enable/disable srcset generation (default: `true`)
- **`srcset_widths`**: Array of widths for srcset generation
- **`srcset_sizes_enable`**: Enable/disable sizes attribute (default: `false`)
- **`srcset_sizes`**: The sizes attribute value (only used when `srcset_sizes_enable` is `true`)

### Why sizes attribute is optional

The `sizes` attribute tells the browser how much space the image will occupy in the layout:

- **Without sizes**: Browser assumes image takes 100% viewport width and may download larger images
- **With sizes**: Browser knows the actual display size and downloads the optimal image

For most use cases, you can use `srcset` without `sizes` and let the browser choose. Only enable `sizes` if you want precise control over image selection.

### Example Output

Original image tag:

```html
<img src="https://demo.bitiful.com/girl.jpeg" alt="example">
```

After processing:

```html
<img loading="lazy" 
     srcset="https://demo.bitiful.com/girl.jpeg?w=200 200w, 
             https://demo.bitiful.com/girl.jpeg?w=400 400w,
             https://demo.bitiful.com/girl.jpeg?w=600 600w,
             https://demo.bitiful.com/girl.jpeg?w=800 800w,
             https://demo.bitiful.com/girl.jpeg?w=1200 1200w"
     sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
     src="https://demo.bitiful.com/girl.jpeg" 
     alt="example">
```

### Supported Image CDNs

Currently supports:

- demo.bitiful.com
- cdn.jsdelivr.net  
- unpkg.com

You can easily add more CDN domains by modifying the `supportedDomains` array in `lib/replace.js`.

## Complete Configuration

```yaml
lazy_load:
  enable: true
  all: true           # Apply to all pages (default: false, only posts)
  fallback: true      # Add lazysizes fallback (default: true)
  width_height: true  # Add width/height for local images (default: true)
  srcset: true        # Enable srcset generation (default: true)
  srcset_widths:      # Srcset breakpoints
    - 200
    - 400
    - 600
    - 800
    - 1200
  srcset_sizes: "(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px"
```
