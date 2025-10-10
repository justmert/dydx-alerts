# dYdX v4 Alert System

Real-time monitoring and custom alerts for dYdX v4 traders. Track positions, set up flexible alert rules, and receive notifications across multiple channels.

## Features

- **Real-time Position Monitoring**: Track multiple subaccounts with live updates from dYdX v4 Indexer
- **Flexible Alert Rules**: Create custom alerts based on margin ratio, equity, free collateral, liquidation distance, and individual positions
- **Multi-Channel Notifications**: Telegram, Discord, Slack, Email, PagerDuty, and Custom Webhooks
- **Comprehensive Dashboard**: Monitor all your positions, view alert history, and manage notification channels
- **Advanced Risk Metrics**: Real-time calculations of margin requirements, liquidation prices, and unrealized PnL

## Tech Stack

- **Backend**: FastAPI (Python 3.9+), SQLAlchemy, AsyncIO
- **Frontend**: Next.js 14 (TypeScript), TailwindCSS, Radix UI
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Authentication**: Supabase Auth
- **Real-time**: WebSocket for position updates

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Supabase account (for authentication)

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python -m app.main
```

Backend runs on `http://localhost:8021`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Frontend runs on `http://localhost:8022`

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=sqlite:///./app.db

# dYdX Indexer
DYDX_INDEXER_REST_URL=https://indexer.dydx.trade/v4
DYDX_INDEXER_WS_URL=wss://indexer.dydx.trade/v4/ws

# Authentication
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SECRET_KEY=your_secret_key_here

# Monitoring
ENABLE_MONITOR=true

# CORS
CORS_ORIGINS=["http://localhost:8022","https://yourdomain.com"]
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8021
NEXT_PUBLIC_WS_URL=ws://localhost:8021
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:8022
```

## Usage

1. Visit `http://localhost:8022` and register an account
2. Add your dYdX subaccounts to monitor
3. Configure notification channels (Telegram, Discord, etc.)
4. Create custom alert rules with flexible conditions (margin ratio, equity, positions, etc.)
5. Receive real-time alerts when conditions are met

## API Documentation

Key endpoints:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/subaccounts` - List monitored subaccounts
- `POST /api/subaccounts` - Add subaccount to monitor
- `GET /api/subaccounts/{id}/status` - Get real-time metrics
- `GET /api/channels` - List notification channels
- `GET /api/alert-rules` - List alert rules
- `POST /api/alert-rules` - Create custom alert rule
- `GET /api/markets` - Get market data with oracle prices
- `WS /ws` - WebSocket for real-time position updates

Full API docs: `http://localhost:8021/docs` (FastAPI auto-generated)

## Deployment

### Docker Compose (Recommended)

```bash
# Create .env.docker with your configuration
docker compose up -d
```

Services will be available at:
- Backend: `http://localhost:8021`
- Frontend: `http://localhost:8022`

### Manual Deployment

**Backend** (Railway, Render, AWS EC2):
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend** (Netlify, Vercel):
```bash
npm run build
```

Update environment variables in your deployment platform.

## Development

### Run Tests

Backend:
```bash
cd backend
pytest
```

Frontend:
```bash
cd frontend
npm run lint
```

### Code Formatting

Python (Black):
```bash
cd backend
black .
```

TypeScript (Prettier):
```bash
cd frontend
npm run format
```

## Project Structure

```
dydx/
├── backend/
│   ├── app/
│   │   ├── api/              # REST & WebSocket endpoints
│   │   ├── models/           # SQLAlchemy models
│   │   ├── services/         # Business logic (monitor, alerts, notifications)
│   │   └── core/             # Config, database, security
│   └── tests/
├── frontend/
│   ├── app/                  # Next.js pages
│   ├── components/           # React components
│   └── lib/                  # API client, utilities
└── README.md
```

## License

This project is licensed under the **Business Source License 1.1** (BSL 1.1).

### What This Means

- **Free for non-commercial use**: You can use, modify, and self-host this software for personal projects, development, and internal use
- **Commercial use requires a license**: You cannot offer this software as a SaaS product, bundle it in a commercial offering, or use it as part of consulting services without a separate commercial license
- **Becomes open source in 4 years**: On October 10, 2029, this software automatically converts to the Apache License 2.0

See the [LICENSE](LICENSE) file for full details.

## Author

Mert Köklü - [@devmertt](https://twitter.com/devmertt)
