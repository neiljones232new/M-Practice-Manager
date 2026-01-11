# Project Structure

## Monorepo Layout

```
mdj-practice-manager/
├── apps/                    # Application workspaces
│   ├── api/                # NestJS backend
│   └── web/                # Next.js frontend
├── storage/                # File-based data storage (dev)
├── scripts/                # Utility scripts
├── docs/                   # Documentation
├── infra/                  # Infrastructure config
└── Makefile               # Development commands
```

## Backend Structure (apps/api/)

```
apps/api/
├── src/
│   ├── modules/           # Feature modules (primary organization)
│   │   ├── auth/         # Authentication & authorization
│   │   ├── clients/      # Client management
│   │   ├── services/     # Service tracking
│   │   ├── tasks/        # Task management
│   │   ├── calendar/     # Calendar & events
│   │   ├── documents/    # Document management
│   │   ├── reports/      # Report generation
│   │   ├── assist/       # AI-powered assistance
│   │   ├── companies-house/  # Companies House integration
│   │   ├── integrations/ # External integrations
│   │   ├── templates/    # Template management
│   │   ├── file-storage/ # File storage service
│   │   ├── dashboard/    # Dashboard data
│   │   ├── audit/        # Audit logging
│   │   └── security/     # Security utilities
│   ├── prisma/           # Prisma service (optional DB)
│   ├── app.module.ts     # Root module
│   └── main.ts           # Application bootstrap
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
└── test/                 # E2E tests
```

### Module Structure Pattern

Each feature module follows this structure:
```
module-name/
├── module-name.module.ts      # Module definition
├── module-name.controller.ts  # HTTP endpoints
├── module-name.service.ts     # Business logic
├── dto/                       # Data transfer objects
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
├── interfaces/                # TypeScript interfaces
└── *.spec.ts                  # Unit tests
```

## Frontend Structure (apps/web/)

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── login/       # Login page
│   │   ├── register/    # Registration page
│   │   ├── forgot-password/ # Password reset
│   │   ├── dashboard/   # Dashboard page
│   │   ├── clients/     # Client pages
│   │   ├── calendar/    # Calendar pages
│   │   ├── documents/   # Document pages
│   │   ├── templates/   # Template pages
│   │   ├── services/    # Service pages
│   │   ├── tasks/       # Task pages
│   │   ├── compliance/  # Compliance tracking
│   │   ├── people/      # People/parties management
│   │   ├── companies-house/ # Companies House integration
│   │   ├── letters/     # Letter generation
│   │   ├── audit/       # Audit logs
│   │   ├── settings/    # Settings pages
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Home page
│   ├── components/       # React components
│   │   ├── mdj-ui/      # MDJ-specific UI components
│   │   ├── ClientSelect.tsx
│   │   ├── LazyComponents.tsx
│   │   └── NativeShutdownButton.tsx
│   ├── contexts/         # React contexts
│   │   ├── AuthContext.tsx
│   │   └── BrandingContext.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useClientData.ts
│   ├── lib/              # Utilities and helpers
│   │   ├── api.ts       # API client
│   │   └── types.ts     # TypeScript type definitions
│   └── styles/           # Global styles
│       ├── mdjnew.ui.css # Main stylesheet
│       └── client-display.css # Client display styles
├── public/               # Static assets
│   └── mdj_goldlogo.png
└── (tests co-located in __tests__/ folders)
```

## Storage Structure (File-based)

```
storage/
├── clients/              # Client records (JSON)
│   ├── portfolio-1/     # Portfolio 1 clients
│   ├── portfolio-2/     # Portfolio 2 clients
│   └── ...              # Up to portfolio-10
├── people/               # Person records
├── client-parties/       # Client-party relationships
├── services/             # Service records
├── tasks/                # Task records
├── service-templates/    # Service templates (cleaned)
├── task-templates/       # Task templates (cleaned)
├── calendar/             # Calendar events
│   └── events/
├── documents/            # Document storage
│   ├── files/           # Actual files
│   └── metadata/        # Document metadata
├── templates/            # Template files
│   ├── files/           # Template content
│   ├── metadata/        # Template metadata
│   └── history/         # Template version history
├── compliance/           # Compliance tracking
├── events/               # Event records
├── tax-calculations/     # Tax calculation records
├── accounts-sets/        # Accounts production sets
├── assist/               # AI assistant cached responses
├── audit-logs/           # Audit trail records
├── user-sessions/        # User session data (cleaned)
├── users/                # User account data
├── config/               # Configuration
│   └── integrations.json
├── indexes/              # Search indexes
├── reports/              # Generated reports
├── bulk-letters-zip/     # Bulk letter generation (cleaned)
└── .locks/               # File locking mechanism
```

## Key Conventions

### API Modules
- Each feature is a self-contained NestJS module
- Controllers handle HTTP requests only
- Services contain business logic
- Use DTOs for all request/response validation
- Export interfaces for type safety

### Frontend Pages
- Use Next.js App Router (not Pages Router)
- Server components by default, client components when needed
- Co-locate tests in `__tests__/` folders within feature directories
- Use contexts for global state (Auth, Branding)
- Custom hooks for data fetching and business logic
- Auth pages (login, register, forgot-password) are at root level, not in (auth) group

### File Naming
- Backend: `kebab-case.ts` (e.g., `client.service.ts`)
- Frontend: `PascalCase.tsx` for components, `camelCase.ts` for utilities
- Tests: `*.spec.ts` (backend), `*.test.tsx` (frontend)

### Import Paths
- Frontend uses `@/` alias for `src/` directory (always use this)
- Backend uses relative imports within modules
- Shared types should be in module interfaces

### Data Flow
- Frontend → API via axios (configured in `lib/api.ts`)
- API → Storage via service layer
- Storage can be file-based (JSON) or database (Prisma)
- All API routes prefixed with `/api/v1`
