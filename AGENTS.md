# Agent Instructions

- **Never update this file**

## Project

- This repository contains the Janus Journey Journeys Microservice (`ms-journeys`).
- `ms-journeys` owns the journeys domain and its persistence for Janus Journey.
- Stack:
  - Node.js
  - TypeScript
  - NestJS
  - REST
  - Jest

## Architecture

- `ms-journeys` is responsible for:
  - Janus Journeys from user accounts resources
  - Journeys, Folders and Tasks
- `ms-journeys` is a domain microservice.
- Do not implement responsibilities belonging to the BFF.
- Do not validate Better Auth JWTs or manage Better Auth sessions.
- Do not implement domain logic belonging to Journey, Folder, Task, Feature Flag, or other microservices.
- Do not connect directly to databases owned by other microservices.
- Do not duplicate logic owned by other microservices.
- Do not create missing microservices or fake their behavior.
- If a requested feature requires a capability owned by another service that does not exist yet, do not implement it inside `ms-journeys` as a shortcut.

## NestJS

- Follow NestJS module and dependency injection conventions.
- Keep controllers thin.
- Prefer the following flow: `Controller → Application/Domain Service → Persistence`.
- Use DTOs and validation at external request boundaries.
- Organize source code by feature first, then by technical responsibility within each feature.
- Keep module files at the feature root.
- Create technical subdirectories only when they are required.
- Do not introduce abstractions or architectural patterns before they are required.

## Configuration

- Environment-specific configuration must use environment variables.
- Never hardcode credentials, secrets, database connection strings, or service URLs.
- Keep `.env.example` synchronized with required environment variables.

## TypeScript and Dependencies

- Use strict TypeScript.
- Avoid `any`.
- Reuse existing dependencies before introducing new ones.
- Follow the repository's established dependency version conventions.
- Do not add dependencies for functionality already covered by the existing stack.

## AI Changelog

- After completing any task that modifies the project, append an entry to `AIChangelog.md`.
- Follow the format and rules defined inside `AIChangelog.md`.
- Add the newest entry at the top.
- Every completed change must have a unique sequential identifier using the format `#JANUS-MS-JOURNEYS-XXXX`.
- Never reuse, modify, or reorder an existing change identifier.
- Determine the next identifier from the highest existing `JANUS-MS-JOURNEYS` identifier in `AIChangelog.md`.
- Every entry must include a descriptive title and a `Work` summary describing the workflow used (e.g. `Plan / Build`) and the purpose of the task.
- Document the meaningful completed changes, including relevant behavior, configuration, domain changes, persistence changes, architectural decisions, and implementation boundaries.
- Log completed work only; do not include unfinished plans, discussions, or unanswered prompts.
- Do not reduce substantial work to generic one-line summaries.
- Do not document trivial implementation details or unchanged behavior.

## Repository Conventions

- Follow the existing configuration for:
  - ESLint
  - Prettier
  - Husky
  - Commitlint
  - Conventional Commits
  - semantic-release
  - Jest
- Before considering a change complete, run the applicable Prettier, lint, test, and build checks.

## Agent Behavior

- Inspect the existing implementation before modifying it.
- Read the relevant knowledge from the root-level `project/` directory before making architectural or domain decisions.
- Treat the root `project/` directory as the centralized source of project context, contracts, architecture, and domain knowledge shared by all Janus Journey repositories.
- Do not expect, create, or maintain repository-specific `project/` directories.
- Treat `project/` as project knowledge, not as implementation code.
- Reuse established patterns.
- Do not invent missing endpoints, microservices, domain contracts, or infrastructure.
- When a required architectural decision cannot be inferred safely from the existing implementation or the root `project/` knowledge, ask before implementing it.
