<!-- Copyright © 2018-2026 ranjanravi.com. All rights reserved. -->

# iPhone-only UI

These files belong to the **iPhone app**, not the desktop website.

| File | Role |
|---|---|
| `native-ios.css` | Notch / home-indicator safe area, hide UPI QR, Apple purchase button |
| `native-ios.js` | StoreKit bridge (`SaptarishiIosIap`) when the user-agent contains `SaptarishiNativeApp` |

The iOS app **also** loads the Android native shell (`mobile/android/native-app.css` + `native-app.js`) so Home, dock, and menu match.

Pack and rebuild from `backend/mobile/iphone` → `npm run sync` on a Mac. Website deploys do not update the App Store app.
