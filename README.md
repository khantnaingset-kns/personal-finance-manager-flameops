# Personal Finance Manager API

A small NestJS API for teaching application deployment and integration. Stage one supports spending categories and accumulated spending totals using an in-memory store.

## Requirements

- **Node.js 26.13.1 LTS (Lithium)**, pinned in `.nvmrc`.
- **npm 11.20.0**, included with that Node release.

These are the latest Node LTS release and its bundled npm version at project setup. The lockfile pins dependency versions; TypeScript stays on the 6.0 release line supported by the NestJS Swagger and testing/linting tools.

## Run locally

From this directory, with [nvm](https://github.com/nvm-sh/nvm) installed:

```sh
nvm install
nvm use
npm ci
npm run start:dev
```

- API: <http://localhost:3000/categories>
- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/docs-json>

Swagger documents all three business routes, including input/output schemas, examples, and error responses. You can also call the API directly from Swagger UI.

### Troubleshooting Node version errors

Installing Node with `nvm` does not switch already-open terminals, and new terminals may select your existing `nvm` default. The `.nvmrc` file records the project's version; run `nvm use` in each terminal to activate it.

If startup reports `ERR_REQUIRE_CYCLE_MODULE` involving `ora` on Node `22.14.0`, select the project's Node release in that same terminal:

```sh
nvm use
node --version # v26.13.1
npm run start:dev
```

The `devEngines` setting in `package.json` makes npm check the Node version before installing dependencies or running scripts. An unsupported runtime now produces an `EBADDEVENGINES` error showing the current and required versions before Nest CLI starts. Resolve it with `nvm use` as shown above.

### Configuration

| Variable | Default | Meaning                               |
| -------- | ------- | ------------------------------------- |
| `PORT`   | `3000`  | HTTP port, an integer from 1 to 65535 |

Pass configuration through environment variables:

```sh
PORT=4000 npm run start:dev
```

The server binds to `0.0.0.0` for use in containers and deployment platforms. Environment variables are read from the process; a `.env` file is not loaded automatically.

## API

| Method | Path                      | Success | Purpose                           |
| ------ | ------------------------- | ------- | --------------------------------- |
| `POST` | `/categories`             | `201`   | Create a spending category        |
| `POST` | `/categories/:id/amounts` | `200`   | Add spending to a category        |
| `GET`  | `/categories`             | `200`   | List every category and its total |

### 1. Create a category

```sh
curl -i -X POST http://localhost:3000/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Food"}'
```

Example response (the ID is generated):

```json
{
  "id": "d46c9ef0-8e3b-4c9c-b8e4-aa7a77de8297",
  "name": "Food",
  "totalAmount": 0
}
```

Names are trimmed, must contain 1–100 characters, and must be unique ignoring case. Creating `" food "` after `"Food"` returns `409 Conflict`.

### 2. Add spending

Set `CATEGORY_ID` to the ID returned by your create request:

```sh
CATEGORY_ID='paste-the-returned-id-here'

curl -i -X POST "http://localhost:3000/categories/$CATEGORY_ID/amounts" \
  -H 'Content-Type: application/json' \
  -d '{"amount":12.50}'
```

Example response:

```json
{
  "id": "d46c9ef0-8e3b-4c9c-b8e4-aa7a77de8297",
  "name": "Food",
  "totalAmount": 12.5
}
```

Amounts must be JSON numbers of at least `0.01`, with at most two decimal places. Both a single amount and a category's accumulated total are capped at `1,000,000,000` to keep integer-cent arithmetic and numeric responses precise. Invalid input leaves the previous total unchanged.

Amounts use one implicit currency; choose the currency for your lesson or integration. Internally, the service stores integer cents, so adding `0.10` and `0.20` produces `0.30`. JSON numbers do not retain trailing zeros, so a response may display `0.3` or `12.5`.

Each successful request adds spending again. Sending the same request twice adds the amount twice.

### 3. List totals

```sh
curl http://localhost:3000/categories
```

```json
[
  {
    "id": "d46c9ef0-8e3b-4c9c-b8e4-aa7a77de8297",
    "name": "Food",
    "totalAmount": 12.5
  }
]
```

Categories appear in creation order, including categories with zero spending. Before creating any categories, the response is `[]`.

### Errors

| Status            | Meaning                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `400 Bad Request` | Invalid body, unexpected fields, invalid UUID, or an amount/total outside the allowed range |
| `404 Not Found`   | A valid category UUID does not exist                                                        |
| `409 Conflict`    | A category name already exists                                                              |

Errors use NestJS's standard shape. `message` is a string or an array of validation messages:

```json
{
  "statusCode": 400,
  "message": ["amount must not be less than 0.01"],
  "error": "Bad Request"
}
```

## Architecture

```text
src/
  main.ts                         # Bootstrap, port, shutdown handling
  app.module.ts                   # Root module
  setup-app.ts                    # Shared request validation and Swagger setup
  categories/
    categories.module.ts          # Feature wiring
    categories.controller.ts      # The three business routes
    categories.service.ts         # Business logic and in-memory Map
    categories.constants.ts       # Money bounds
    dto/                          # Validated inputs and documented response shapes
test/
  categories.e2e-spec.ts           # HTTP-level integration tests
```

NestJS dependency injection creates one `CategoriesService` per application instance. Its private `Map` is shared across requests to that instance. Controllers delegate to the service, while DTO decorators define request validation and OpenAPI schemas.

### In-memory state and deployment lessons

This stage has no database, authentication, user management, or user sessions. It has temporary **process-local state**, rather than being strictly stateless:

- All callers of the same running process share the same categories.
- Restarting, redeploying, or a development watch-mode reload clears all data.
- Multiple workers or replicas each have their own independent store. Use one process/replica for this stage when you want a consistent shared demonstration.
- The application keeps totals only, without transaction history.

## Build and run for deployment

Select the pinned Node release, install dependencies, and build:

```sh
nvm use
npm ci
npm run build
PORT=3000 npm run start:prod
```

For a deployment platform, use `npm ci && npm run build` as the build command and `npm run start:prod` as the start command. Configure the Node runtime from `.nvmrc`/`package.json`. The build step needs development dependencies; a separate runtime stage can install only production dependencies with `npm ci --omit=dev` and copy the compiled `dist/` directory from the build stage.

The application handles shutdown signals through NestJS shutdown hooks.

## Checks

```sh
npm run build
npm run typecheck
npm run lint
npm test
npm run format:check
```

The end-to-end tests exercise real NestJS HTTP routing, validation, category creation, decimal accumulation, independent category totals, duplicate handling, missing categories, total limits, and Swagger documentation. Each test starts with a fresh in-memory store.

The test command enables Node's VM module support so Jest can load NestJS 12's ESM packages. Node may print an experimental VM modules notice during tests; the application itself runs without that flag.

Use `npm run format` to apply Prettier formatting.
