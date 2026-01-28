# M Practice Manager - AI Coding Assistant Instructions

## Architecture Overview

**M Practice Manager** is a modern client CRM system for professional practices, built as a monorepo with:
- **Backend**: NestJS API (`apps/api/`) with PostgreSQL + Prisma ORM
- **Frontend**: Next.js 16 app (`apps/web/`) with custom MDJ UI components
- **Storage**: Hybrid approach - DB for structured data, file-based JSON storage for documents/events
- **Deployment**: Docker containers with nginx reverse proxy

### Key Components
- **Portfolios**: Multi-tenant isolation by portfolio code (integer)
- **Clients**: Core entity with Companies House integration (company data, filings, accounts)
- **Services/Tasks**: Practice management workflow (annual accounts, tax, compliance)
- **Assist**: AI-powered features using OpenAI API for document analysis and recommendations
- **File Storage**: Indexed JSON file system for fast search and caching

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install
cd apps/api && npm install
cd ../web && npm install

# Start development (runs both API + Web concurrently)
npm run dev
# Or use Makefile: make dev

# Database setup
npm run db:up  # Start PostgreSQL via docker-compose
cd apps/api && npm run prisma:migrate
```

### Key Commands
- `npm run dev` - Start both servers (API:3001, Web:3000)
- `npm run build` - Build both apps for production
- `npm run test` - Run all tests (API + Web)
- `cd apps/api && npm run prisma:studio` - Open Prisma DB GUI
- `make db-reset` - Reset PostgreSQL (destroys data)

### Environment Setup
- Copy `.env` from `start-dev.sh` template
- Required: `JWT_SECRET`, `OPENAI_API_KEY`, `COMPANIES_HOUSE_API_KEY`
- Data directory: `./mdj-data/` (auto-created by `start-dev.sh`)

## Code Patterns & Conventions

### API Layer (NestJS)
- **Modules**: Feature-based in `src/modules/` (auth, clients, tasks, etc.)
- **Controllers**: RESTful with Swagger decorators (`@ApiTags`, `@ApiOperation`)
- **Services**: Business logic with dependency injection
- **DTOs**: Validation using `class-validator` + `class-transformer`
- **Database**: Prisma client for queries, file storage for documents

### Frontend (Next.js)
- **App Router**: File-based routing in `src/app/`
- **Components**: Custom MDJ UI library (`components/mdj-ui/`) with lavender theme
- **Styling**: CSS variables in `styles/mdjnew.ui.css` (brand: #6D28D9 lavender)
- **Data Fetching**: Custom API client (`lib/api.ts`) + React Query for caching
- **Hooks**: Custom data hooks (`hooks/useClientData.ts`) with Map-based caching

### Data Flow Examples
```typescript
// API: Service with Prisma + file storage
@Injectable()
export class ClientsService {
  async findByRef(ref: string, portfolioCode: number) {
    const client = await this.prisma.client.findUnique({
      where: { ref_portfolioCode: { ref, portfolioCode } }
    });
    const fileData = await this.fileStorage.readJson('clients', client.id);
    return { ...client, ...fileData };
  }
}

// Frontend: Hook with caching
export function useClientData() {
  const [clients, setClients] = useState<Map<string, ClientData>>(new Map());
  
  const fetchClientByRef = async (ref: string) => {
    const cached = clients.get(ref);
    if (cached) return cached;
    
    const data = await api.get(`/clients/ref/${ref}`);
    setClients(prev => new Map(prev).set(ref, data));
    return data;
  };
}
```

### File Storage Pattern
- **Location**: `storage/` directory with subfolders (clients/, tasks/, etc.)
- **Format**: JSON files named by entity ID (e.g., `client_123.json`)
- **Indexing**: Automatic full-text search indexing for performance
- **Usage**: Documents, events, compliance data, cached responses

### Testing
- **API**: Jest with NestJS testing module
- **E2E**: Docker lifecycle tests in `test/` directory
- **Demo Auth**: Use `/auth/demo` endpoint for test authentication

## Integration Points

### External APIs
- **Companies House**: UK company registry data (company info, filings, accounts)
- **OpenAI**: Document analysis, recommendations, chat features
- **File Processing**: Document upload/parsing for client documents

### Cross-Component Communication
- **Web ↔ API**: RESTful HTTP with JWT auth
- **Portfolio Isolation**: All queries filtered by `portfolioCode`
- **Real-time Updates**: File storage changes trigger index updates

## Common Patterns

### Error Handling
- API: NestJS exceptions with HTTP status codes
- Frontend: Try/catch with user-friendly error messages
- Validation: DTOs with `class-validator` decorators

### Authentication
- JWT tokens with refresh mechanism
- Role-based access (user portfolios)
- Password reset flow with email tokens

### Performance
- File storage indexing for search queries
- React Query caching for API responses
- Lazy loading for large component trees

## Key Files to Reference
- `apps/api/prisma/schema.prisma` - Database schema
- `apps/web/src/lib/api.ts` - API client implementation
- `apps/web/src/styles/mdjnew.ui.css` - Design system
- `apps/api/src/modules/file-storage/` - Storage architecture
- `docker-compose.prod.yml` - Production deployment
- `Makefile` - Development shortcuts</content>
<parameter name="filePath">/Users/neiljones/Developer/M Practice Manager/.github/copilot-instructions.md