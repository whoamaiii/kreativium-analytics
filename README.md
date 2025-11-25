# Kreativium Beta v2

Modern Vite + React + TypeScript app with an accessible, analytics-driven UI and strong testing,
i18n, and performance practices.

---

## Quickstart

1. Install dependencies

```bash
npm install
```

2. Start the dev server (Vite on port 5173)

```bash
npm run dev
```

3. Build and preview locally

```bash
npm run build
npm run preview
```

## Tech Stack

- React 18 + TypeScript
- Vite 7 + SWC
- Tailwind CSS + shadcn/ui patterns
- Testing: Vitest + Testing Library + Playwright
- i18n: i18next + resource bundles in `src/locales`
- Web Workers for heavy computations (analytics, ML)
- AI Integration: Gemma 3 270M model via OpenRouter

## Scripts

- `npm run dev`: Start Vite dev server
- `npm run build`: Production build to `dist/`
- `npm run preview`: Serve the built app locally
- `npm run lint` / `npm run typecheck`: ESLint 9 + TS type checks
- `npm run test`: Unit/integration tests (Vitest)
- `npm run e2e`: Playwright end-to-end tests
- `npm run docs:check`: Prettier + markdownlint on docs
- `npm run seed:demo`: Seed demo content

## Project Structure

```text
src/
  components/     # Reusable UI components
  pages/          # Routed views
  hooks/          # React hooks (session tracking, storage, analytics)
  lib/            # Core business logic
    adapters/     # Legacy/new type converters
    alerts/       # Alert detection engine
    analytics/    # Analytics worker management
    storage/      # Unified storage service (kreativium.local:: namespace)
    tracking/     # Session management
  config/         # Analytics and app config
  locales/        # i18n bundles
  workers/        # Web Workers (analytics.worker.ts)
tests/
  e2e, unit, integration, performance
docs/             # Contributor and user docs
dist/             # Production build output
```

## Architecture Highlights

### Storage System

The app uses a unified storage service (`src/lib/storage/`) with:
- Zod schema validation for all entities
- Event-driven updates via custom DOM events
- Namespace-based keys (`kreativium.local::*`)
- Automatic migration from legacy `sensoryTracker_*` keys

### Analytics Pipeline

Heavy analytics computations run in a Web Worker (`src/workers/analytics.worker.ts`):
- Pattern analysis, correlation detection, predictive insights
- TTL-based caching for performance
- Circuit breaker pattern for resilience
- Alert detection engine with baseline tracking

## Quality & CI Hints

- Keep functions small and focused; follow single-responsibility
- Prefer composition, hooks, and dependency injection for testability
- Run `npm run lint` and `npm run typecheck` before commits/PRs
- For analytics changes, run tests with coverage and update thresholds if needed

## Contributing

1. Create a topic branch from `main`
1. Commit using conventional style (e.g., `feat:`, `fix:`, `chore:`)
1. Open a PR and include screenshots/accessibility notes as relevant

## License

This project is licensed under the MIT License.

<!-- Detailed historical notes retained below for context. -->

## About

This project was imported from the kreativiumbeta2 local development environment. It contains:

- **Dist folder**: Built application artifacts ready for deployment
- **MLX Backend**: Python backend for machine learning inference
- **Public folder**: Static assets and model configurations

## Legacy Project Structure

```text
kreativiumbeta2/
├── dist/              # Built application
│   ├── assets/        # Bundled JavaScript and CSS
│   ├── models/        # Model configuration files
│   └── index.html     # Main application entry
├── mlx-backend/       # Python ML backend
│   └── models/        # MLX model files
└── public/            # Static assets
    └── models/        # Public model files
```

## Features

- **Sensory Tracking**: Comprehensive sensory input monitoring
- **Emotion Analytics**: Advanced emotion pattern analysis
- **AI Integration**: Gemma 3 270M model for insights
- **Report Generation**: Automated PDF reports
- **Real-time Analytics**: Live pattern detection

## Deployment

The `dist` folder contains the production-ready build that can be deployed to any static hosting
platform.

## Configuration

Model configurations are stored in `dist/models/gemma3-270m-it/` with:

- `config.json` - Model configuration
- `tokenizer_config.json` - Tokenizer settings

## Notes

- Large binary files (`*.onnx`, `*.bin`, `*.safetensors`) are excluded from git
- WASM files are excluded due to size constraints
- Python virtual environment is excluded from git

## Original Project

This is a continuation of the KreativiumV17 project, representing the beta v2 iteration with
enhanced ML capabilities and improved analytics.

## Detector options

You can choose the expression detector backend under Settings:

- FaceAPI (Worker) – default; runs on a Web Worker using ImageBitmap and OffscreenCanvas
- FaceAPI (Main thread) – compatibility path
- MediaPipe (Experimental) – uses MediaPipe Tasks Face Landmarker with blendshapes→emotion mapping

The selection is persisted in localStorage under `emotion.detectorType`.

## Game mechanics (Sprint 1+)

- Timed rounds: each round has a countdown (>=8s); timeout triggers a gentle fail and advances.
- Combo: consecutive successes increase a combo multiplier (capped), boosting XP.
- Perfect window: very high probability at completion grants a small bonus.
- Hints: limited per day; remaining count shown on the Hint button; toggle daily limits in Settings.
- Offline: Service Worker caches `/models/**` and static assets for quicker loads.
