// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Set <base href> and SAPTARISHI_DEPLOY_PREFIX for relative assets.
 * GitHub Pages: /saptarishi/frontend/html/kundali.html → prefix /saptarishi
 * Docker clean URLs: /kundali → base /frontend/html/ (inline bootstrap in HTML runs first)
 */
(function () {
  var path = location.pathname;
  var marker = "/frontend/html/";
  var idx = path.indexOf(marker);
  var prefix = idx >= 0 ? path.slice(0, idx) : "";
  if (idx < 0 && !/^\/(kundali|auspicious|remedy|profile|login)?\/?$/.test(path)) {
    return;
  }
  globalThis.SAPTARISHI_DEPLOY_PREFIX = prefix;
  if (document.querySelector("base")) return;
  var base = document.createElement("base");
  base.href = prefix + marker;
  document.head.appendChild(base);
})();
