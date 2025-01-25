# Worsie Backend API

This is the backend API for the Worsie application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
npm run build
```

4. Run migrations:
```bash
npm run db:migrate
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm run start
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run db:migrate` - Run database migrations
- `npm run db:seed:all` - Run database seeders

## Environment Variables

See `.env.example` for all required environment variables.

## API Documentation

API endpoints documentation will be available at `/api/docs` when running the server. 