-- MDJ Practice Manager Database Initialization
-- This script sets up the initial database structure

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial database user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mdj_app') THEN
        -- Replace with a strong password during deployment.
        CREATE ROLE mdj_app WITH LOGIN PASSWORD 'CHANGE_ME';
    END IF;
END
$$;

-- Grant permissions
GRANT CONNECT ON DATABASE mdj TO mdj_app;
GRANT USAGE ON SCHEMA public TO mdj_app;
GRANT CREATE ON SCHEMA public TO mdj_app;

-- Create initial tables will be handled by Prisma migrations
-- This file is for any custom database setup that needs to happen before Prisma

COMMENT ON DATABASE mdj IS 'MDJ Practice Manager Database - Professional practice CRM system';
