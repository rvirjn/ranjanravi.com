<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# Android-only UI

These files belong to the **Android app**, not the desktop website.

| File | Role |
|---|---|
| `native-app.css` | App chrome and screens (home, dasha, horoscope, do's & don't) |
| `native-app.js` | Injects that UI into the live site **inside the WebView only** |

The Capacitor app copies the same files into:

`backend/mobile/android/app/src/main/assets/`

`NativeShellInjector` injects them on page load. Desktop `frontend/html`, `frontend/js`, `frontend/style`, and `frontend/utils` stay unchanged.

After editing here, copy into Android assets:

```powershell
Copy-Item frontend\mobile\android\native-app.css ..\..\saptarishi\backend\mobile\android\app\src\main\assets\native-app.css
Copy-Item frontend\mobile\android\native-app.js  ..\..\saptarishi\backend\mobile\android\app\src\main\assets\native-app.js
```

Paths assume this folder is `ranjanravi.com/saptarishi/frontend/mobile/android` and the Android project is `saptarishi/backend/mobile/android`.
