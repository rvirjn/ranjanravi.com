# Saptarishi Mobile App Presentation

This folder contains a static presentation for the proposed Saptarishi Android/mobile app design.

## Files

- `index.html` - presentation deck with mobile screen mockups and feature placement.
- `styles.css` - visual design system for the deck.
- `previews/` - PNG screenshots of key presentation sections.

## How to open

Open `index.html` in any browser:

```bash
xdg-open saptarishi/frontend/android/index.html
```

The deck can also be printed or saved as PDF from the browser print dialog.

## Preview images

- `previews/mobile-presentation-hero.png` - opening slide and hero phone mockup.
- `previews/mobile-presentation-home.png` - home dashboard placement.
- `previews/mobile-presentation-menu.png` - grouped menu placement.
- `previews/mobile-presentation-screens.png` - Kundali, result, and compare screen gallery.
- `previews/sample/` - competitor reference screenshots used for Kundali design inspiration.
- `previews/screen-shots/` - clean phone PNGs for PowerPoint (Home, Kundali, Remedy, Auspicious, Auspicious range, Profile options, Menu).

Auspicious flow:
- `04-auspicious.png` - muhurat tile menu
- `04b-auspicious-range.png` - after tile click: place + date range

To regenerate PPT screen shots:

```bash
cd saptarishi/frontend/android
npm install playwright --no-save
node capture-shots.mjs
```

## What the presentation covers

- Home page/dashboard placement
- Bottom navigation model
- Full menu page with current and future options
- Kundali page with name, birth details, Open Kundali, symbols, and feature previews
- Kundali birth form and result tabs
- Kundali compare flow
- Remedy flow
- Auspicious baby birth-time flow
- Profile, login, premium, coupon, support, and privacy placement
- Future feature placeholders such as saved Kundalis, PDF reports, Daily Panchang, Muhurat calendar, matchmaking, transit alerts, learning, language, and settings
