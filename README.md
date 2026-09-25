# Sentinel 2.0 — AI Agent Runtime Control Layer

> **"Don't just detect risk. Know when to intervene."**

[![CI Status](https://github.com/sentinel-ai/sentinel-2/actions/workflows/ci.yml/badge.svg)](https://github.com/sentinel-ai/sentinel-2/actions)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)

---

## 1. Project Overview
**Sentinel 2.0** is an enterprise-grade runtime control layer designed to govern autonomous and semi-autonomous AI agents. As AI agents gain the capability to execute tool calls, mutate databases, invoke external APIs, and alter cloud infrastructure, static guardrails and post-hoc logging become insufficient. 

Sentinel operates inline, observing the behavioral trajectory of agents over time:
```
Normal actions → Unusual actions → Scope expansion → Sensitive resource access → Privilege escalation → Potentially destructive actions
```

Sentinel evaluates this continuum to find the **Optimal Intervention Window**—intervening before catastrophic harm occurs, without causing unnecessary workflow disruption.

---

## 2. Architecture Summary
```
External AI Agent (Gemini)
        ↓
Sentinel REST API Gateway
        ↓
Agent Authentication & Session Tracking
        ↓
Authorization & Scope Validation
        ↓
Action Classification Engine
        ↓
Trajectory Engine
        ↓
Risk Engine
        ↓
Intervention Intelligence Engine
        ↓
Decision Engine (ALLOW | MONITOR | WARNING | CONFIRM | BLOCK)
        ↓
Human Review (when required) → Target Customer Tool / API
        ↓
Immutable Audit Trail & Dashboard (Simple & Expert Modes)
```

For complete technical specifications, see [System Architecture Specification](docs/architecture.md).

---

## 3. Tech Stack
* **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
* **Backend**: Node.js, Express, TypeScript, Helmet, CORS, Tsx.
* **Shared**: TypeScript definitions, centralized status vocabulary, and translation utilities.
* **Target Database** *(Phase 2)*: Supabase (PostgreSQL with RLS).
* **Target AI Agent** *(Phase 1+)*: Google AI Studio / Gemini API (server-side only).

---

## 4. Repository Structure
```
sentinel-2/
│
├── frontend/             # React + Vite + Tailwind UI
│   ├── src/
│   │   ├── api/          # Centralized API client & endpoint definitions
│   │   ├── components/   # Common UI components, AppShell, Navigation
│   │   ├── features/     # SimpleOverview & ExpertOverview views
│   │   ├── hooks/        # React hooks (useMode, useTheme, useHealth)
│   │   ├── layouts/      # Layout containers
│   │   ├── pages/        # Dashboard container
│   │   ├── services/     # Frontend data services
│   │   ├── stores/       # Theme and Mode context providers
│   │   ├── styles/       # Centralized design tokens & CSS
│   │   └── types/        # Frontend-specific types
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Environment loading & validation
│   │   ├── database/     # Supabase client interface stub
│   │   ├── middleware/   # Error handling, request logger, 404 handler
│   │   ├── modules/      # Domain modules (agents, risk, trajectory, etc.)
│   │   ├── routes/       # Health routes and API router
│   │   ├── services/     # Health service & domain logic
│   │   ├── app.ts        # Express application setup
│   │   └── server.ts     # Process entry & graceful shutdown
│   └── package.json
│
├── shared/               # Shared TypeScript library (@sentinel/shared)
│   ├── src/
│   │   ├── constants/    # Status vocabularies & metadata
│   │   ├── types/        # Agent, Action, Risk, Intervention, Decision types
│   │   ├── utils/        # Simple-mode mappings & translators
│   │   └── index.ts
│   └── package.json
│
├── tests/                # System contract and integration tests
├── docs/                 # Architecture specifications and diagrams
├── .github/workflows/    # Automated CI verification workflow
├── .env.example          # Root environment template
├── .gitignore            # Git exclusion rules
├── README.md             # This document
└── package.json          # Root npm workspaces configuration
```

---

## 5. Prerequisites
* **Node.js**: `v20.0.0` or later (tested on `v24+`)
* **npm**: `v10.0.0` or later (tested on `v11+`)
* **Git**: `2.30+`

---

## 6. Installation & Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/your-org/sentinel-2.git
cd sentinel-2
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the root (and subpackages if overriding):
```bash
cp .env.example .env
```
Default ports:
* Backend: `http://localhost:4000`
* Frontend: `http://localhost:5173`

### 3. Install Dependencies
Run from the root directory to install dependencies across all workspaces:
```bash
npm install
```

### 4. Build Shared Types
Before running apps for the first time:
```bash
npm run build:shared
```

---

## 7. Development Commands

| Command | Description |
|---|---|
| `npm run dev:backend` | Starts backend in hot-reload mode on port 4000 |
| `npm run dev:frontend` | Starts frontend in Vite dev mode on port 5173 |
| `npm run build` | Builds all packages (`shared`, `backend`, `frontend`) |
| `npm run typecheck` | Runs strict TypeScript compiler check across all packages |
| `npm test` | Executes backend, frontend, and system unit/integration tests |
| `npm run demo` | Simulates an external AI agent lifecycle against the live REST API |

---

## 8. Verifying the Health & Phase 1 Endpoints
With the backend running:

### Health Check
```bash
curl http://localhost:4000/api/health
```
Response:
```json
{
  "status": "ok",
  "service": "sentinel-api"
}
```

### External AI Agent Simulation Demo
To see Sentinel 2.0 in action with an external AI agent simulating real actions:
```bash
npm run demo
```

For complete REST API documentation including `POST /api/v1/agents`, `POST /api/v1/sessions`, and `POST /api/v1/actions`, see [Phase 1 API Specification](docs/api.md).

---

## 9. UI/UX Design Direction: "Pixel-Inspired Security Control Center"
Sentinel 2.0 uses a distinct visual language designed for clarity and focus:
* **Tactile Surfaces**: Cards with crisp borders and soft elevation (`card-tactile`).
* **Purposeful Shapes**: Smooth container radii (`rounded-2xl`) and status pills (`rounded-full`).
* **Semantic Colors**: Emerald (Safe), Sky (Watching), Amber (Attention), Orange (Approval Needed), Rose (Stopped).
* **Dual Experience Modes**:
  * **Simple Mode (Default)**: Answers *"What is happening? Is it safe? Do I need to do something?"* using accessible, non-technical language.
  * **Expert Mode**: Exposes full quantitative risk scores, trajectory velocity, and the 6-stage **Intervention Window**.
* **Zero Generic AI Clichés**: No random purple gradients, no unusable decorative widgets, and no excessive glassmorphism.

---

## 10. Security Principles
* **Backend Validation**: The client UI is purely for visualization. Security and intervention decisions are computed and validated exclusively on the backend.
* **Credentials Kept Server-Side**: Gemini API keys and Supabase service keys are server-only. They are never transmitted to the frontend bundle.
* **Zero Hardcoded Secrets**: Secrets are loaded from `.env` files which are strictly excluded by `.gitignore`.

---

## 11. Current Implementation Status
- [x] **Phase 0**: Monorepo workspaces, design tokens, health endpoint, CI pipeline, testing harnesses
- [x] **Phase 1**: Core agent identity registry, session management, action ingestion pipeline, deterministic policy decisions (`ALLOW`, `MONITOR`, `WARN`, `CONFIRM`, `BLOCK`), external agent simulation demo script, frontend views for Agents, Sessions, and Live Actions
- [ ] *Phase 2 (Pending)*: Supabase database persistence & audit logging
- [ ] *Phase 3 (Pending)*: Trajectory baseline & risk calculation engines
- [ ] *Phase 4 (Pending)*: Intervention intelligence & human review queue
- [ ] *Phase 5 (Pending)*: Live Gemini agent scenario lab

---

## 12. Remote Development Instructions
To reproduce this environment on a remote server, Antigravity Remote container, or GitHub Codespace:
1. Ensure Node.js 20+ is installed: `node -v`
2. Run `npm install`
3. Run `npm run build`
4. Run `npm test`
5. Start development servers with `npm run dev:backend` and `npm run dev:frontend`
All path resolution uses relative POSIX paths or TypeScript path mappings.
