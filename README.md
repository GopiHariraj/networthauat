# Net Worth Tracking Application

A comprehensive personal finance application for tracking assets, liabilities, transactions, and financial goals with real-time net worth calculation and analytics.12

## Features

- 📊 **Dashboard**: Real-time net worth tracking with trend charts
- 💰 **Assets**: Bank accounts, gold, stocks, property management
- 💳 **Liabilities**: Loan tracking with EMI schedules
- 📝 **Transactions**: Income/expense tracking with categories
- 🎯 **Goals**: Financial goal setting with progress tracking
- 📈 **Reports**: Net worth, asset allocation, spending analytics
- 📱 **PWA Support**: Install as mobile app
- 🌙 **Dark Mode**: Beautiful UI with dark theme support

## Tech Stack

### Backend
- NestJS (Node.js framework)
- Prisma (ORM)
- MariaDB (Database)
- JWT Authentication
- TypeScript

### Frontend
- Next.js 14+ (React framework)
- Tailwind CSS
- shadcn/ui components
- Recharts (Charts)
- PWA support

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (recommended)
- npm or yarn

### Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd networth-app
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
docker-compose exec backend npx prisma migrate dev
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api

### Option 2: Local Development

#### Backend Setup

1. Navigate to backend:
```bash
cd networth-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run migrations:
```bash
npx prisma migrate dev
```

5. Start the backend:
```bash
npm run start:dev
```

#### Frontend Setup

1. Navigate to frontend:
```bash
cd networth-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Start the frontend:
```bash
npm run dev
```

## Project Structure

```
networth-app/
├── networth-backend/       # NestJS API
│   ├── prisma/            # Database schema & migrations
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── assets/        # Assets management
│   │   ├── liabilities/   # Loans & liabilities
│   │   ├── transactions/  # Transaction tracking
│   │   ├── goals/         # Financial goals
│   │   ├── networth/      # Net worth calculations
│   │   └── reports/       # Reports & analytics
│   └── ...
├── networth-frontend/     # Next.js App
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities & API clients
│   │   └── types/        # TypeScript types
│   └── ...
└── docker-compose.yml    # Docker orchestration
```

## Database Schema

See `networth-backend/prisma/schema.prisma` for the complete database schema including:
- Users & Authentication
- Bank Accounts, Gold, Stocks, Property
- Loans & EMI tracking
- Transactions & Categories
- Net Worth Snapshots
- Financial Goals
- Audit Logs

## API Documentation

Once the backend is running, access the Swagger API documentation at:
```
http://localhost:3001/api
```

## Development Roadmap

### Phase 0: Foundation ✅
- [x] Project setup
- [x] Database schema
- [x] Docker configuration

### Phase 1: MVP (Current)
- [ ] Authentication system
- [ ] Assets management (Bank, Gold, Stocks, Property)
- [ ] Liabilities tracking
- [ ] Transaction logging
- [ ] Dashboard with net worth
- [ ] Basic reports

### Phase 2: Advanced Features
- [ ] Financial goals with projections
- [ ] Advanced charts & analytics
- [ ] PWA installation
- [ ] CSV import/export

### Phase 3: Automation
- [ ] Auto price updates (stocks, gold)
- [ ] Budget alerts
- [ ] Spending insights
- [ ] Multi-currency support

## Security

- Passwords hashed with argon2
- JWT-based authentication with refresh tokens
- Input validation on all endpoints
- CORS protection
- Rate limiting
- Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
