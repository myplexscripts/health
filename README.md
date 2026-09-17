# Health

A local-first nutrition and health tracking web app built on the complete GlassKit iOS starter.

## Features

- Nutrition label capture with browser text recognition and editable review
- Manual food entry with calories, macros, fibre, sugars, and sodium
- Blood pressure, weight, and blood glucose logging
- Daily goal progress, history, charts, and descriptive trend insights
- Local browser storage, JSON export, dark mode, reduced motion, and accessible controls
- GlassKit routing, reactive store, controllers, request helper, storage helper, Lucide icons, Apple system colours, and concentric radii

## Run locally

Serve the folder over HTTP so camera and request features can work correctly.

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

All product code lives in `app.js`, `app.css`, and `components/`. The `framework/` directory is an unchanged copy of the GlassKit starter framework.
