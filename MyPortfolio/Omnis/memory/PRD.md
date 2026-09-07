# OMNIS — Earth Intelligence (PRD)

## Original Problem Statement
OMNIS — Universal Reality Intelligence Platform. "Search, understand and predict the world around you." V1 = Earth Intelligence: user selects a location and the system fuses open environmental data to answer: What is happening? What changed? Why? What could happen next? What evidence supports this? — with prediction, evidence, confidence, data timestamp and sources.

## Architecture
- Frontend: React 19 + Tailwind + Shadcn + Leaflet (dark map) + Recharts. Bearer-JWT auth in localStorage.
- Backend: FastAPI + MongoDB (motor). All routes under /api.
- Data Fusion Engine: Open-Meteo Forecast API (weather, 7d past + 7d forecast rainfall, temp trend, elevation) + Air Quality API (US AQI, PM2.5/PM10, O3, NO2). No API key needed.
- AI Reasoning: Claude Sonnet 4.6 via Emergent LLM key (emergentintegrations) → structured JSON report (what happening/changed/why + 2-4 predictions with risk level, confidence, evidence, sources).
- Composite Environmental Score (0-100) computed server-side from AQI + heat + flood signals.

## User Personas
Researchers, engineers, disaster-management teams, businesses, ordinary people.

## Core Requirements (static)
- Location selection: search (Open-Meteo geocoding) + preset cities + interactive map pin.
- Evidence-forward report: prediction + evidence + confidence + data timestamp + cited sources.
- Auth (JWT) + saved locations per user.

## Implemented (2026-08-11)
- JWT auth: register/login/me; admin seeded (admin@omnis.earth / omnis123).
- /api/geocode, /api/analyze (fusion + Claude reasoning), /api/locations CRUD.
- Dashboard: search + presets + Leaflet dark map picker, analyze flow, live report (headline, metrics, reasoning narrative, 14-day rainfall chart, prediction cards w/ confidence bars + evidence + sources), environmental score, saved locations.
- Auth page with guest access. Verified end-to-end (curl + screenshots).

## Backlog / Remaining
- P1: Historical/archive deep trends & "what changed" vs multi-year baseline.
- P1: Water-level / river gauge + terrain slope data for stronger flood evidence.
- P2: Compare two locations; export report (PDF/JSON).
- P2: Streaming reasoning tokens; caching of analyses.
- P2: Human/Machine/Scientific/Space intelligence modules.
