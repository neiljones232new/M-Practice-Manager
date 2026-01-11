#!/bin/bash

# MDJ Practice Manager Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"
BACKUP_DIR="./backups"
DATA_DIR="./data"
LOGS_DIR="./logs"

echo -e "${GREEN}🚀 MDJ Practice Manager Deployment Script${NC}"
echo "=================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Environment file $ENV_FILE not found${NC}"
    echo "Creating template environment file..."
    cat > "$ENV_FILE" << EOF
# Production Environment Variables
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=${OPENAI_API_KEY}
COMPANIES_HOUSE_API_KEY=your-companies-house-api-key
HMRC_API_KEY=your-hmrc-api-key

# Database (if using external database)
# DATABASE_URL=postgresql://user:password@localhost:5432/mdj_practice_manager

# Email (if using email notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Monitoring (optional)
# SENTRY_DSN=your-sentry-dsn
EOF
    echo -e "${YELLOW}⚠️  Please edit $ENV_FILE with your actual values before continuing${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${GREEN}📁 Creating directories...${NC}"
mkdir -p "$DATA_DIR" "$LOGS_DIR" "$BACKUP_DIR" "nginx/ssl"

# Set proper permissions
chmod 755 "$DATA_DIR" "$LOGS_DIR" "$BACKUP_DIR"

# Check if SSL certificates exist
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
    echo "Generating self-signed certificates for development..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=UK/ST=London/L=London/O=MDJ Practice Manager/CN=localhost"
    echo -e "${YELLOW}⚠️  For production, replace with proper SSL certificates${NC}"
fi

# Function to create backup
create_backup() {
    if [ -d "$DATA_DIR" ] && [ "$(ls -A $DATA_DIR)" ]; then
        echo -e "${GREEN}💾 Creating backup...${NC}"
        BACKUP_NAME="mdj-backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$DATA_DIR" .
        echo -e "${GREEN}✅ Backup created: $BACKUP_DIR/$BACKUP_NAME.tar.gz${NC}"
    fi
}

# Function to restore backup
restore_backup() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Please specify backup file${NC}"
        return 1
    fi
    
    if [ ! -f "$1" ]; then
        echo -e "${RED}❌ Backup file not found: $1${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🔄 Restoring backup: $1${NC}"
    tar -xzf "$1" -C "$DATA_DIR"
    echo -e "${GREEN}✅ Backup restored${NC}"
}

# Function to deploy
deploy() {
    echo -e "${GREEN}🚀 Starting deployment...${NC}"
    
    # Create backup before deployment
    create_backup
    
    # Pull latest images
    echo -e "${GREEN}📥 Pulling latest images...${NC}"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    # Build and start services
    echo -e "${GREEN}🔨 Building and starting services...${NC}"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build
    
    # Wait for services to be healthy
    echo -e "${GREEN}⏳ Waiting for services to be healthy...${NC}"
    sleep 30
    
    # Check service health
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy"; then
        echo -e "${RED}❌ Some services are unhealthy${NC}"
        docker-compose -f "$COMPOSE_FILE" ps
        exit 1
    fi
    
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Application should be available at: https://localhost${NC}"
}

# Function to stop services
stop() {
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    docker-compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Function to show logs
logs() {
    docker-compose -f "$COMPOSE_FILE" logs -f "${1:-}"
}

# Function to show status
status() {
    echo -e "${GREEN}📊 Service Status:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo -e "\n${GREEN}📈 Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
}

# Function to update
update() {
    echo -e "${GREEN}🔄 Updating application...${NC}"
    
    # Create backup
    create_backup
    
    # Pull latest code (if using git)
    if [ -d ".git" ]; then
        echo -e "${GREEN}📥 Pulling latest code...${NC}"
        git pull
    fi
    
    # Rebuild and restart
    deploy
}

# Function to cleanup
cleanup() {
    echo -e "${GREEN}🧹 Cleaning up...${NC}"
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove old backups (keep last 10)
    if [ -d "$BACKUP_DIR" ]; then
        cd "$BACKUP_DIR"
        ls -t *.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm --
        cd - > /dev/null
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    Deploy the application"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  logs      Show logs (optionally specify service name)"
    echo "  update    Update and redeploy the application"
    echo "  backup    Create a backup"
    echo "  restore   Restore from backup (specify backup file)"
    echo "  cleanup   Clean up unused Docker resources and old backups"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 logs api"
    echo "  $0 restore backups/mdj-backup-20231201-120000.tar.gz"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 5
        deploy
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    update)
        update
        ;;
    backup)
        create_backup
        ;;
    restore)
        restore_backup "$2"
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac