# Emergency OS

Emergency Department Operating System for high-pressure EDs with small clinical teams.

Built for: ~100 patients/day, teams under 10
Primary screen: Emergency Whiteboard

## Stack

- Frontend: React 18, Vite, React Router, Zustand, mostly JS/JSX with some TS/TSX.
- Backend: NestJS 10 on Express, TypeORM, SQLite for local development, PostgreSQL when configured.
- Optional services: Redis cache, Python NLU service, and observability services for deeper local/production-like runs.
- Package manager: npm, with separate root, backend, and MCP package locks.

## Local Full-Stack Development

Use Node 20 or newer. The repo baseline is captured in `.node-version` and the root/backend `engines` fields.

Install root and backend dependencies once:

```bash
npm install
npm --prefix backend install
```

Start the frontend and backend together:

```bash
npm start
```

The local stack uses SQLite and disables optional ML/RAG services by default so the app can boot without Docker or external credentials.

- Frontend: `http://localhost:8000`
- Backend API: `http://localhost:3000/api`
- Backend health: `http://localhost:3000/health`
- API docs: `http://localhost:3000/api/docs`

Useful focused commands:

```bash
npm run dev:web
npm run dev:api
npm run backend:build
npm run typecheck:frontend
npm run lint:all
```

## Docker App Stack

For an app-only Docker run:

```bash
npm run compose:app:build
```

To include the optional Python NLU service:

```bash
npm run compose:app:ml
```

The larger `docker-compose.yml` remains available for the full database, cache, monitoring, and observability stack.

The product is now one thing. One name. One purpose. One codebase.
