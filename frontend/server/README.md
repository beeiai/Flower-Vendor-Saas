# Backend (Express + SQLite)

## Run

From the repo root:

- Install deps: `npm install`
- Start API: `npm run server`

API base: `http://localhost:3001`

## Endpoints

- `GET /api/health`
- `GET/POST/DELETE /api/groups`
- `GET/POST/DELETE /api/customers`
- `GET/POST /api/catalog`
- `GET/POST /api/vehicles`
- `GET/POST /api/customers/:customerId/transactions`
- `PUT/DELETE /api/transactions/:id`
- `GET/POST /api/customers/:customerId/advances`

Data is stored in `server/data/app.db`.
