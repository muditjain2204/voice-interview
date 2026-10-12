# AI Voice Interview SaaS

A full-stack AI voice interview platform with real-time WebRTC, AI interviewer avatars, camera proctoring, and structured post-interview analysis.

## Architecture

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Real-time Voice**: LiveKit (WebRTC)
- **AI Providers**: OpenAI GPT-4o + Anthropic Claude 3.5 Sonnet
- **Camera Proctoring**: MediaPipe (face/pose detection)
- **Payments**: Stripe
- **Authentication**: Custom JWT + bcrypt

## Project Structure

```
VoiceInterview/
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API client services
│   │   └── types/         # Frontend types
│   └── package.json
├── backend/               # Node.js + Express server
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, rate limit, error handlers
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models
│   │   ├── utils/         # Utilities
│   │   └── config/        # Configuration
│   ├── prisma/            # Prisma schema and migrations
│   ├── data/              # Seed data (JSON)
│   └── package.json
└── shared/                # Shared types between FE and BE
    └── types/
```

## Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- LiveKit server (cloud or self-hosted)

### Installation

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install shared package dependencies
cd ../shared
npm install

# Run Prisma migrations
cd ../backend
npx prisma migrate dev
npx prisma db seed
```

### Environment Variables

Create `.env` files in `backend/` and `frontend/`:

**backend/.env:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/voice_interview
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
PORT=4000
NODE_ENV=development
```

**frontend/.env:**
```
VITE_API_URL=http://localhost:4000
VITE_LIVEKIT_URL=wss://...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Running

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## Features

1. **User Authentication** - Custom JWT + bcrypt
2. **Role/Company/Level Selection** - Onboarding flow
3. **Schedule Interview** - Calendar-based scheduling
4. **Live Voice Interview** - WebRTC with AI avatar
5. **Camera Proctoring** - MediaPipe anti-cheat
6. **Post-Interview Analysis** - Structured scoring & feedback
7. **Practice Mode** - Mock interviews
8. **Multi-Provider AI** - OpenAI + Anthropic fallback

## License

MIT
