const regex = /<img[^>]+src=\"(.+?)\"[^>]*>/gm;
const path = require("path");
const fs = require("fs");
const sizeOf = require("image-size");

// 渐进式加载支持的域名
const SUPPORTED_PROGRESSIVE_DOMAINS = [
  "s3.bitiful.net",
];

const isSupportedProgressiveDomain = (src) =>
  SUPPORTED_PROGRESSIVE_DOMAINS.some((d) => src.includes(d));

const buildPlaceholderUrl = (src, extraParams) => {
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}${extraParams}`;
};

// 从 URL 中移除指定占位参数（例如 q=1&blur=150&fmt=avif）
// 仅根据 key 移除（值无论为多少都会移除），避免真实图也被这些低质参数污染
const stripParams = (src, paramsString) => {
  if (!paramsString) return src;
  try {
    // 解析要移除的 key 列表
    const keys = paramsString
      .split('&')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.split('=')[0]);

    // 支持相对与绝对 URL
    const hasProtocol = /^https?:\/\//i.test(src);
    const url = hasProtocol ? new URL(src) : new URL(src, 'http://local');
    const sp = url.searchParams;
    keys.forEach(k => sp.delete(k));
    const pathname = url.pathname + (sp.toString() ? `?${sp.toString()}` : '');
    return hasProtocol ? `${url.origin}${pathname}` : pathname;
  } catch (e) {
    // 保守降级：手工移除这些 key
    const [base, q = ''] = src.split('?');
    if (!q) return src;
    const toRemove = new Set(
      paramsString
        .split('&')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => s.split('=')[0])
    );
    const kept = q
      .split('&')
      .filter(p => p && !toRemove.has(p.split('=')[0]))
      .join('&');
    return kept ? `${base}?${kept}` : base;
  }
};

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
    widths: config.srcset_widths || [200, 400, 600, 800, 1200, 2000],
    enableSizes: config.srcset_sizes_enable || false, // 默认不启用 sizes 属性
    sizes: config.srcset_sizes || '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px'
  };

  const progressiveCfg = config.progressive_img || {};
  const progressiveEnabled = progressiveCfg.enable === true;
  const placeholderParams = progressiveCfg.placeholder_params || 'q=30&blur=150&fmt=avif';

  return html.replace(regex, (s, fname) => {
    const progressiveActive = progressiveEnabled && isSupportedProgressiveDomain(fname);
    if (s.indexOf('loading="lazy"') !== -1 && !progressiveActive) {
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

    // 已有的 srcset / sizes（如果存在）
    const existingSrcsetMatch = result.match(/\s+srcset="([^"]*)"/);
    const existingSizesMatch = result.match(/\s+sizes="([^"]*)"/);
    let existingSrcset = existingSrcsetMatch ? existingSrcsetMatch[1] : '';

    // 生成 srcset（当启用且不存在已有 srcset）
    let generatedSrcset = '';
    if (srcsetConfig.enable && !existingSrcset) {
      generatedSrcset = generateSrcset(fname, srcsetConfig.widths);
    }

    if (progressiveActive) {
      // progressive：使用动态占位图，真图与 srcset 存到 data-*
      // 移除已有 srcset 避免立即加载
      if (existingSrcset) {
        result = result.replace(/\s+srcset="[^"]*"/, '');
      }

      // 真实图 URL：去掉占位参数（如 q=1&blur=150&fmt=avif）
      const cleanUrl = stripParams(fname, placeholderParams);

      // 替换 src 为占位图（基于干净 URL 再添加占位参数，避免参数重复）
      const placeholderUrl = buildPlaceholderUrl(cleanUrl, placeholderParams);
      result = result.replace(/src="(.+?)"/, `src="${placeholderUrl}"`);

      // 写入 data-src / data-srcset / data-progressive
      // 如果已有 srcset，逐个去掉占位参数；否则基于 cleanUrl 生成
      let finalSrcset = '';
      if (existingSrcset) {
        const keys = new Set((placeholderParams || '').split('&').map(s => s.split('=')[0]));
        finalSrcset = existingSrcset
          .split(',')
          .map(part => part.trim())
          .filter(Boolean)
          .map(part => {
            const spaceIdx = part.lastIndexOf(' ');
            if (spaceIdx === -1) {
              // 无描述符，纯 URL
              return stripParams(part, placeholderParams);
            }
            const url = part.slice(0, spaceIdx);
            const desc = part.slice(spaceIdx + 1);
            const cleaned = stripParams(url, placeholderParams);
            return `${cleaned} ${desc}`;
          })
          .join(', ');
      } else {
        finalSrcset = generateSrcset(cleanUrl, srcsetConfig.widths);
      }
      const dataAttrs = [
        ` data-src="${cleanUrl.replace(/\"/g, '&quot;')}"`,
      ];
      if (finalSrcset) {
        dataAttrs.push(` data-srcset="${finalSrcset.replace(/\"/g, '&quot;')}"`);
      }
      dataAttrs.push(' data-progressive="1"');

      // sizes：存在就保留；如未存在且开启了 sizes，就添加
      const sizesAttr = existingSizesMatch
        ? ''
        : (srcsetConfig.enableSizes ? ` sizes="${srcsetConfig.sizes}"` : '');

      // class 追加 progressive
      if (result.indexOf(' class=') === -1) {
        dataAttrs.push(' class="progressive"');
      } else {
        result = result.replace(/class="([^"]*)"/, (m, cls) => `class="${cls} progressive"`);
      }

      // 注入到 <img 后
      result = result.substring(0, 4) + dataAttrs.join('') + sizesAttr + result.substring(4);
    } else {
      // 非 progressive：正常添加/保留 srcset
      const finalSrcset = existingSrcset || generatedSrcset;
      if (srcsetConfig.enable && finalSrcset) {
        if (result.indexOf('srcset=') === -1) {
          const srcsetAttr = ` srcset="${finalSrcset}"`;
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
