# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository overview

This repository contains a flower-vendor SaaS application with:

- A **FastAPI + SQLAlchemy backend** under `backend/` using PostgreSQL and Alembic migrations.
- A **React + Vite SPA frontend** under `frontend/` that talks to the FastAPI API via `frontend/src/config/api.js`.
- A small **Node/Express + SQLite service** under `frontend/server/` that appears to be a legacy/local data store; it is not used by the current frontend API client by default.

## Commands and workflows

### Backend (FastAPI API)

**Install dependencies** (Python):

```bash path=null start=null
cd backend
pip install -r requirements.txt
```

**Run the API in development** (FastAPI + Uvicorn):

```bash path=null start=null
cd backend
uvicorn app.main:app --reload --port 8000
```

- The frontend is configured to call `http://127.0.0.1:8000`.
- CORS in `app.main` already allows Vite dev origins on ports 5173 and 5174.

**Run database migrations (Alembic):**

```bash path=null start=null
cd backend
alembic upgrade head
```

Create a new migration (after modifying SQLAlchemy models):

```bash path=null start=null
cd backend
alembic revision --autogenerate -m "describe_change"
```

**Quick backend health checks:**

- `GET /` → returns a simple `{ "message": "API is running" }` payload.
- `GET /db-test` → runs `SELECT 1` against the configured database to verify connectivity.

### Frontend (React/Vite SPA)

**Install dependencies (Node):

```bash path=null start=null
cd frontend
npm install
```

**Run the Vite dev server:**

```bash path=null start=null
cd frontend
npm run dev
```

- Vite serves the SPA (by default on port 5173); it expects the FastAPI API at `http://127.0.0.1:8000`.

**Build the SPA:**

```bash path=null start=null
cd frontend
npm run build
```

**Preview the production build:**

```bash path=null start=null
cd frontend
npm run preview
```

### Node/Express SQLite service (optional/legacy)

There is an additional API implementation in `frontend/server/src` using Express and `better-sqlite3`:

```bash path=null start=null
cd frontend
npm run server   # runs node server/src/index.js
```

- This service exposes `/api/*` endpoints backed by `frontend/server/data/app.db`.
- The current React client uses the FastAPI backend via `frontend/src/config/api.js` (not the `/api/*` routes), so this Node service is best treated as legacy or a local experimentation harness unless you deliberately point the frontend to it.

### Linting and tests

- No dedicated lint or test commands are currently defined in `backend/` or `frontend/package.json`.
- The only file under `backend/tests/` is `tests/test1.py`, which is a simple script that hashes a password via `app.core.security` rather than a formal test.

To run that helper script:

```bash path=null start=null
cd backend
python tests/test1.py
```

If you introduce a test runner later (e.g. `pytest` for the backend), a single test can typically be run with a pattern like:

```bash path=null start=null
pytest backend/path/to/test_file.py::TestClassName::test_case_name
```

## Backend architecture

Backend code lives under `backend/app/` and is organized by responsibility:

- `app/main.py` – FastAPI application factory and wiring:
  - Creates the `FastAPI` app and sets title/version.
  - Includes routers from `app.routes.auth`, `settlements`, `farmers`, `farmer_groups`, `vehicles`, and `collections`.
  - Mounts `/static` to serve generated assets (e.g. PDFs) from the `static/` directory.
  - Imports `app.core.startup` once at startup so that SQLAlchemy event listeners for auditing are registered.
  - Defines simple health endpoints: `/` and `/db-test`.

- `app/core/` – cross-cutting infrastructure:
  - `config.py` defines a `Settings` object (Pydantic) that reads configuration such as `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, and `DATABASE_URL` from environment variables (via `python-dotenv`).
  - `db.py` creates the SQLAlchemy `engine`, `SessionLocal`, and `Base`, and exposes `get_db()` for FastAPI dependency injection.
  - `security.py` centralizes password hashing/verification using `passlib` (bcrypt).
  - `jwt.py` creates signed JWT access tokens with expiry using `python-jose` and settings from `config.py`.
  - `audit_events.py` registers SQLAlchemy `Session` event listeners that capture `INSERT`/`UPDATE`/`DELETE` operations and create rows in the `Audit` table, using a generic serializer.
  - `startup.py` exists solely to import `audit_events` at app startup so those listeners are active.

- `app/dependencies.py` – request-scoped dependencies:
  - Defines the `OAuth2PasswordBearer` flow (`tokenUrl="/auth/login"`).
  - Implements `get_current_user`, which decodes the JWT, loads the `User` from the database, and raises a 401 if invalid.
  - Provides `require_admin`, which enforces `current_user.role == "vendor_admin"` and raises 403 otherwise.
  - These dependencies are used throughout the routers to enforce authentication and role-based access control.

- `app/models/` – SQLAlchemy ORM models for domain entities:
  - Core entities include `Vendor`, `FarmerGroup`, `Farmer`, `Vehicle`, `Collection`/`CollectionItem`, `Advance`, `Settlement`/`SettlementItem`, `SMSLog`, `User`, and `Audit`.
  - Relationships connect vendors, farmers, and settlements; for example, `Settlement` links to `Farmer`, `Vendor`, and a collection of `SettlementItem` rows.
  - Alembic’s `env.py` imports `Base` and all model classes so migrations can be autogenerated from model changes.

- `app/schemas/` – Pydantic request/response models:
  - Mirror the main use-cases: authentication (`auth.py`), collections (`collection.py`), settlements (`settlement.py`), farmer/farmer-group/vehicle CRUD, etc.
  - Route handlers accept these schemas as typed bodies to validate incoming JSON and to control response payloads.

- `app/routes/` – HTTP API surface (FastAPI routers):
  - `auth.py` – signup and login endpoints:
    - `/auth/signup` registers a new user (vendor-scoped) with a hashed password.
    - `/auth/login` accepts OAuth2 form data (`username` treated as email) and issues JWT access tokens embedding `email`, `vendor_id`, and `role`.
    - `/auth/me` uses `get_current_user` to return the authenticated user profile.
  - `collections.py` – APIs for creating and managing vendor-specific collection items:
    - Bulk creation with server-side financial calculations (labour, coolie, transport, line totals) and validation that referenced farmers and vehicles belong to the same vendor.
    - Listing collections with optional date filtering and vendor scoping.
    - Update/delete operations that forbid changes to items locked by a settlement.
  - `settlements.py` – higher-level financial workflows around settlements:
    - `POST /settlements/` generates a settlement for a vendor + farmer + date range by aggregating unlocked `CollectionItem` rows, computing gross, labour, coolie, transport, commission, advance deduction, and final net payable; marks items as locked and adjusts the farmer’s advance balance.
    - `POST /settlements/{id}/void` voids an active settlement, reverses advance adjustments, unlocks related collection items, and marks the settlement’s status as `VOIDED`.
    - `POST /settlements/recalculate` recalculates or creates a settlement for the same period, re-deriving all financial fields and updating advance usage.
  - Additional routers (e.g. `farmers.py`, `farmer_groups.py`, `vehicles.py`) provide CRUD endpoints that align with the frontend’s `api.js` helpers (`/farmers/`, `/farmer-groups/`, `/vehicles/`, and per-farmer transaction routes).

- `app/services/` – domain services that encapsulate multi-step operations:
  - `settlement_service.py` performs settlement generation using a more detailed algorithm:
    - Fetches vendor, farmer, and all relevant `CollectionItem` rows for the period.
    - Computes total quantity, amounts, labour/coolie/transport, commission (using farmer- or group-specific commission percentages), advance deductions (with a default percent that can be overridden), and net payable.
    - Persists a `Settlement` and its `SettlementItem` rows, records an `Advance` ledger entry when applicable, and updates the farmer’s advance balance.
    - Generates a PDF via `pdf_service.generate_settlement_pdf` and sends an SMS summary via `sms_service.send_sms`.
  - `pdf_service.py` uses `reportlab` to create branded settlement PDFs under `static/settlements/` and returns a `/static/settlements/...` URL that the frontend can consume.
  - `sms_service.py` wraps HTTP calls to an external SMS API with basic retry logic and logs each attempt to the `SMSLog` table, keyed by vendor/farmer and SMS type.

- `app/utils/serializer.py` – a small helper that converts SQLAlchemy model instances into plain dictionaries using the mapper’s column attributes; heavily used by audit logging.

- `alembic/` – database migrations:
  - `alembic.ini` specifies `script_location` and the `sqlalchemy.url` used when running Alembic commands directly.
  - `alembic/env.py` wires Alembic to `app.core.db.Base` and imports all models so `alembic revision --autogenerate` can see the full metadata.

## Frontend architecture

Frontend code lives under `frontend/` and is a single-page React application powered by Vite and Tailwind CSS.

- `src/main.jsx` – React entrypoint:
  - Imports `App` and `index.css`, and renders into `#root` using `ReactDOM.createRoot`.

- `src/App.jsx` – main application shell and most UX flows:
  - Contains the top-level navigation bar with **Transaction**, **Reports**, **Utility**, and **More** menus.
  - Implements or composes multiple screen-level components in the same file, such as:
    - `DailyTransactionsView` – the primary data-entry and ledger view that orchestrates vehicles, catalog items, customers, and commission/charges to build a per-customer transaction list.
    - `GroupCustomerRegistryForm` – manages farmer groups and customers with quick-add flows.
    - `ItemRegistryForm`, `VehicleView`, `AdvanceView`, `SaalaView`, and several reporting/printing views like group-wise totals, group patti printing, and item-wise daily sale analysis.
    - `SmsView` and other utility screens that prepare SMS summaries and sometimes copy them to the clipboard instead of directly sending them.
  - Centralizes application state with React hooks (`useState`, `useEffect`, `useMemo`, `useRef`) for:
    - Authentication (`isAuthenticated`, `checkingAuth`) based on a JWT in `localStorage` and the `/auth/me` backend endpoint.
    - Master data (`groups`, `customers`, `catalog`, `vehicles`) loaded from the backend on mount.
    - Domain-specific state like `advanceStore`, `ledgerStore`, and various reporting forms.
  - Uses `window.print()` and `afterprint` event listeners for print-friendly report views (e.g. patti reports, group totals, and item-wise sales).

- `src/config/api.js` – thin HTTP client for the FastAPI backend:
  - Hard-codes `API_URL = "http://127.0.0.1:8000"` and a `request(path, options)` helper using `fetch`.
  - Automatically attaches `Authorization: Bearer <token>` if a `token` is present in `localStorage` and sends JSON bodies.
  - Exposes higher-level methods used throughout `App.jsx`, including:
    - `me()` → `GET /auth/me`.
    - `listGroups()` / `createGroup(name)` → `GET`/`POST /farmer-groups/`.
    - `listCustomers()` / `createCustomer(payload)` → `GET`/`POST /farmers/`.
    - `listVehicles()` → `GET /vehicles/`.
    - `listCatalog()` → `GET /catalog/`.
    - `listTransactions(farmerId)` / `replaceTransactions(farmerId, items)` → farmer-specific transaction endpoints under `/farmers/{farmerId}/transactions/`.
  - Error handling: on non-2xx responses it attempts to parse JSON and throws an `Error` using either the backend’s `detail` message or a synthetic `Request failed: <status>` string; the UI surfaces these via the `Toast` component.

- `src/components/` – shared UI components:
  - `components/shared/SearchableSelect` provides searchable dropdowns for selecting groups, customers, items, etc.
  - `components/shared/Toast` displays transient notification messages for success/error states.
  - `components/auth/Login` handles the login screen, which, on success, stores the JWT in `localStorage` and flips `isAuthenticated`.
  - `components/reports/ReportsView` encapsulates more complex reporting UIs (e.g. statements) that the main `App` navigates to.

- Styling and build tooling:
  - Tailwind is configured via `tailwind.config.js` and used extensively via utility classes in JSX.
  - Vite is used for dev and build (`npm run dev`, `npm run build`, `npm run preview`).

## Interaction between frontend and backend

- The frontend authenticates by calling the FastAPI `/auth/login` endpoint (via the `Login` component and a helper not shown in `api.js` above) and then persistently uses `/auth/me` to validate and discover the current user.
- Core operational flows (daily transactions, group reports, advance tracking) are driven from the client but rely on backend endpoints for authoritative state:
  - Master data (farmer groups, farmers, catalog items, vehicles) is loaded from FastAPI and cached in React state.
  - Per-farmer transactions are fetched and replaced via `/farmers/{farmerId}/transactions/`.
  - Settlement logic, PDFs, and SMS notifications live exclusively on the backend (`settlement_service.py` plus related routers and services) even when the frontend additionally presents derived summaries.
- Static artifacts such as settlement PDFs are written under `backend/static/settlements/` and served to the client via the `/static` mount; when generating or consuming new static outputs, follow the same pattern.
