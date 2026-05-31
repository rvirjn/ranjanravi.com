// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Detect subdirectory deploy prefix (e.g. GitHub Pages /saptarishi/) and set <base href>. */
(function () {
  var path = location.pathname;
  var marker = "/frontend/html/";
  var idx = path.indexOf(marker);
  var prefix = idx >= 0 ? path.slice(0, idx) : "";
  globalThis.SAPTARISHI_DEPLOY_PREFIX = prefix;
  var base = document.createElement("base");
  base.href = prefix + marker;
  document.head.appendChild(base);
})();
