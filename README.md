# survey

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **tRPC** - End-to-end type-safe APIs
- **Drizzle** - TypeScript-first ORM
- **MySQL** - Database engine
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses MySQL with Drizzle ORM.

1. Start the local MySQL container:

```bash
bun run db:start
```

2. Make sure `apps/web/.env.local` has your `DATABASE_URL`.

3. Apply the versioned migrations:

```bash
bun run db:migrate
```

Schema changes go through generated migration files, not `db:push`. After editing
anything under `packages/db/src/schema`, run `bun run db:generate` and commit the
resulting file in `packages/db/src/migrations` — that file is what runs in production,
and it is reviewed in the pull request like any other code.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.

To make the local server reachable from the mobile app (physical devices, emulators, and
the `development` EAS build all fail to resolve `localhost` consistently across OSes), run
the Cloudflare tunnel that exposes it at `survey.oikos.company`:

```bash
bun run tunnel
```

Requires `cloudflared` installed and authenticated (`cloudflared tunnel login`) with access
to the `oikos.company` zone. The tunnel (`oikos-local-dev`) and DNS record already exist —
this command only connects.

## Testing

```bash
bun run test
```

Each test suite creates its own throwaway database (`survey_test_<uuid>`), applies the
migrations to it, and drops it when the suite ends. That is why a broken migration fails
every test instead of hiding until deploy.

Creating those databases needs a privilege the application user does not get by default,
so `docker/mysql/init` grants it on the `survey_test_%` prefix. Init scripts only run when
the MySQL volume is first created — if the grant is missing, recreate it:

```bash
docker compose down -v && bun run db:start
```

In CI, point `TEST_DATABASE_URL` at a user allowed to create and drop databases. Without
it the harness falls back to `DATABASE_URL`.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@survey/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment

### Docker Compose

- Target: web + server
- Config: `docker-compose.yml` (app Dockerfiles live in `apps/*/Dockerfile`)
- Build images: bun run docker:build
- Start: bun run docker:up
- Logs: bun run docker:logs
- Stop: bun run docker:down

Environment variables are read from each app's `.env` file (baked into web builds for public variables) and overridden in `docker-compose.yml` for container networking.

For more details, see the guide on [Deploying with Docker Compose](https://www.better-t-stack.dev/docs/guides/docker).

## Git Hooks and Formatting

- Run checks: `bun run check`

## Project Structure

```
survey/
├── apps/
│   └── web/         # Fullstack application (Next.js)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run test`: Run the test suites (needs the MySQL container running)
- `bun run db:generate`: Generate a migration file from the current schema
- `bun run db:migrate`: Apply pending migrations
- `bun run db:push`: Apply the schema without a migration file — scratch databases only
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Biome formatting and linting
- `bun run tunnel`: Expose the local dev server at `survey.oikos.company` via Cloudflare
- `bun run docker:build`: Build the Docker Compose images
- `bun run docker:up`: Build and start the Docker Compose stack
- `bun run docker:logs`: Tail logs from the Docker Compose stack
- `bun run docker:down`: Stop the Docker Compose stack
