# MiniFlow — Workflow Automation Platform

A self-hosted workflow automation platform built with Next.js 15, inspired by n8n. Create, manage, and execute visual workflows with AI nodes, webhooks, notifications, and more.

## Features

- **Visual Workflow Editor** — Drag-and-drop node-based workflow design powered by @xyflow/react
- **AI Integration** — Gemini, OpenAI, and Anthropic nodes with prompt templating via Handlebars
- **Conditional Branching** — If/Else nodes with customizable conditions
- **Scheduled Triggers** — Cron-based workflow scheduling via Inngest
- **Execution History** — Track every workflow run with status, duration, and error details
- **Analytics Dashboard** — Visualize workflow performance, success rates, and trends
- **Credential Management** — Securely store and manage API keys with AES-256-GCM encryption
- **Subscription Controls** — Powered by Polar for usage-based billing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth |
| API | tRPC (end-to-end typesafe) |
| AI SDK | Vercel AI SDK |
| Task Queue | Inngest |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or cloud)
- npm

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd miniflow

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in your values

# 4. Set up the database
npx prisma migrate dev
npx prisma generate

# 5. Seed preset workflow templates (optional)
npx prisma db seed

# 6. Start development servers
# Option A: Next.js only
npm run dev

# Option B: Next.js + Inngest dev server (recommended)
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (generate with `openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Yes | Base URL of your app (e.g. `http://localhost:3000`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Recommended | For Gemini AI node |
| `OPENAI_API_KEY` | Recommended | For OpenAI node |
| `ANTHROPIC_API_KEY` | Recommended | For Anthropic node |
| `CREDENTIAL_ENCRYPTION_KEY` | Yes | 32-byte hex key for encrypting stored API keys |

Generate the encryption key with:
```bash
openssl rand -hex 32
```

## Supported Node Types

| Node | Description |
|------|-------------|
| Manual Trigger | Start a workflow manually |
| Schedule Trigger | Run on a cron schedule |
| HTTP Request | Fetch data from any API |
| Gemini | Google AI text generation |
| OpenAI | GPT text generation (supports custom baseURL, e.g. Groq) |
| Anthropic | Claude text generation (supports custom baseURL) |
| Discord | Send messages to Discord via webhook |
| Slack | Send messages to Slack via webhook |
| If / Else | Conditional branching |

## Architecture

```
┌─────────────────────────────────────────────┐
│           Next.js App Router                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Pages   │  │  tRPC    │  │  Inngest │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       └──────────────┼──────────────┘       │
│                      ▼                       │
│               ┌──────────┐                   │
│               │ Prisma   │                   │
│               │ Postgres │                   │
│               └──────────┘                   │
└─────────────────────────────────────────────┘
```

## Project Structure

```
miniflow/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/              # Shared UI components
│   ├── features/              # Feature modules
│   │   ├── executions/        # Workflow execution engine
│   │   ├── credentials/       # Credential management
│   │   ├── templates/         # Workflow templates
│   │   └── workflows/         # Workflow CRUD
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities (db, auth, utils)
│   ├── inngest/               # Inngest background functions
│   └── config/                # Node component registry
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
└── public/                    # Static assets
```

## License

MIT
