<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# Android-only UI

These files belong to the **Android app**, not the desktop website.

| File | Role |
|---|---|
| `native-app.css` | App chrome and screens (home, dasha, horoscope, do's & don't) |
| `native-app.js` | Injects that UI when the app user-agent contains `SaptarishiNativeApp` |

The app **packs** this folder (with the rest of `frontend/`) into the APK via
`backend/mobile/android` → `npm run sync`. Website deploys do not update the store app.

Desktop `frontend/html`, `frontend/js`, `frontend/style`, and `frontend/utils` stay the
source; pack copies them. Native scripts run only in the Android app, not in desktop Chrome.
