# MDJ Practice Manager - Deployment Guide

## Overview

This guide covers the deployment of MDJ Practice Manager in production environments. The application uses a containerized architecture with Docker and can be deployed on various platforms.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **Memory**: Minimum 4GB RAM, 8GB+ recommended
- **Storage**: Minimum 20GB free space, SSD recommended
- **Network**: Internet connection for external API integrations

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git (for updates)
- OpenSSL (for SSL certificates)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mdj-practice-manager
```

### 2. Configure Environment

```bash
cp .env.example .env.prod
nano .env.prod  # Edit with your configuration
```

### 3. Deploy

```bash
./scripts/deploy.sh deploy
```

The application will be available at `https://localhost` (or your configured domain).

## Detailed Configuration

### Environment Variables

Create a `.env.prod` file with the following variables:

```bash
# Application
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# External APIs
OPENAI_API_KEY=${OPENAI_API_KEY}
COMPANIES_HOUSE_API_KEY=your-companies-house-api-key
HMRC_API_KEY=your-hmrc-api-key

# Optional: External Database
# DATABASE_URL=postgresql://user:password@localhost:5432/mdj_practice_manager

# Optional: Email Notifications
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password

# Optional: Monitoring
# SENTRY_DSN=your-sentry-dsn
```

### SSL Certificates

For production, replace the self-signed certificates with proper SSL certificates:

```bash
# Place your certificates in nginx/ssl/
cp your-certificate.pem nginx/ssl/cert.pem
cp your-private-key.pem nginx/ssl/key.pem
```

### Data Directory Structure

The application creates the following directory structure:

```
./data/
├── clients/          # Client data files
├── services/         # Service subscriptions
├── tasks/           # Task management
├── documents/       # Document storage
├── calendar/        # Calendar events
├── compliance/      # Compliance tracking
├── config/          # System configuration
├── events/          # Audit logs
└── snapshots/       # Data snapshots
```

## Deployment Commands

### Deploy Application

```bash
./scripts/deploy.sh deploy
```

### Stop Services

```bash
./scripts/deploy.sh stop
```

### Restart Services

```bash
./scripts/deploy.sh restart
```

### View Status

```bash
./scripts/deploy.sh status
```

### View Logs

```bash
# All services
./scripts/deploy.sh logs

# Specific service
./scripts/deploy.sh logs api
./scripts/deploy.sh logs web
./scripts/deploy.sh logs nginx
```

### Update Application

```bash
./scripts/deploy.sh update
```

### Create Backup

```bash
./scripts/deploy.sh backup
```

### Restore Backup

```bash
./scripts/deploy.sh restore backups/mdj-backup-20231201-120000.tar.gz
```

### Cleanup

```bash
./scripts/deploy.sh cleanup
```

## Production Considerations

### Security

1. **Change Default Secrets**: Update all default passwords and API keys
2. **SSL Certificates**: Use proper SSL certificates from a trusted CA
3. **Firewall**: Configure firewall to only allow necessary ports (80, 443)
4. **Updates**: Keep Docker images and host system updated
5. **Backups**: Implement regular automated backups

### Performance

1. **Resource Allocation**: Allocate sufficient CPU and memory
2. **Storage**: Use SSD storage for better performance
3. **Monitoring**: Implement monitoring and alerting
4. **Load Balancing**: Use load balancer for high availability

### Monitoring

The application includes built-in health checks:

- API Health: `https://your-domain/api/health`
- Web Health: `https://your-domain/health`

### Backup Strategy

1. **Automated Backups**: Set up cron job for regular backups
2. **Offsite Storage**: Store backups in remote location
3. **Testing**: Regularly test backup restoration
4. **Retention**: Keep multiple backup versions

Example cron job for daily backups:

```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/mdj-practice-manager/scripts/deploy.sh backup
```

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs
./scripts/deploy.sh logs

# Check Docker status
docker ps -a

# Restart services
./scripts/deploy.sh restart
```

#### SSL Certificate Issues

```bash
# Regenerate self-signed certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=UK/ST=London/L=London/O=MDJ Practice Manager/CN=your-domain.com"
```

#### Data Corruption

```bash
# Restore from backup
./scripts/deploy.sh restore backups/latest-backup.tar.gz

# Restart services
./scripts/deploy.sh restart
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Check logs for errors
./scripts/deploy.sh logs

# Cleanup unused resources
./scripts/deploy.sh cleanup
```

### Log Locations

- Application logs: `./logs/`
- Nginx logs: `./logs/nginx/`
- Docker logs: `docker-compose logs`

### Support

For additional support:

1. Check the logs for error messages
2. Review the configuration files
3. Ensure all prerequisites are met
4. Verify network connectivity for external APIs

## Advanced Configuration

### Custom Domain

1. Update DNS records to point to your server
2. Update SSL certificates for your domain
3. Update environment variables if needed

### External Database

To use an external PostgreSQL database:

1. Set `DATABASE_URL` in `.env.prod`
2. Ensure database is accessible from Docker containers
3. Run database migrations if needed

### Load Balancing

For high availability, deploy multiple instances behind a load balancer:

1. Use external load balancer (nginx, HAProxy, cloud LB)
2. Configure session affinity if needed
3. Use shared storage for data directory
4. Implement health checks

### Monitoring Integration

Integrate with monitoring systems:

1. **Prometheus**: Expose metrics endpoint
2. **Grafana**: Create dashboards
3. **Sentry**: Error tracking and monitoring
4. **ELK Stack**: Log aggregation and analysis

## Migration Guide

### From Development to Production

1. Export data from development environment
2. Set up production environment
3. Import data to production
4. Update DNS and SSL certificates
5. Test all functionality

### Version Updates

1. Create backup before update
2. Pull latest code/images
3. Run database migrations if needed
4. Restart services
5. Verify functionality

## Security Checklist

- [ ] Changed all default passwords and secrets
- [ ] Configured proper SSL certificates
- [ ] Set up firewall rules
- [ ] Enabled audit logging
- [ ] Configured backup encryption
- [ ] Implemented monitoring and alerting
- [ ] Reviewed and updated dependencies
- [ ] Configured rate limiting
- [ ] Set up intrusion detection
- [ ] Implemented access controls