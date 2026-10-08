# Janus Journey Journeys Microservice

`ms-journeys` owns the Janus Journey capability, including Journeys, Folders, and Tasks.
It exposes an internal REST API consumed by the Janus Journey BFF and persists its
domain data in MongoDB.

## Current scope

- Generic CRUD for Journeys, Folders, and Tasks.
- Parent relationships are represented by `{ uid, type }`; authentication and authorization are not implemented yet.
- Folder parents may be Users or Journeys.
- Task parents may be Users, Journeys, or Folders.
- Unprotected endpoints; authentication and authorization are reserved for a future cross-cutting design.
- Non-cascading deletes.
- Confirmed Task states: `pending`, `in-progress`, `complete`, `in-pause`, and `discarded`.
- Independent `isVisible` boolean.
- Progress response shape is defined, but progress calculation is intentionally deferred.

The current scope does not include BFF changes, frontend concerns, sharing, cloning,
roadmaps, AI, or progress calculation.

## API

Each resource exposes:

```text
GET    /journeys
GET    /journeys/:uid
POST   /journeys
PUT    /journeys/:uid
PATCH  /journeys/:uid
DELETE /journeys/:uid

GET    /folders
GET    /folders/:uid
POST   /folders
PUT    /folders/:uid
PATCH  /folders/:uid
DELETE /folders/:uid

GET    /tasks
GET    /tasks/:uid
POST   /tasks
PUT    /tasks/:uid
PATCH  /tasks/:uid
DELETE /tasks/:uid
```

Requests do not require an authentication header. The service currently performs no
ownership filtering or authentication and does not replace it with another mechanism.

## Configuration

Copy `.env.example` to `.env` and configure:

```dotenv
PORT=4002
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE_NAME=ms-journeys-db
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
```

## Development

```bash
npm install
npm run start:dev
```

Swagger is available at:

- `http://localhost:4002/docs`
- `http://localhost:4002/docs-json`

## Useful commands

```bash
npm run prettier:check
npm run lint
npm run lint:oxlint
npm run test
npm run test:e2e
npm run test:cov
npm run build
```

## Source structure

```text
src/
├── config/                 # Environment and Swagger configuration
└── modules/                # Internal feature modules in this microservice
    ├── journeys/           # Journey feature
    ├── folders/            # Folder feature
    └── tasks/              # Task feature
```

The service does not validate Better Auth JWTs and does not access another
microservice's database.
