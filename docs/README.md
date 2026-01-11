# MDJ Practice Manager

Modern client CRM for professional practices (accounting, tax, payroll) with AI-powered assistance.

## Features

- **Client Management** - Comprehensive client records with Companies House integration
- **Service & Fee Tracking** - Manage services, frequencies, and annualized fees
- **Task & Deadline Management** - Track work items and compliance deadlines
- **Document Management** - Secure file storage with tagging and search
- **MDJ Assist** - AI-powered insights and automation
- **Compliance Tracking** - Automated filing deadline monitoring
- **Calendar Integration** - Schedule appointments and track deadlines
- **Dark + Gold Theme** - Professional, modern interface

## Architecture

- **Frontend**: Next.js 14 with TypeScript and App Router
- **Backend**: NestJS with modular architecture
- **Database**: PostgreSQL with Prisma ORM (optional)
- **Storage**: Native JSON file storage for development
- **AI**: OpenAI integration for MDJ Assist
- **Integrations**: Companies House, HMRC (future), GOV.UK Notify

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker Desktop (for optional PostgreSQL)
- macOS (optimized for local development)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd mdj-practice-manager
   make install
   ```

2. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your configuration
   ```

3. **Start development servers**
   ```bash
   make dev
   ```

   This starts:
   - API server on http://localhost:3001
   - Web app on http://localhost:3000
   - API docs on http://localhost:3001/api/docs

### Optional: Database Setup

For full database features (recommended for production):

```bash
# Start PostgreSQL
make db-up

# Run database migrations
cd apps/api && npm run prisma:migrate
```

## Development Commands

```bash
# Start all services
make dev

# Start individual services
make dev-api    # API only
make dev-web    # Web only

# Database management
make db-up      # Start PostgreSQL
make db-down    # Stop PostgreSQL
make db-reset   # Reset database (destroys data!)

# Build and test
make build      # Build all applications
make test       # Run all tests
make clean      # Clean build artifacts
```

## Project Structure

```
mdj-practice-manager/
├── apps/
│   ├── api/                 # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/     # Feature modules
│   │   │   ├── prisma/      # Database service
│   │   │   └── main.ts      # Application entry
│   │   └── prisma/          # Database schema
│   └── web/                 # Next.js Frontend
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   └── components/  # React components
│       └── public/          # Static assets
├── infra/                   # Infrastructure config
├── storage/                 # File-based data (development)
└── backups/                 # Data backups
```

## Configuration

### API Environment Variables

```bash
# Database (optional)
DATABASE_URL="postgresql://mdj:mdj_dev_password@localhost:5432/mdj"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"

# OpenAI (for MDJ Assist)
OPENAI_API_KEY=${OPENAI_API_KEY}

# Companies House Integration
COMPANIES_HOUSE_API_KEY="your-companies-house-api-key"

# File Storage
STORAGE_PATH="./storage"
BACKUP_PATH="./backups"
```

### Integration Setup

1. **OpenAI (MDJ Assist)**
   - Get API key from https://platform.openai.com/
   - Add to `OPENAI_API_KEY` in `.env`

2. **Companies House**
   - Register at https://developer.company-information.service.gov.uk/
   - Add to `COMPANIES_HOUSE_API_KEY` in `.env`

3. **HMRC (Future)**
   - Register HMRC developer app
   - Add client credentials to `.env`

## Data Storage

MDJ Practice Manager supports two storage modes:

### File-Based Storage (Default)
- JSON files in `./storage/` directory
- Automatic backups in `./backups/`
- Perfect for development and small practices
- No database setup required

### Database Storage (Optional)
- PostgreSQL with Prisma ORM
- Better performance for large datasets
- Full ACID compliance
- Recommended for production

## API Documentation

When running in development mode, API documentation is available at:
http://localhost:3001/api/docs

### Client Reports

MDJ Practice Manager includes a powerful client report generation system:

- **HTML Reports**: Modern, responsive HTML reports with embedded CSS
- **PDF Export**: High-quality PDF generation using Puppeteer
- **Customizable**: Include/exclude sections based on needs
- **Template-Based**: Easy to maintain Handlebars templates

**Key Features:**
- Fixed header with MDJ branding and logo
- Professional card-based layout with gold accents
- Comprehensive client information and Companies House data
- Services, parties, and compliance tracking
- Browser preview and PDF download options

**API Endpoints:**
- `GET /documents/reports/client/:id/html` - Generate HTML report
- `GET /documents/reports/client/:id/preview` - Preview report in browser
- `POST /documents/reports/client/:id` - Generate and download PDF

See [Reports API Documentation](./docs/REPORTS_API.md) for detailed usage.

## Security

- JWT-based authentication
- Role-based access control (Admin, Manager, Staff, ReadOnly)
- File encryption for sensitive data
- Comprehensive audit logging
- API key encryption for integrations

## Testing

```bash
# Run all tests
make test

# Run specific test suites
cd apps/api && npm run test        # API unit tests
cd apps/api && npm run test:e2e    # API integration tests
cd apps/web && npm run test        # Web component tests
```

## Deployment

### Development
```bash
make dev
```

### Production
```bash
make build
make start
```

## Documentation

- [API Integration Guide](./docs/API_INTEGRATION_GUIDE.md) - Setup external integrations
- [Client Reports API](./docs/REPORTS_API.md) - Generate HTML and PDF client reports
- [User Guide](./docs/USER_GUIDE.md) - End-user documentation
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions

## Support

- Check the API documentation at `/api/docs`
- Review the technical design document
- File issues in the project repository

## License

Private - MDJ Practice Manager
© 2024 MDJ Practice Manager. All rights reserved.