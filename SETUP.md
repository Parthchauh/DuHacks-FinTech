# OptiWealth - Setup & Running Guide

## Prerequisites

1. **PostgreSQL** installed and running
2. **Node.js 18+** and npm
3. **Python 3.10+**

---

## Database Setup (PostgreSQL)

1. Install PostgreSQL from https://www.postgresql.org/download/

2. Create the database:

```bash
# Open PostgreSQL shell
psql -U postgres

# Create database
CREATE DATABASE optiwealth;

# Exit
\q
```

3. Update `.env` with your PostgreSQL credentials:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/optiwealth
```

---

## Free External APIs Used

| API               | Purpose                        | Free Tier Limits | Get Key                                      |
| ----------------- | ------------------------------ | ---------------- | -------------------------------------------- |
| **Alpha Vantage** | Stock prices, historical data  | 25 requests/day  | https://www.alphavantage.co/support/#api-key |
| **Brevo SMTP**    | Email notifications (optional) | 300 emails/day   | https://www.brevo.com/                       |

### Alpha Vantage Setup (Recommended)

1. Go to https://www.alphavantage.co/support/#api-key
2. Enter your email to get free API key
3. Add to `.env`:

```env
ALPHA_VANTAGE_API_KEY=your_key_here
```

> **Note:** Without API key, the app uses mock Indian stock data for 23+ stocks including RELIANCE, TCS, NIFTYBEES, GOLDBEES, etc.

---

## Running Commands

### Backend (FastAPI)

```bash
# Navigate to backend
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8000
```

**Backend runs at:** http://localhost:8000  
**API Docs:** http://localhost:8000/api/docs

### Frontend (Next.js)

```bash
# Navigate to project root
cd d:\OptiWealth\DuHacks-FinTech

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Frontend runs at:** http://localhost:3000

---

## Environment Files

### Backend `.env`

```env
DEBUG=True
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optiwealth
SECRET_KEY=your-super-secret-key-change-in-production
ALPHA_VANTAGE_API_KEY=your_api_key_here
RISK_FREE_RATE=0.072
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Quick Start

```bash
# Terminal 1 - Backend
cd d:\OptiWealth\DuHacks-FinTech\backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd d:\OptiWealth\DuHacks-FinTech
npm run dev
```

Then open http://localhost:3000 in your browser.
