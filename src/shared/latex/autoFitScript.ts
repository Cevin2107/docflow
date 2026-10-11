/**
 * Client-side Auto-Fit script executed inside Chromium or Preview DOM.
 * Measures content width vs container and scales down elements using CSS zoom
 * to preserve page-break geometry without horizontal overflow.
 */
export const AUTO_FIT_SCRIPT = `
(function() {
  function fitElements() {
    var targets = document.querySelectorAll('.docflow-autofit-target');
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      // Reset zoom to measure natural scrollWidth
      el.style.zoom = '1';
      var parent = el.parentElement || el;
      var availableWidth = parent.clientWidth;

      // Check inner table / math width
      var inner = el.querySelector('.katex-html') || el.querySelector('.mtable') || el.querySelector('table') || el;
      var naturalWidth = Math.max(el.scrollWidth, inner.scrollWidth || 0);

      if (availableWidth > 0 && naturalWidth > availableWidth + 2) {
        var ratio = availableWidth / naturalWidth;
        var MIN_RATIO = 0.55;

        if (ratio >= MIN_RATIO) {
          el.style.zoom = ratio.toFixed(4);
        } else {
          el.style.zoom = MIN_RATIO.toString();
          var parentWrap = el.closest('.docflow-autofit-wrap') || el.parentElement;
          if (parentWrap && !parentWrap.querySelector('.docflow-fit-warning')) {
            var warn = document.createElement('div');
            warn.className = 'docflow-fit-warning';
            warn.innerText = '⚠️ Bảng/công thức rất rộng (đã co nhỏ). Gợi ý: Hãy chọn hướng trang Ngang (Landscape) để hiển thị tối ưu.';
            parentWrap.appendChild(warn);
          }
        }
      }
    }
  }

  // Expose for external re-computation
  window.docflowFitElements = fitElements;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fitElements);
  } else {
    fitElements();
  }
  window.addEventListener('resize', fitElements);
})();
`;
