# Technology Stack

## Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript 5.3+
- **UI Library**: React 18.2+
- **Styling**: Custom CSS with CSS variables (dark + gold theme)
- **Forms**: react-hook-form
- **Data Fetching**: react-query, axios
- **Calendar**: FullCalendar
- **Animations**: Lottie, Framer Motion

## Backend
- **Framework**: NestJS 10+
- **Language**: TypeScript 5.1+
- **Architecture**: Modular with feature-based modules
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI
- **Authentication**: Passport.js with JWT
- **Scheduling**: @nestjs/schedule

## Database & Storage
- **Primary**: File-based JSON storage (development default)
- **Optional**: PostgreSQL with Prisma ORM (production recommended)
- **File Storage**: Native filesystem with automatic backups

## External Integrations
- **AI**: OpenAI API (GPT models for M Assist)
- **Companies House**: UK company data integration
- **Document Generation**: Puppeteer (PDF), Handlebars (templates with helpers), docx, pdfmake

## Development Tools
- **Package Manager**: npm 9+ (workspaces)
- **Build Tool**: Makefile for common tasks
- **Testing**: Jest (unit & e2e)
- **Linting**: ESLint
- **Type Checking**: TypeScript strict mode

## Common Commands

### Development
```bash
make dev          # Start both API and web servers
make dev-api      # Start API only (port 3001)
make dev-web      # Start web only (port 3000)
```

### Building
```bash
make build        # Build all applications
npm run build:api # Build API only
npm run build:web # Build web only
```

### Testing
```bash
make test         # Run all tests
npm run test:api  # API unit tests
npm run test:e2e  # API e2e tests (from apps/api)
```

### Database (Optional)
```bash
make db-up        # Start PostgreSQL container
make db-down      # Stop PostgreSQL
make db-reset     # Reset database (destroys data)
cd apps/api && npm run prisma:migrate  # Run migrations
cd apps/api && npm run prisma:studio   # Open Prisma Studio
```

### Installation
```bash
make install      # Install all dependencies
```

### Cleanup
```bash
make clean        # Remove node_modules and build artifacts
```

## Environment Variables

### API (.env in apps/api/)
- `PORT`: API port (default: 3001)
- `API_PREFIX`: API route prefix (default: api/v1)
- `JWT_SECRET`: JWT signing secret
- `DATABASE_URL`: PostgreSQL connection (optional)
- `OPENAI_API_KEY`: OpenAI API key for M Assist
- `COMPANIES_HOUSE_API_KEY`: Companies House API key
- `STORAGE_PATH`: File storage location (default: ./storage)
- `BACKUP_PATH`: Backup location (default: ./backups)

### Web (.env.local in apps/web/)
- `NEXT_PUBLIC_API_URL`: API base URL (default: http://localhost:3001/api/v1)

## Code Style Conventions

- Use TypeScript strict mode
- Prefer functional components with hooks (React)
- Use NestJS decorators and dependency injection
- Validate all API inputs with class-validator DTOs
- Enable global validation pipe with whitelist and transform
- Use async/await over promises
- Follow modular architecture - one feature per module

## API Client Usage (IMPORTANT)

### Always use the centralized API client
- Import from `@/lib/api` - use `api` or `apiClient`
- **DO NOT** use direct `fetch()` calls for API requests
- **DO NOT** hardcode API URLs like `http://localhost:3001` or `http://127.0.0.1:3001`
- Use `API_BASE_URL` constant if you need the base URL

### Correct patterns:
```typescript
import { api, API_BASE_URL } from '@/lib/api';

// Good - using api client
const data = await api.get('/clients');
const result = await api.post('/clients', clientData);

// Good - for file downloads with API_BASE_URL
const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
  headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
});
```

### Incorrect patterns to avoid:
```typescript
// Bad - hardcoded URL
fetch('http://localhost:3001/api/v1/clients')

// Bad - wrong token key (should be 'accessToken' not 'token')
localStorage.getItem('token')

// Bad - inconsistent URL construction
process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
```

### Token storage
- Always use `localStorage.getItem('accessToken')` for authentication
- Never use `localStorage.getItem('token')` - this is incorrect

## Template Development (IMPORTANT)

### Template Engine
- M Practice Manager uses **Handlebars** for letter templates
- Templates support conditionals, loops, and custom helper functions
- Backward compatible with legacy `{{if:condition}}` and `{{list:key}}` syntax

### Template Syntax
```handlebars
{{#if client.isCompany}}Company content{{else}}Individual content{{/if}}
{{#each services}}{{this.kind}} - £{{this.fee}}{{/each}}
{{formatDate deadline.dueDate 'DD/MM/YYYY'}}
{{calculateAnnualTotal services}}
```

### Available Helpers
- **Date**: `formatDate`, `today`, `daysUntilDue`
- **Currency**: `currency`
- **Math**: `add`, `subtract`, `multiply`, `divide`, `calculateAnnualTotal`
- **Comparison**: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`
- **Logical**: `and`, `or`, `not`
- **String**: `uppercase`, `lowercase`, `capitalize`, `default`
- **Array**: `length`, `join`

### Template Location
- Template files: `storage/templates/files/`
- Template metadata: `storage/templates/metadata/`
- See `apps/api/src/modules/templates/HANDLEBARS_HELPERS.md` for full documentation
