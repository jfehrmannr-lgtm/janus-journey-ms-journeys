# AI Changelog

## 2026-10-09

### #JANUS-MS-JOURNEYS-0015: Add User Root Resources Endpoint

**Work**: Plan / Build; Added the unpaginated User root-resource read boundary for direct Journeys, Folders, and Tasks owned by a specified User parent reference.

- Added `GET /users/:userId/root` with a documented nested response containing all three resource arrays and a non-empty collection count.
- Reused the existing resource repositories and response DTOs, filtering by `parent.uid` and `parent.type` and sorting each resource collection independently.
- Added service, end-to-end, and Swagger coverage for direct-child filtering, ordering, empty results, register counts, and the exact response schema.

## 2026-10-09

### #JANUS-MS-JOURNEYS-0014: Normalize Shared Pagination After Validation

**Work**: Plan / Build; Corrected the shared `PaginationQueryDto` so all Journey, Folder, and Task collection endpoints accept valid oversized `size` values and normalize them after validation.

- Removed the input maximum validator and DTO-level pre-validation clamp.
- Added service-level effective-size normalization to 200 for all three collection services.
- Updated Swagger and tests for integer `page`/`size` parameters without a maximum.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0013: Use Typed Parent References

**Work**: Plan / Build; Replaced active `parentUid` transport, domain, persistence, and serialization fields with structured `{ uid, type }` parent references while preserving the ms-journeys boundary and internal cascade behavior.

- Added shared parent DTO, type, and Mongoose subdocument definitions.
- Enforced resource-specific parent types: Journey → User; Folder → User or Journey; Task → User, Journey, or Folder.
- Added local existence checks for internal Journey and Folder parents with `404` responses; User validation remains outside this service and is intentionally not implemented.
- Updated indexes, repository queries, update paths, cascade predicates, response DTOs, Swagger schemas, README documentation, and tests.
- Confirmed obsolete `parentUid` requests are rejected. Existing legacy database documents require a separately planned migration because arbitrary legacy IDs cannot safely recover parent types, especially User versus internal resources.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0012: Normalize Oversized Collection Pages

**Work**: Plan / Build; Updated the shared collection pagination boundary so valid oversized page sizes are normalized before maximum validation without changing invalid-input handling or repository pagination behavior.

- Normalized positive integer `size` values above `200` to `200` for Journeys, Folders, and Tasks.
- Preserved rejection of nonnumeric, zero, negative, and otherwise invalid values.
- Documented the effective maximum of `200` in Swagger and added e2e coverage for accepted and rejected sizes.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0011: Document Deletion Cascades

**Work**: Plan / Build; Updated DELETE operation documentation to describe the transaction-backed cascade behavior implemented for Journeys and Folders and the isolated Task deletion behavior.

- Removed obsolete “without cascading” wording from Journey and Folder Swagger summaries.
- Documented descendant deletion for Journeys, child Task deletion for Folders, and the lack of child resources for Tasks.
- Added OpenAPI test assertions for the three DELETE operation summaries while preserving the existing `204` response contracts.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0010: Cascade Internal Resource Deletions

**Work**: Plan / Build; Implemented transaction-backed internal deletion cascades for Journeys and Folders and verified child, unrelated, nonexistent-resource, and failure-path behavior.

- Journey deletion now atomically removes the Journey, its Folders, direct Tasks, and Tasks owned by those Folders.
- Folder deletion now atomically removes the Folder and its child Tasks; Task deletion remains an isolated operation.
- Added MongoDB replica-set e2e coverage and repository failure-path tests to ensure failed child deletion prevents parent deletion and closes the session.
- Preserved existing `204 No Content` success and `404 Not Found` missing-resource contracts without adding cross-service behavior.

## 2026-10-08

### #JANUS-MS-JOURNEYS-0009: Remove PUT Update Routes

**Work**: Plan / Build; Removed the verified Journey, Folder, and Task PUT routes in accordance with the PATCH-only update contract while preserving the existing PATCH handlers.

- Removed PUT controller methods and imports for all three resources.
- Updated e2e coverage to verify Journey PATCH behavior, reject the removed Journey PUT route, and confirm all three PUT routes are absent from generated OpenAPI documentation.
- Retained the shared update DTOs because they remain required by the PATCH endpoints.

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
