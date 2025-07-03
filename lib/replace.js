const regex = /<img[^>]+src=\"(.+?)\"[^>]*>/gm;
const path = require("path");
const fs = require("fs");
const sizeOf = require("image-size");

// 生成 srcset 的函数
const generateSrcset = (src, widths) => {
  // 支持的图床域名列表，可以根据需要扩展
  const supportedDomains = [
    's3.bitiful.net',
    // 可以添加更多支持参数的图床
  ];

  const isSupportedDomain = supportedDomains.some(domain => src.includes(domain));

  if (!isSupportedDomain) {
    return '';
  }

  return widths.map(width => {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width} ${width}w`;
  }).join(', ');
};

const replace = (html, base, config = {}) => {
  const srcsetConfig = {
    enable: config.srcset !== false, // 默认启用 srcset
    widths: config.srcset_widths || [200, 400, 600, 800, 1200],
    enableSizes: config.srcset_sizes_enable || false, // 默认不启用 sizes 属性
    sizes: config.srcset_sizes || '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px'
  };

  return html.replace(regex, (s, fname) => {
    if (s.indexOf('loading="lazy"') !== -1) {
      return s;
    }

    let result = s;
    const p = path.join(base, fname);

    // 添加 loading="lazy" 和尺寸信息
    if (base !== "" && fs.existsSync(p)) {
      const dimensions = sizeOf(p);
      result = (
        s.substring(0, 4) +
        ' loading="lazy"' +
        ` width="${dimensions.width}"` +
        ` height="${dimensions.height}"` +
        s.substring(4, s.length)
      );
    } else {
      result = s.substring(0, 4) + ' loading="lazy"' + s.substring(4, s.length);
    }

    // 添加 srcset 支持
    if (srcsetConfig.enable) {
      const srcset = generateSrcset(fname, srcsetConfig.widths);
      if (srcset) {
        // 检查是否已经有 srcset 属性
        if (result.indexOf('srcset=') === -1) {
          const srcsetAttr = ` srcset="${srcset}"`;
          // 只有在启用 sizes 时才添加 sizes 属性
          const sizesAttr = (srcsetConfig.enableSizes && result.indexOf('sizes=') === -1)
            ? ` sizes="${srcsetConfig.sizes}"`
            : '';
          result = result.substring(0, 4) + srcsetAttr + sizesAttr + result.substring(4);
        }
      }
    }

    return result;
  });
};

module.exports = replace;
