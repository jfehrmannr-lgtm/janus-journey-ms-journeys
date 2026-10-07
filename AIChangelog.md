# AI Changelog

## 2026-10-06

### #JANUS-MS-JOURNEYS-0003: Remove Internal Identity Header Coupling

**Work**: Plan / Build; Removed the temporary `x-authenticated-subject` mechanism so the Journey, Folder, and Task CRUD API remains intentionally unprotected while cross-cutting authentication and authorization are designed separately.

- Removed header extraction, required-header validation, Swagger header metadata, and the dedicated identity configuration helper.
- Removed ownership filtering and owner-dependent repository/service signatures while preserving parent relationships, CRUD routes, validation, persistence, and non-cascading deletes.
- Updated API documentation, unit coverage, and MongoDB-backed E2E coverage to verify requests work without an authentication header.

## 2026-10-06

### #JANUS-MS-JOURNEYS-0002: Modularize Journey Domain Features

**Work**: Build; Reorganized the existing Journey, Folder, and Task implementation into separate internal NestJS feature modules without changing the microservice boundary or API behavior.

- Moved each entity's controllers, DTOs, repositories, schemas, and services under `src/modules/`.
- Registered `JourneysModule`, `FoldersModule`, and `TasksModule` independently while preserving the shared `ms-journeys` capability and MongoDB collections.
- Preserved existing routes, validation, ownership handling, persistence behavior, non-cascading deletes, and test coverage.

## 2026-10-06

### #JANUS-MS-JOURNEYS-0001: Implement Initial Journeys Microservice

**Work**: Plan / Build; Replaced the NestJS starter with the initial Journey capability service and the reusable Janus backend project baseline.

- Added environment validation, MongoDB/Mongoose integration, Swagger, global DTO validation, ESLint, Oxlint, Prettier, Husky, Commitizen, Commitlint, and semantic-release configuration.
- Added one Journeys capability module containing Journey, Folder, and Task controllers, services, repositories, schemas, DTOs, and contract types.
- Added generic CRUD endpoints with ownership derived from the internal `x-authenticated-subject` header and `404` ownership isolation.
- Added separate `journeys`, `folders`, and `tasks` MongoDB collections with non-cascading deletion behavior.
- Preserved the confirmed Task state and visibility contracts without implementing progress calculation or percentage semantics.
