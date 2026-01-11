#!/bin/bash

# MDJ Practice Manager Backup Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DATA_DIR="./data"
BACKUP_DIR="./backups"
LOGS_DIR="./logs"
CONFIG_DIR="./config"
RETENTION_DAYS=30
COMPRESSION_LEVEL=6

echo -e "${GREEN}💾 MDJ Practice Manager Backup Script${NC}"
echo "=============================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="mdj-backup-$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

echo -e "${GREEN}📦 Creating backup: $BACKUP_NAME${NC}"

# Function to calculate directory size
get_dir_size() {
    if [ -d "$1" ]; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

# Function to count files in directory
count_files() {
    if [ -d "$1" ]; then
        find "$1" -type f 2>/dev/null | wc -l
    else
        echo "0"
    fi
}

# Display backup information
echo -e "${GREEN}📊 Backup Information:${NC}"
echo "  Data Directory: $DATA_DIR ($(get_dir_size "$DATA_DIR"))"
echo "  Files to backup: $(count_files "$DATA_DIR")"
echo "  Backup Location: $BACKUP_FILE"
echo "  Compression Level: $COMPRESSION_LEVEL"

# Check if data directory exists
if [ ! -d "$DATA_DIR" ]; then
    echo -e "${YELLOW}⚠️  Data directory not found: $DATA_DIR${NC}"
    echo "Creating empty backup..."
    mkdir -p "$DATA_DIR"
fi

# Create backup manifest
MANIFEST_FILE="$BACKUP_DIR/$BACKUP_NAME.manifest"
echo "# MDJ Practice Manager Backup Manifest" > "$MANIFEST_FILE"
echo "# Created: $(date)" >> "$MANIFEST_FILE"
echo "# Backup: $BACKUP_NAME" >> "$MANIFEST_FILE"
echo "" >> "$MANIFEST_FILE"

# Add directory information to manifest
echo "## Directory Structure" >> "$MANIFEST_FILE"
if [ -d "$DATA_DIR" ]; then
    find "$DATA_DIR" -type d | sort >> "$MANIFEST_FILE"
fi

echo "" >> "$MANIFEST_FILE"
echo "## File Counts by Directory" >> "$MANIFEST_FILE"
if [ -d "$DATA_DIR" ]; then
    for dir in "$DATA_DIR"/*; do
        if [ -d "$dir" ]; then
            count=$(count_files "$dir")
            size=$(get_dir_size "$dir")
            echo "$(basename "$dir"): $count files ($size)" >> "$MANIFEST_FILE"
        fi
    done
fi

# Create the backup
echo -e "${GREEN}🔄 Creating compressed backup...${NC}"
START_TIME=$(date +%s)

# Use tar with compression
tar -czf "$BACKUP_FILE" \
    --exclude="*.tmp" \
    --exclude="*.log" \
    --exclude="node_modules" \
    --exclude=".git" \
    -C "." \
    "$(basename "$DATA_DIR")" 2>/dev/null || {
    echo -e "${RED}❌ Backup creation failed${NC}"
    exit 1
}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Get backup file size
BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "  Duration: ${DURATION}s"

# Update manifest with backup information
echo "" >> "$MANIFEST_FILE"
echo "## Backup Information" >> "$MANIFEST_FILE"
echo "File: $BACKUP_FILE" >> "$MANIFEST_FILE"
echo "Size: $BACKUP_SIZE" >> "$MANIFEST_FILE"
echo "Duration: ${DURATION}s" >> "$MANIFEST_FILE"
echo "Compression: gzip level $COMPRESSION_LEVEL" >> "$MANIFEST_FILE"

# Verify backup integrity
echo -e "${GREEN}🔍 Verifying backup integrity...${NC}"
if tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backup integrity verified${NC}"
    echo "Integrity: OK" >> "$MANIFEST_FILE"
else
    echo -e "${RED}❌ Backup integrity check failed${NC}"
    echo "Integrity: FAILED" >> "$MANIFEST_FILE"
    exit 1
fi

# Clean up old backups
echo -e "${GREEN}🧹 Cleaning up old backups...${NC}"
DELETED_COUNT=0

if [ -d "$BACKUP_DIR" ]; then
    # Find and delete backups older than retention period
    find "$BACKUP_DIR" -name "mdj-backup-*.tar.gz" -type f -mtime +$RETENTION_DAYS -print0 | while IFS= read -r -d '' file; do
        echo "  Deleting old backup: $(basename "$file")"
        rm -f "$file"
        # Also delete corresponding manifest
        manifest_file="${file%.tar.gz}.manifest"
        [ -f "$manifest_file" ] && rm -f "$manifest_file"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    done
fi

# List current backups
echo -e "${GREEN}📋 Current Backups:${NC}"
if [ -d "$BACKUP_DIR" ]; then
    ls -lah "$BACKUP_DIR"/mdj-backup-*.tar.gz 2>/dev/null | while read -r line; do
        echo "  $line"
    done
else
    echo "  No backups found"
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0B")
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/mdj-backup-*.tar.gz 2>/dev/null | wc -l)

echo ""
echo -e "${GREEN}📊 Backup Summary:${NC}"
echo "  Total backups: $BACKUP_COUNT"
echo "  Total size: $TOTAL_SIZE"
echo "  Retention: $RETENTION_DAYS days"
echo "  Latest backup: $BACKUP_NAME ($BACKUP_SIZE)"

# Optional: Upload to cloud storage
if [ -n "$BACKUP_CLOUD_UPLOAD" ] && [ "$BACKUP_CLOUD_UPLOAD" = "true" ]; then
    echo -e "${GREEN}☁️  Uploading to cloud storage...${NC}"
    
    # Example for AWS S3 (uncomment and configure as needed)
    # aws s3 cp "$BACKUP_FILE" "s3://your-backup-bucket/mdj-backups/"
    # aws s3 cp "$MANIFEST_FILE" "s3://your-backup-bucket/mdj-backups/"
    
    # Example for Google Cloud Storage (uncomment and configure as needed)
    # gsutil cp "$BACKUP_FILE" "gs://your-backup-bucket/mdj-backups/"
    # gsutil cp "$MANIFEST_FILE" "gs://your-backup-bucket/mdj-backups/"
    
    echo -e "${YELLOW}⚠️  Cloud upload not configured${NC}"
fi

# Optional: Send notification
if [ -n "$BACKUP_NOTIFICATION_EMAIL" ]; then
    echo -e "${GREEN}📧 Sending notification...${NC}"
    
    # Example email notification (requires mail command)
    # echo "MDJ Practice Manager backup completed successfully.
    # 
    # Backup: $BACKUP_NAME
    # Size: $BACKUP_SIZE
    # Duration: ${DURATION}s
    # Location: $BACKUP_FILE" | mail -s "MDJ Backup Completed" "$BACKUP_NOTIFICATION_EMAIL"
    
    echo -e "${YELLOW}⚠️  Email notification not configured${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Backup process completed successfully!${NC}"
echo "Backup file: $BACKUP_FILE"
echo "Manifest file: $MANIFEST_FILE"

# Exit with success
exit 0