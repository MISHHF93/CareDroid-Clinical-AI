# 🚀 Backend Startup Guide

## Quick Start

```bash
cd /workspaces/CareDroid-Ai/backend

# Install dependencies
npm install

# Start development server
npm run start:dev

# API will be available at: http://localhost:3000 (global prefix /api)
```

## Backend Services

Your NestJS backend includes:

### Core Features
- ✅ **Authentication**: JWT tokens, 2FA, biometric auth
- ✅ **Chat**: AI conversations with tool calling
- ✅ **Clinical Tools**: Drug checker, lab interpreter, SOFA calculator
- ✅ **Emergency**: Escalation protocols, audit logging
- ✅ **Push Notifications**: Firebase Cloud Messaging
- ✅ **Real-time**: WebSocket chat, live updates

### Database
- PostgreSQL (optional, will use SQLite for dev)
- NestJS TypeORM for ORM
- Migrations support

### ML Services
- Anomaly detection service
- NLU (Natural Language Understanding) service
- Intent classification for chat

### Security
- TLS/HTTPS enforcement
- RBAC (Role-Based Access Control)
- Encryption for sensitive data
- Audit logging for all operations

## Configuration

### Environment Variables

Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/caredroid
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h

# Firebase
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-key
FIREBASE_CLIENT_EMAIL=your-email

# API
PORT=3000

# CORS / OAuth redirects (Vite dev server)
FRONTEND_URL=http://localhost:8000

# AI Models
OPENAI_API_KEY=your-openai-key
```

## API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/auth/2fa/setup
POST   /api/auth/2fa/verify
```

### Chat
```
POST   /api/chat/send
GET    /api/chat/conversations
GET    /api/chat/conversations/:id
WebSocket: /chat/:conversationId
```

### Tools
```
POST   /api/tools/drug-checker
POST   /api/tools/lab-interpreter
POST   /api/tools/sofa-calculator
```

### Health
```
GET    /api/health
GET    /api/health/db
GET    /api/health/services
```

## Testing Backend

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## Connecting Android App

### From Emulator
Backend URL: `http://10.0.2.2:8000`

### From Physical Device
Backend URL: `http://your-local-ip:8000`

Find your local IP:
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr /R "IPv4"
```

Update in Android app: `android/app/src/main/kotlin/com/caredroid/clinical/util/AppConstants.kt`

## Database Setup

### PostgreSQL (Production)

```bash
# Install PostgreSQL
# macOS
brew install postgresql@15

# Linux
sudo apt-get install postgresql postgresql-contrib

# Start service
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Create database
createdb caredroid
```

### SQLite (Development)

No setup needed! Uses file-based database automatically.

## Monitoring & Logs

### View Logs
```bash
# Development (console)
npm run start:dev

# Production
npm run start:prod | tee logs/app.log
```

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Database Status
```bash
curl http://localhost:8000/api/health/db
```

## Debugging

### Debug Mode
```bash
DEBUG=caredroid:* npm run start:dev
```

### Inspect Requests
```bash
curl -v http://localhost:8000/api/health
```

### Check Port Usage
```bash
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows
```

## Production Deployment

See `DEPLOYMENT_SUCCESS.md` for:
- Docker containerization
- Environment setup
- Health checks
- Monitoring
- Scaling strategy

## Troubleshooting

### Port 8000 Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :8000   # Windows (get PID, then taskkill)
```

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Or use SQLite (auto-created)
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Build Errors
```bash
# Clear build cache
npm run build
rm -rf dist
npm run build:prod
```

## Useful Commands

```bash
# Development
npm run start:dev          # Start with auto-reload
npm run start              # Start normally
npm run build              # Build for production
npm run build:prod         # Optimized build

# Testing
npm test                   # Run all tests
npm run test:watch        # Watch mode
npm run test:cov          # Coverage report
npm run test:e2e          # E2E tests
npm run test:e2e:watch    # E2E watch mode

# Database
npm run typeorm migration:generate -- -n CreateTables
npm run typeorm migration:run
npm run typeorm migration:revert
```

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` file
3. ✅ Setup database (PostgreSQL or SQLite)
4. ✅ Start backend: `npm run start:dev`
5. ✅ Verify health: `curl http://localhost:8000/api/health`
6. ✅ Update Android app with backend URL
7. ✅ Build and run Android app
8. ✅ Test full integration

Your backend is production-ready! 🚀
