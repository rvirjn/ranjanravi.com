// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * iPhone overlay: safe-area class, StoreKit bridge, pull-to-refresh no-op.
 * Native chrome (home, dock, menu) still comes from mobile/android/native-app.js.
 */
(function nativeIos(global) {
  const isIosNative =
    document.documentElement.classList.contains("saptarishi-native-ios") ||
    (/SaptarishiNativeApp/i.test(navigator.userAgent || "") &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent || ""));
  if (!isIosNative) return;

  document.documentElement.classList.add("saptarishi-native-app", "saptarishi-native-ios");

  const PRODUCT_BY_AMOUNT = {
    99: "com.ranjanravi.saptarishi.wallet.99",
    500: "com.ranjanravi.saptarishi.wallet.500",
    599: "com.ranjanravi.saptarishi.wallet.599"
  };

  function productIdForAmount(amountInr) {
    const amount = Math.round(Number(amountInr) || 0);
    return PRODUCT_BY_AMOUNT[amount] || `com.ranjanravi.saptarishi.wallet.${amount}`;
  }

  function postIap(payload) {
    try {
      const handler = global.webkit && global.webkit.messageHandlers && global.webkit.messageHandlers.saptarishiIap;
      if (handler && typeof handler.postMessage === "function") {
        handler.postMessage(payload);
        return true;
      }
    } catch {
      /* Simulator without native bridge */
    }
    return false;
  }

  function buyWalletCredit(amountInr) {
    const productId = productIdForAmount(amountInr);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        global.removeEventListener("saptarishi-ios-iap", onEvent);
        reject(new Error("Apple purchase timed out. Try again."));
      }, 120000);
      function onEvent(event) {
        const detail = event.detail || {};
        if (detail.productId && detail.productId !== productId) return;
        clearTimeout(timer);
        global.removeEventListener("saptarishi-ios-iap", onEvent);
        if (detail.ok) resolve(detail);
        else reject(new Error(detail.error || "Purchase did not complete."));
      }
      global.addEventListener("saptarishi-ios-iap", onEvent);
      const sent = postIap({ action: "buy", productId, amountInr: Number(amountInr) || 0 });
      if (!sent) {
        clearTimeout(timer);
        global.removeEventListener("saptarishi-ios-iap", onEvent);
        reject(
          new Error(
            "In-App Purchase is not available in this build. Open the app from Xcode on a Mac after your Apple Developer account is ready."
          )
        );
      }
    });
  }

  global.SaptarishiIos = {
    setPullToRefreshEnabled() {
      /* iOS uses WKWebView bounce off; no Android-style swipe refresh. */
    }
  };

  global.SaptarishiIosIap = {
    productIdForAmount,
    buyWalletCredit
  };

  function pageHref(file) {
    const path = String(location.pathname || "");
    const marker = "/frontend/html/";
    const at = path.indexOf(marker);
    const pre = at >= 0 ? path.slice(0, at) : "";
    const routes = {
      "kundali.html": "/kundali",
      "remedy.html": "/remedy",
      "future.html": "/future",
      "auspicious.html": "/auspicious",
      "profile.html": "/profile"
    };
    if (at < 0 && routes[file]) return pre + routes[file];
    return `${pre}/frontend/html/${file}`;
  }

  function currentScreen() {
    const path = String(location.pathname || "").toLowerCase();
    if (path.includes("remedy")) return "remedy";
    if (path.includes("future")) return "future";
    if (path.includes("auspicious")) return "auspicious";
    if (path.includes("kundali") || path.endsWith("/") || path === "") return "kundali";
    return "";
  }

  function applyIosDock() {
    const dock = document.querySelector(".app-dock .app-tabbar");
    if (!dock || dock.dataset.iosDock === "1") return;
    const page = currentScreen();
    const tabs = [
      ["kundali", "Kundali", "kundali.html"],
      ["remedy", "Remedy", "remedy.html"],
      ["future", "Prediction", "future.html"],
      ["auspicious", "Muhurta", "auspicious.html"]
    ];
    dock.innerHTML = tabs
      .map(
        ([id, label, file]) =>
          `<a class="app-tab${page === id ? " is-on" : ""}" data-app-screen="${id}" href="${pageHref(file)}"><span class="app-tab__label">${label}</span></a>`
      )
      .join("");
    dock.dataset.iosDock = "1";
  }

  function openAuth(tab) {
    const modal = global.SaptarishiAuthModal;
    if (modal && modal.open) {
      modal.open({ tab, required: false });
      return;
    }
    if (global.SaptarishiAuth && global.SaptarishiAuth.ensureAuth) {
      global.SaptarishiAuth.ensureAuth({ tab, required: true });
    }
  }

  function applyIosHeader() {
    const header = document.querySelector(".site-header");
    const meta = header && header.querySelector(".site-header__meta");
    if (!meta) return;
    const user = global.SaptarishiAuth && global.SaptarishiAuth.getUser && global.SaptarishiAuth.getUser();
    const avatar = header.querySelector("#app-profile-btn");
    if (avatar && avatar.dataset.iosProfile !== "1") {
      avatar.dataset.iosProfile = "1";
      avatar.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.location.href = pageHref("profile.html");
        },
        true
      );
    }
    if (avatar) avatar.hidden = !user;
    let registerBtn = meta.querySelector("#ios-register-btn");
    let loginBtn = meta.querySelector("#ios-login-btn");
    if (!registerBtn) {
      registerBtn = document.createElement("button");
      registerBtn.type = "button";
      registerBtn.id = "ios-register-btn";
      registerBtn.className = "app-ios-auth app-ios-auth--register";
      registerBtn.textContent = "Register";
      registerBtn.addEventListener("click", () => openAuth("register"));
      meta.appendChild(registerBtn);
    }
    if (!loginBtn) {
      loginBtn = document.createElement("button");
      loginBtn.type = "button";
      loginBtn.id = "ios-login-btn";
      loginBtn.className = "app-ios-auth app-ios-auth--login";
      loginBtn.textContent = "Login";
      loginBtn.addEventListener("click", () => openAuth("login"));
      meta.appendChild(loginBtn);
    }
    registerBtn.hidden = !!user;
    loginBtn.hidden = !!user;
  }

  function showIosBirthTabs() {
    document.querySelectorAll(".kundali-tabs, #birth-form, #remedy-form").forEach((el) => {
      el.hidden = false;
    });
  }

  function applyIosMenu() {
    const scroll = document.querySelector("#app-drawer .app-drawer-scroll");
    if (!scroll || scroll.dataset.iosMenu === "1") return;
    const items = [
      ["kundali.html", "Kundali"],
      ["remedy.html", "Remedy"],
      ["future.html", "Prediction"],
      ["auspicious.html", "Muhurta"],
      ["profile.html", "Profile"],
      ["privacy.html", "Privacy"]
    ];
    scroll.innerHTML = `<div class="app-menu-list">${items
      .map(
        ([file, label]) =>
          `<a class="app-menu-item" href="${pageHref(file)}"><span>${label}</span></a>`
      )
      .join("")}</div>`;
    scroll.dataset.iosMenu = "1";
  }

  function applyIosChrome() {
    applyIosDock();
    applyIosHeader();
    showIosBirthTabs();
    applyIosMenu();
  }

  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest && event.target.closest("#app-menu-btn")) {
        setTimeout(applyIosMenu, 0);
      }
    },
    true
  );
  applyIosChrome();
  document.addEventListener("DOMContentLoaded", applyIosChrome);
  global.addEventListener("saptarishi-auth-changed", () => setTimeout(applyIosChrome, 0));
  let tries = 0;
  const timer = setInterval(() => {
    applyIosChrome();
    tries += 1;
    if (tries > 20) clearInterval(timer);
  }, 300);
})(window);
