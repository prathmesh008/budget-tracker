# Intelligent Budget Tracker

An automated, real-time expense tracking system that extracts transaction data directly from bank email alerts (Canara Bank) using Gmail Push Notifications (Google Cloud Pub/Sub) and visualizes the spending on a modern Next.js dashboard.

## System Architecture

The project is built on a clean Monorepo architecture separating concerns between the backend webhook listener, the data parser, and the frontend visualization.

```
budgettracker/
├── src/                      # Express Backend
│   ├── config/               # Database and environment configs
│   ├── controllers/          # Webhook routing logic
│   ├── models/               # MongoDB Schemas
│   ├── routes/               # API endpoint definitions
│   ├── services/             # Core Business Logic
│   │   ├── gmail.service.js  # OAuth2 and payload extraction
│   │   └── parser.service.js # Regex engine for transaction extraction
│   └── server.js             # Main backend entrypoint (Port 3001)
│
├── frontend/                 # Next.js Dashboard (Port 3000)
│   ├── app/                  # React components and styling
│   └── public/               # Static assets
│
├── scripts/                  # Utilities and DB Seeders
│
├── start.sh                  # One-click startup script
└── credentials.json          # Google Cloud OAuth keys (ignored in Git)
```

## Features
- **Real-Time Webhooks**: Connects to Google Cloud Pub/Sub to instantly receive push notifications the second a bank email hits your inbox.
- **Intelligent Parser**: Custom regex engine (`parser.service.js`) designed to handle 5+ different complex automated email formats from Canara Bank, including Credit Card swipes, UPI debits, and NEFT credits.
- **Dynamic Frontend Dashboard**: A glassmorphism-styled Next.js dashboard that recalculates expenses and income in real-time, featuring multi-dimensional filtering (Account Type and Date Range).

## Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster
- Google Cloud Project with the Gmail API and Pub/Sub enabled

## Setup Instructions

### 1. Environment Variables
Create a `.env` file at the root of the project containing:
```
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=budgettracker"
```

### 2. Google Credentials
Place your `credentials.json` and `token.json` (generated via the `scripts/auth.js` helper) in the root of the project.

### 3. Installation
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

## Running Locally
You can boot up the entire stack using the included shell script:
```bash
./start.sh
```
- **Backend API**: `http://localhost:3001`
- **Frontend Dashboard**: `http://localhost:3000`

## Deployment
This project is optimized for deployment on Vercel (Frontend) and Render (Backend). Please refer to the `DEPLOYMENT_GUIDE.md` for a full step-by-step walkthrough on how to deploy this stack to the public internet.
