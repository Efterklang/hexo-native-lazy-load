module.exports = function addProgressive(html) {
    // 避免重复注入
    if (html.includes('data-progressive-loader="1"')) return html;

    const style = `
<style data-progressive-loader="1">
img.progressive { filter: blur(12px); transition: filter .3s ease; }
img.progressive.progressive-loaded { filter: none; }
</style>`;

    const script = `
<script data-progressive-loader="1">
(function(){
  var $$ = function(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  var imgs = $$('img[data-progressive="1"]');
  if (!imgs.length) return;

  function markDone(img){
    img.classList.add('progressive-loaded');
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.removeAttribute('data-progressive');
  }

  async function activate(img){
    var realSrc = img.getAttribute('data-src');
    var realSet = img.getAttribute('data-srcset');

    // 兜底：先监听 load 再设置属性
    function onLoad(){
      markDone(img);
      img.removeEventListener('load', onLoad);
    }
    img.addEventListener('load', onLoad, { once: true });

    if (realSet) img.setAttribute('srcset', realSet);
    if (realSrc) img.setAttribute('src', realSrc);

    // 缓存命中
    if (img.complete && img.naturalWidth > 0) {
      markDone(img);
      img.removeEventListener('load', onLoad);
      return;
    }

    // 现代浏览器：decode 更可靠（包含 srcset 的 currentSrc）
    if (img.decode) {
      try {
        await img.decode();
        markDone(img);
        img.removeEventListener('load', onLoad);
      } catch(e) {
        // ignore，等待 load 事件
      }
    }
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          activate(e.target);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '200px 0px' });
    imgs.forEach(function(img){ io.observe(img); });
  } else {
    // 降级：直接激活
    imgs.forEach(activate);
  }
})();
</script>`;

    if (html.includes('</body>')) return html.replace('</body>', style + script + '</body>');
    return html + style + script;
}
