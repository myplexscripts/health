# Health

A local-first nutrition and health tracking web app built on the complete GlassKit iOS starter.

## Features

- Nutrition label capture with browser text recognition and editable review
- Personal onboarding for a name, health tracking choices, and flexible nutrition goals or limits
- All 39 Apple Health nutrition categories, with searchable goal and manual-entry screens
- Blood pressure, heart rate, weight, and blood glucose logging
- First-use measurement guidance for more consistent blood pressure and resting heart rate logs
- Daily progress, history, heart and nutrition charts, and descriptive trend insights
- Local browser storage, JSON export, dark mode, reduced motion, and accessible controls
- GlassKit routing, reactive store, controllers, request helper, storage helper, Lucide icons, Apple system colours, and concentric radii

## Run locally

Serve the folder over HTTP so camera and request features can work correctly.

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

All product code lives in `app.js`, `app.css`, and `components/`. The `framework/` directory comes from the GlassKit starter and includes two reusable fixes made here: preserving query parameters in string routes and keeping interactive back transitions visually continuous.
