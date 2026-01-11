# Requirements Document

## Introduction

This document outlines the requirements for resolving authentication access issues in the MDJ Practice Manager application, specifically addressing the inability to login due to API server connectivity and missing user data.

## Glossary

- **API Server**: The NestJS backend application running on port 3001 that handles authentication requests
- **Web Client**: The Next.js frontend application running on localhost:3000 that provides the user interface
- **File Storage System**: The JSON-based data persistence layer used by the API Server
- **Auth Service**: The authentication service module responsible for user login, registration, and session management
- **Demo Mode**: A special authentication mode that allows users to explore the application without creating an account

## Requirements

### Requirement 1: API Server Availability

**User Story:** As a user, I want the API server to be running so that I can authenticate and access the application

#### Acceptance Criteria

1. WHEN the application is started, THE API Server SHALL be running on port 3001
2. WHEN the application is started, THE Web Client SHALL be accessible on localhost:3000
3. WHEN the Web Client attempts to connect to the API Server, THE API Server SHALL respond with valid HTTP responses
4. IF the API Server is not running, THEN THE Web Client SHALL display a clear error message indicating connectivity issues
5. THE API Server SHALL log startup confirmation messages to indicate successful initialization

### Requirement 2: User Data Initialization

**User Story:** As a new user, I want to be able to register an account so that I can access the application with my credentials

#### Acceptance Criteria

1. WHEN a user submits valid registration data, THE Auth Service SHALL create a new user record in the File Storage System
2. THE Auth Service SHALL create a users directory in the data folder if it does not exist
3. WHEN a user is created, THE Auth Service SHALL hash the password using bcrypt with 12 salt rounds
4. THE Auth Service SHALL assign default role and portfolio values to new users
5. WHEN user creation is successful, THE Auth Service SHALL return authentication tokens to the Web Client

### Requirement 3: Login Functionality

**User Story:** As a registered user, I want to login with my email and password so that I can access my account

#### Acceptance Criteria

1. WHEN a user submits valid login credentials, THE Auth Service SHALL verify the email and password
2. IF the credentials are invalid, THEN THE Auth Service SHALL return an "Invalid credentials" error
3. IF the user account is inactive, THEN THE Auth Service SHALL return an "Account is deactivated" error
4. WHEN login is successful, THE Auth Service SHALL generate access and refresh tokens
5. THE Auth Service SHALL create a user session record in the File Storage System
6. THE Web Client SHALL store the tokens and user data in localStorage

### Requirement 4: Demo Mode Access

**User Story:** As a visitor, I want to explore the application in demo mode so that I can evaluate its features without registering

#### Acceptance Criteria

1. WHEN a user clicks the "Explore Demo" button, THE Web Client SHALL request a demo user from the API Server
2. THE API Server SHALL return a pre-configured demo user with appropriate permissions
3. THE Web Client SHALL store demo mode indicators in sessionStorage
4. WHILE in demo mode, THE Web Client SHALL allow full feature access without requiring authentication
5. WHEN the user logs out of demo mode, THE Web Client SHALL clear all demo mode data from sessionStorage

### Requirement 5: Error Handling and User Feedback

**User Story:** As a user experiencing login issues, I want clear error messages so that I can understand and resolve the problem

#### Acceptance Criteria

1. IF the API Server is unreachable, THEN THE Web Client SHALL display "Unable to connect to server" message
2. IF login fails due to invalid credentials, THEN THE Web Client SHALL display "Invalid email or password" message
3. IF registration fails due to existing email, THEN THE Web Client SHALL display "User with this email already exists" message
4. THE Web Client SHALL display loading states during authentication requests
5. THE Web Client SHALL clear error messages when the user retries authentication
