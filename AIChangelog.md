# AI Changelog

## 2026-10-08

### #JANUS-MS-JOURNEYS-0008: Document Journey Creation Errors

**Work**: Plan / Build; Traced `POST /journeys` validation and persistence error handling and documented only the HTTP errors implemented within `ms-journeys`.

- Added Swagger documentation for `400 Bad Request` from DTO validation and `409 Conflict` from duplicate-key handling.
- Confirmed that parent existence validation is not implemented; `404 Not Found` remains unresolved technical debt and was not advertised as supported behavior.
- Made no changes to validation, parent resolution, persistence, or cross-service communication.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0007: Correct Journey and Folder Response Examples

**Work**: Plan / Build; Corrected shared response DTO Swagger metadata so all documented Journey and Folder response endpoints expose contract-shaped examples without changing runtime behavior.

- Added a string example for Journey response descriptions, covering collection, detail, create, replace, and patch responses.
- Added string description and numeric `orderIndex` examples to Folder responses, covering collection, detail, replace, and patch responses.
- Preserved the existing response DTO types, controllers, validation, persistence, and endpoint behavior.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0006: Correct Resource Swagger Examples

**Work**: Plan / Build; Verified the affected Folder and Task DTO metadata against the existing resource contracts and corrected only the generated Swagger examples for descriptions and ordering.

- Documented `orderIndex` as a numeric example of `100` for Folder and Task create/update DTOs and Task responses instead of an empty object schema.
- Added resource-specific description examples for Folder and Task request DTOs and Task responses.
- Preserved the existing `unknown` transport/persistence type and all runtime validation and business behavior.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0005: Document Collection Pagination Parameters

**Work**: Plan / Build; Verified the collection query DTO and generated OpenAPI document, then documented the existing `page` and `size` parameters without changing pagination or filtering behavior.

- Added Swagger metadata for the shared required `page` and `size` query parameters, including their existing bounds and examples.
- Added OpenAPI e2e assertions for `GET /journeys`, `GET /folders`, and `GET /tasks` to verify both documented parameters are generated and no unsupported filters are advertised.

## 2026-10-07

### #JANUS-MS-JOURNEYS-0004: Add Bounded Collection Results

**Work**: Plan / Build; Added required pagination and exact persistence-backed collection totals for Journeys, Folders, and Tasks.

- Added shared validated `page`/`size` transport input with a defensive maximum of `200` for all three collection routes.
- Applied database-level pagination and `countDocuments` in each resource repository and returned the minimal `{ items, totalRecords }` downstream contract.
- Updated service, Swagger, and MongoDB-backed E2E coverage while keeping direct resource responses and domain UID mappings unchanged.

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
