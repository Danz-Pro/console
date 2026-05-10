# WA Bot Console

Railway-ready WhatsApp Bot management console for running, monitoring, and managing bot scripts with real-time logging.

## Features

- **Dashboard** - Overview of all bots with status, quick stats, and system health
- **Bot Management** - Create, edit, delete, start, stop, and restart bot scripts
- **Real-time Logs** - Live log streaming with level filtering (info, warn, error, debug)
- **Auto-restart** - Automatic bot recovery on crash
- **REST API** - Full API for external integration and automation
- **Dark Theme** - Professional dark UI optimized for monitoring

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Runtime**: Bun
- **Database**: SQLite + Prisma ORM
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Process Manager**: Node.js child_process

## Deploy to Railway

1. Push this repo to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Railway will auto-detect the Dockerfile
4. Set environment variable `DATABASE_URL=file:/app/db/custom.db`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bots` | List all bots |
| POST | `/api/bots` | Create a new bot |
| PUT | `/api/bots/:id` | Update bot config |
| DELETE | `/api/bots/:id` | Delete a bot |
| POST | `/api/bots/:id/control` | Start/Stop/Restart (body: `{action}`) |
| GET | `/api/bots/:id/logs` | Get bot logs (query: `level`, `limit`, `offset`) |
| DELETE | `/api/bots/:id/logs` | Clear bot logs |

## Local Development

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Start development server
bun run dev
```
