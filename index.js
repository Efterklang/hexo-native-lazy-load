const path = require("path");
const replace = require("./lib/replace");
const addScript = require("./lib/add_lazysizes");
const addProgressive = require("./lib/add_progressive");
const log = hexo.log;

if (!hexo.config.lazy_load || !hexo.config.lazy_load.enable || process.env.CI !== 'true') {
  log.info("Skip add loading=lazy...")
  return;
}
if (hexo.config.lazy_load.all) {
  // default only posts
  log.info("Add lazy load attribute to all image");
  hexo.extend.filter.register(
    "after_render:html",
    function (html) {
      html = replace(html, "", hexo.config.lazy_load);
      return html;
    },
    15
  );
} else {
  log.info("Add lazy load attribute to all post");
  hexo.extend.filter.register(
    "after_post_render",
    function (data) {
      if (
        hexo.config.post_asset_folder === true &&
        hexo.config.lazy_load.width_height !== false
      ) {
        data.content = replace(
          data.content,
          path.join(
            hexo.source_dir,
            data.source.substring(0, data.source.length - 3)
          ),
          hexo.config.lazy_load
        );
      }
      data.content = replace(data.content, "", hexo.config.lazy_load);
      return data;
    },
    15
  );
}
if (hexo.config.lazy_load.fallback !== false) {
  // default enable
  log.info("Add fallback lazy load using lazysizes");
  hexo.extend.filter.register("after_render:html", addScript, 25);
}

// progressive runtime 注入（在所有 HTML 渲染后执行）
if (
  hexo.config.lazy_load &&
  hexo.config.lazy_load.progressive_img &&
  hexo.config.lazy_load.progressive_img.enable === true
) {
  log.info("Enable progressive image loader");
  // 选择在 24 优先于 lazysizes(25)，确保占位图和 data-* 已就位
  hexo.extend.filter.register("after_render:html", addProgressive, 24);
}
