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
})(window);
