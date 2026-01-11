# MDJ Practice Manager - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Client Management](#client-management)
4. [Service Management](#service-management)
5. [Task Management](#task-management)
6. [Compliance & Filings](#compliance--filings)
7. [Document Management](#document-management)
8. [Calendar & Scheduling](#calendar--scheduling)
9. [Companies House Integration](#companies-house-integration)
10. [MDJ Assist (AI Assistant)](#mdj-assist-ai-assistant)
11. [Settings & Configuration](#settings--configuration)
12. [Tips & Best Practices](#tips--best-practices)

## Getting Started

### Logging In

1. Navigate to your MDJ Practice Manager URL
2. Choose one of the login options:
   - **Demo Mode**: Explore the system with sample data
   - **Email/Password**: Log in with your credentials
3. Click "Remember Me" to stay logged in (optional)

### First Time Setup

After logging in for the first time:

1. Visit **Settings** to configure your practice details
2. Set up external integrations (Companies House, OpenAI)
3. Create your first client or import from Companies House
4. Configure your service offerings and fee structure

## Dashboard Overview

The dashboard provides a comprehensive view of your practice:

### Key Performance Indicators (KPIs)

- **Active Clients**: Total number of active clients
- **Annual Fees**: Total annualized revenue from services
- **Active Services**: Number of ongoing service subscriptions
- **Overdue Items**: Tasks and compliance items requiring attention

### Week Ahead View

Shows upcoming tasks, deadlines, and appointments for the next 7 days.

### Priority Recommendations

AI-powered suggestions for tasks that need immediate attention.

### Quick Actions

- Create new client
- Add task
- Schedule appointment
- Generate report

## Client Management

### Creating a New Client

1. Click **Clients** in the sidebar
2. Click **New Client** button
3. Fill in client details:
   - Name and type (Company, Individual, etc.)
   - Contact information
   - Address details
   - Portfolio assignment
4. Click **Save**

The system automatically generates a unique reference code for each client.

### Managing Client Information

#### Client Details Page

Access comprehensive client information:

- **Overview**: Basic details and contact information
- **Services**: Active service subscriptions and fees
- **Tasks**: Open and completed tasks
- **Documents**: Associated files and reports
- **Parties**: Directors, shareholders, and contacts
- **Compliance**: Filing requirements and deadlines

#### Adding Client Parties

1. Go to client details page
2. Click **Add Party** in the Parties section
3. Select existing person or create new
4. Assign role (Director, Shareholder, etc.)
5. Set ownership percentage and appointment dates

### Client Search and Filtering

Use the search bar and filters to find clients:

- Search by name, reference, or email
- Filter by portfolio, status, or client type
- Sort by name, creation date, or last activity

## Service Management

### Creating Services

1. Navigate to **Services**
2. Click **New Service**
3. Configure service details:
   - Client selection
   - Service type (Accounts, VAT, Payroll, etc.)
   - Frequency (Annual, Quarterly, Monthly)
   - Fee amount
   - Description and notes

### Service Frequency and Fees

The system automatically calculates annualized fees:

- **Annual**: Fee charged once per year
- **Quarterly**: Fee × 4 for annual calculation
- **Monthly**: Fee × 12 for annual calculation
- **Weekly**: Fee × 52 for annual calculation

### Service Templates

Create reusable service templates for common offerings:

1. Go to **Settings** > **Service Templates**
2. Define standard services with default fees
3. Apply templates when creating new services

## Task Management

### Creating Tasks

1. Click **Tasks** in the sidebar
2. Click **New Task**
3. Fill in task details:
   - Title and description
   - Client association
   - Due date and priority
   - Assignee
   - Tags for organization

### Task Priorities

- **Urgent**: Requires immediate attention (red)
- **High**: Important tasks (orange)
- **Medium**: Standard priority (yellow)
- **Low**: Can be deferred (green)

### Task Filtering and Views

- Filter by assignee, client, or status
- Sort by due date, priority, or creation date
- Use tags to organize related tasks

### Automatic Task Generation

The system can automatically create tasks based on:

- Service frequencies (annual accounts, VAT returns)
- Compliance deadlines
- Calendar appointments

## Compliance & Filings

### Compliance Dashboard

View all compliance requirements:

- **Overdue**: Items past their due date
- **Upcoming**: Items due in the next 30 days
- **Filed**: Completed compliance items
- **Pending**: Items awaiting action

### Filing Types

Common compliance items include:

- Annual Accounts
- Confirmation Statements
- VAT Returns
- Corporation Tax Returns
- PAYE submissions

### Managing Compliance Items

1. Click on a compliance item to view details
2. Update status (Pending, Filed, Overdue)
3. Add notes and filing references
4. Set reminders for future deadlines

## Document Management

### Uploading Documents

1. Navigate to **Documents**
2. Click **Upload Document**
3. Select file and associate with client
4. Add tags and description
5. Choose document category

### Document Organization

Documents are organized by:

- **Client**: All documents for a specific client
- **Category**: Type of document (Accounts, Correspondence, etc.)
- **Tags**: Custom labels for easy searching
- **Date**: Upload or creation date

### Generating Reports

Create professional client reports:

1. Go to **Documents** > **Reports**
2. Select client and report type
3. Choose data to include:
   - Client information
   - Service summary
   - Task status
   - Compliance overview
4. Generate PDF report

## Calendar & Scheduling

### Calendar Views

- **Month View**: Overview of the entire month
- **Week View**: Detailed weekly schedule
- **Day View**: Hour-by-hour daily schedule

### Creating Events

1. Click **Calendar** in the sidebar
2. Click **New Event** or click on a date/time
3. Fill in event details:
   - Title and description
   - Date and time
   - Client association
   - Location and attendees
   - Event type (Meeting, Deadline, etc.)

### Event Types

- **Meeting**: Client meetings and appointments
- **Deadline**: Important due dates
- **Reminder**: Personal reminders
- **Appointment**: Scheduled appointments
- **Filing**: Compliance deadlines

### Integration with Tasks

Calendar events can be linked to tasks and compliance items for better organization.

## Companies House Integration

### Setting Up Integration

1. Go to **Settings** > **Integrations**
2. Enter your Companies House API key
3. Test the connection
4. Save configuration

### Searching Companies

1. Navigate to **Companies House**
2. Enter company name or number
3. Browse search results
4. Preview company information

### Importing Companies

1. Select company from search results
2. Choose portfolio for import
3. Review company details
4. Click **Import**

The system will:

- Create client record with company details
- Import directors and shareholders as parties
- Generate compliance items for filing deadlines
- Assign unique reference code

### Synchronizing Data

Keep company information up to date:

1. Go to client details page
2. Click **Sync with Companies House**
3. Review changes
4. Apply updates

## MDJ Assist (AI Assistant)

### Accessing MDJ Assist

Click the floating MDJ Assist button (bottom right) to open the AI assistant.

### Quick Actions

Pre-built queries for common tasks:

- **Client Summary**: Get overview of client status
- **Deadline Check**: Review upcoming deadlines
- **Task Prioritization**: Get task recommendations
- **Business Insights**: Analyze practice performance

### Custom Queries

Ask natural language questions about your practice:

- "Which clients have overdue VAT returns?"
- "What's my total annual revenue?"
- "Show me tasks due this week"
- "Which companies need their accounts filed?"

### Online vs Offline Mode

- **Online Mode**: Uses OpenAI for intelligent responses
- **Offline Mode**: Uses cached data when internet is unavailable

### Server Management

Control system services through MDJ Assist:

- Start/stop Docker containers
- Create data snapshots
- Monitor system health
- View server status

## Settings & Configuration

### Practice Details

Configure your practice information:

- Practice name and address
- Contact details
- Logo and branding
- Default settings

### User Management

Manage user accounts and permissions:

- Create user accounts
- Assign roles (Admin, Manager, Staff, ReadOnly)
- Set portfolio access
- Configure permissions

### Integrations

Set up external service connections:

- **OpenAI**: For MDJ Assist functionality
- **Companies House**: For company data import
- **HMRC**: For tax-related integrations (future)
- **Email**: For notifications and communications

### System Settings

Configure system behavior:

- Data retention policies
- Backup schedules
- Security settings
- Performance optimization

### Portfolio Management

Organize clients into portfolios:

- Create portfolio categories
- Assign portfolio codes
- Set access permissions
- Configure reporting

## Tips & Best Practices

### Client Management

- Use consistent naming conventions for clients
- Keep contact information up to date
- Regularly review and update client status
- Use tags to organize clients by industry or service type

### Task Management

- Set realistic due dates
- Use priority levels effectively
- Assign tasks to specific team members
- Review and update task status regularly

### Document Organization

- Use descriptive file names
- Apply consistent tagging
- Organize documents by client and category
- Regularly archive old documents

### Compliance Tracking

- Set up automatic reminders for deadlines
- Review compliance dashboard weekly
- Keep filing references and notes updated
- Use calendar integration for deadline tracking

### Data Security

- Regularly backup your data
- Use strong passwords
- Keep software updated
- Monitor audit logs for unusual activity

### Performance Optimization

- Regularly clean up old files
- Use compression for large documents
- Monitor system performance
- Optimize search indexes

### Integration Best Practices

- Keep API keys secure and updated
- Test integrations regularly
- Monitor API usage limits
- Have fallback procedures for service outages

## Keyboard Shortcuts

### Global Shortcuts

- `Ctrl + /`: Open search
- `Ctrl + N`: Create new (context-dependent)
- `Ctrl + S`: Save current form
- `Esc`: Close modals/drawers

### Navigation Shortcuts

- `G + D`: Go to Dashboard
- `G + C`: Go to Clients
- `G + S`: Go to Services
- `G + T`: Go to Tasks
- `G + L`: Go to Calendar

### MDJ Assist Shortcuts

- `Ctrl + K`: Open MDJ Assist
- `Ctrl + Enter`: Send message
- `Esc`: Close MDJ Assist

## Troubleshooting

### Common Issues

#### Can't Log In

- Check internet connection
- Verify credentials
- Try demo mode to test system
- Contact administrator

#### Data Not Loading

- Refresh the page
- Check network connection
- Clear browser cache
- Check system status

#### Integration Errors

- Verify API keys in settings
- Check service status
- Review error messages
- Test connection

#### Performance Issues

- Close unnecessary browser tabs
- Clear browser cache
- Check system resources
- Contact administrator

### Getting Help

- Use the built-in help system
- Check the documentation
- Contact your system administrator
- Use MDJ Assist for quick questions

## Glossary

- **Client**: A business entity or individual served by your practice
- **Party**: An individual associated with a client (director, shareholder, etc.)
- **Service**: A recurring offering provided to a client
- **Task**: A work item with assignee and due date
- **Compliance Item**: A regulatory requirement or filing deadline
- **Portfolio**: A grouping mechanism for organizing clients
- **Reference Code**: A unique identifier generated for clients and parties
- **MDJ Assist**: The AI-powered assistant integrated into the system