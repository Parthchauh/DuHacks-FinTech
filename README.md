# OptiWealth - Intelligent Portfolio Rebalancing Platform

> **DuHacks 5.0** | Modern Portfolio Theory meets AI-powered insights

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)

---

## 📁 Project Structure

```
OptiWealth/
├── backend/                    # FastAPI Backend
│   ├── routers/               # API Endpoints (HTTP Layer)
│   │   ├── auth.py            # Authentication & MFA
│   │   ├── portfolio.py       # Portfolio CRUD
│   │   ├── analytics.py       # Metrics & Calculations
│   │   ├── import_data.py     # File Import (CSV/Excel)
│   │   ├── export.py          # PDF/Excel Export
│   │   ├── ai.py              # AI Insights
│   │   └── ...
│   ├── services/              # Business Logic (Core)
│   │   ├── auth_service.py    # Argon2id, JWT, OTP
│   │   ├── quant_service.py   # MPT, Sharpe, Monte Carlo
│   │   ├── stock_service.py   # Price API Integration
│   │   ├── ai_service.py      # OpenAI Integration
│   │   ├── email_service.py   # Brevo SMTP
│   │   └── ...
│   ├── middleware/            # Request Processing
│   │   └── security.py        # Rate Limiting, Headers
│   ├── models.py              # SQLAlchemy ORM Models
│   ├── schemas.py             # Pydantic Validation
│   ├── config.py              # Environment Config
│   ├── database.py            # PostgreSQL Connection
│   └── main.py                # FastAPI App Entry
│
├── app/                       # Next.js Frontend (App Router)
│   ├── (auth)/               # Auth Pages (Login/Register)
│   ├── dashboard/            # Main Dashboard
│   ├── settings/             # User Settings
│   └── layout.tsx            # Root Layout (PWA)
│
├── components/               # React Components
│   ├── dashboard/            # Dashboard Cards
│   │   ├── AIInsightsCard.tsx
│   │   ├── DividendCard.tsx
│   │   ├── ExportButton.tsx
│   │   ├── ImportButton.tsx
│   │   └── TaxSummaryCard.tsx
│   └── ui/                   # Base UI Components
│
├── lib/                      # Frontend Utilities
│   ├── api.ts               # HTTP Client (JWT handling)
│   ├── store.ts             # Zustand State Management
│   └── utils.ts             # Helper Functions
│
└── public/                  # Static Assets (PWA)
    ├── manifest.json
    └── sw.js                # Service Worker
```

---

## 🧠 Core Algorithms

### Modern Portfolio Theory (MPT)

Location: `backend/services/quant_service.py`

```python
# Efficient Frontier Optimization
# Uses scipy.optimize to find weight combinations that
# maximize Sharpe Ratio (return/volatility) for given
# risk levels. The curve represents optimal portfolios.
```

### Risk Metrics

- **Sharpe Ratio**: Risk-adjusted returns (excess return / volatility)
- **Beta**: Systematic risk vs market (NIFTY 50)
- **Alpha**: CAPM excess returns
- **VaR**: Value at Risk via Monte Carlo simulation

---

## 🔐 Security Features

| Feature            | Implementation                   |
| ------------------ | -------------------------------- |
| Password Hashing   | Argon2id (OWASP recommended)     |
| Authentication     | JWT Access + Refresh tokens      |
| MFA                | Email OTP / TOTP (Authenticator) |
| Rate Limiting      | Per-IP request throttling        |
| File Scanning      | VirusTotal API integration       |
| Input Sanitization | XSS/SQL injection prevention     |

---

## 🚀 Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # Configure database & API keys
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
npm install
npm run dev                 # http://localhost:3000
```

---

## 📧 Email Configuration (Brevo)

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=xkeysib-xxx    # API key from Brevo
FROM_EMAIL=your@email.com
```

---

## 📖 API Documentation

Once running: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## 🎯 Features

- ✅ Portfolio Tracking with Real-time Prices
- ✅ MPT-based Optimization & Rebalancing
- ✅ Monte Carlo Risk Simulation
- ✅ AI-powered Insights (OpenAI)
- ✅ Import from Broker Exports (CSV/Excel)
- ✅ Export to PDF/Excel
- ✅ Dividend & Tax Tracking
- ✅ PWA Support (Installable)
- ✅ Multi-Factor Authentication

---

**Built with ❤️ for DuHacks 5.0**
