# Agent guide

- Use Node.js from `.nvmrc` (`nvm install && nvm use`) and install with `npm ci`.
- This is a NestJS teaching API. Keep the stage-one scope: three business routes, in-memory storage, and no database or user management.
- Group features into Nest modules. Controllers handle HTTP, services own business logic and state, and DTOs define validation and Swagger schemas.
- Keep spending totals in integer cents internally; expose currency-unit numbers in API responses.
- Keep Swagger and `README.md` aligned with API changes.
- Before finishing code changes, run `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run format:check`.
