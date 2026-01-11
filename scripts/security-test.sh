#!/bin/bash

# MDJ Practice Manager Security Testing Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 MDJ Practice Manager Security Testing${NC}"
echo "=============================================="

# Test configuration
SECURITY_RESULTS_DIR="security-results"
API_URL="http://localhost:3001"
WEB_URL="http://localhost:3000"

# Create security results directory
mkdir -p "$SECURITY_RESULTS_DIR"

# Function to run security test
run_security_test() {
    local test_name="$1"
    local command="$2"
    local log_file="$SECURITY_RESULTS_DIR/${test_name}.log"
    
    echo -e "${BLUE}🔍 Running: $test_name${NC}"
    
    if eval "$command" > "$log_file" 2>&1; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        echo "   Log: $log_file"
        return 1
    fi
}

# Initialize security test results
TOTAL_SECURITY_TESTS=0
PASSED_SECURITY_TESTS=0
FAILED_SECURITY_TESTS=0

echo -e "\n${BLUE}🔐 Dependency Security Audit${NC}"

# Test 1: API Dependencies Security Audit
TOTAL_SECURITY_TESTS=$((TOTAL_SECURITY_TESTS + 1))
if run_security_test "api-security-audit" "cd apps/api && npm audit --audit-level=moderate"; then
    PASSED_SECURITY_TESTS=$((PASSED_SECURITY_TESTS + 1))
else
    FAILED_SECURITY_TESTS=$((FAILED_SECURITY_TESTS + 1))
fi

# Test 2: Web Dependencies Security Audit
TOTAL_SECURITY_TESTS=$((TOTAL_SECURITY_TESTS + 1))
if run_security_test "web-security-audit" "cd apps/web && npm audit --audit-level=moderate"; then
    PASSED_SECURITY_TESTS=$((PASSED_SECURITY_TESTS + 1))
else
    FAILED_SECURITY_TESTS=$((FAILED_SECURITY_TESTS + 1))
fi

echo -e "\n${BLUE}🔍 File System Security${NC}"

# Test 3: Check file permissions
echo -e "${BLUE}🔄 Checking file permissions${NC}"
PERMISSION_ISSUES=0

# Check for world-writable files
if find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
    echo -e "${RED}❌ Found world-writable files${NC}"
    find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" > "$SECURITY_RESULTS_DIR/world-writable-files.log"
    PERMISSION_ISSUES=$((PERMISSION_ISSUES + 1))
else
    echo -e "${GREEN}✅ No world-writable files found${NC}"
fi

# Check for executable scripts
echo -e "${BLUE}🔄 Checking executable files${NC}"
find . -type f -executable -not -path "./node_modules/*" -not -path "./.git/*" -not -name "*.sh" > "$SECURITY_RESULTS_DIR/executable-files.log"
EXECUTABLE_COUNT=$(wc -l < "$SECURITY_RESULTS_DIR/executable-files.log")
echo -e "${GREEN}📊 Found $EXECUTABLE_COUNT executable files (excluding .sh)${NC}"

# Test 4: Environment Variables Security
echo -e "\n${BLUE}🔐 Environment Variables Security${NC}"
ENV_ISSUES=0

# Check for hardcoded secrets in code
echo -e "${BLUE}🔄 Scanning for hardcoded secrets${NC}"
SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{8,}['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]{20,}['\"]"
    "secret\s*=\s*['\"][^'\"]{16,}['\"]"
    "token\s*=\s*['\"][^'\"]{20,}['\"]"
    "jwt[_-]?secret\s*=\s*['\"][^'\"]{16,}['\"]"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -i -E "$pattern" --include="*.ts" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git . > /dev/null 2>&1; then
        echo -e "${RED}❌ Potential hardcoded secret found: $pattern${NC}"
        grep -r -i -E "$pattern" --include="*.ts" --include="*.js" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git . >> "$SECURITY_RESULTS_DIR/hardcoded-secrets.log"
        ENV_ISSUES=$((ENV_ISSUES + 1))
    fi
done

if [ $ENV_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No hardcoded secrets found${NC}"
fi

# Test 5: Docker Security (if Docker is available)
if command -v docker &> /dev/null; then
    echo -e "\n${BLUE}🐳 Docker Security${NC}"
    
    # Check for running containers as root
    echo -e "${BLUE}🔄 Checking Docker container security${NC}"
    if docker ps --format "table {{.Names}}\t{{.Image}}" > "$SECURITY_RESULTS_DIR/running-containers.log" 2>/dev/null; then
        echo -e "${GREEN}✅ Docker containers listed${NC}"
    else
        echo -e "${YELLOW}⚠️  No Docker containers running${NC}"
    fi
fi

# Test 6: Network Security
echo -e "\n${BLUE}🌐 Network Security${NC}"

# Check for open ports (if netstat is available)
if command -v netstat &> /dev/null; then
    echo -e "${BLUE}🔄 Checking open ports${NC}"
    netstat -tuln > "$SECURITY_RESULTS_DIR/open-ports.log" 2>/dev/null || echo "Could not check ports"
    
    # Check for potentially dangerous open ports
    DANGEROUS_PORTS=(22 23 25 53 80 110 143 443 993 995 3306 5432 6379 27017)
    for port in "${DANGEROUS_PORTS[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            echo -e "${YELLOW}⚠️  Port $port is open${NC}"
        fi
    done
fi

# Test 7: Configuration Security
echo -e "\n${BLUE}⚙️  Configuration Security${NC}"

# Check for debug mode in production files
echo -e "${BLUE}🔄 Checking for debug configurations${NC}"
DEBUG_ISSUES=0

if grep -r -i "debug.*true\|NODE_ENV.*development" --include="*.json" --include="*.js" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git . > /dev/null 2>&1; then
    echo -e "${RED}❌ Debug mode found in configuration${NC}"
    grep -r -i "debug.*true\|NODE_ENV.*development" --include="*.json" --include="*.js" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git . > "$SECURITY_RESULTS_DIR/debug-config.log"
    DEBUG_ISSUES=$((DEBUG_ISSUES + 1))
else
    echo -e "${GREEN}✅ No debug mode found in configuration${NC}"
fi

# Test 8: SSL/TLS Configuration
echo -e "\n${BLUE}🔒 SSL/TLS Configuration${NC}"

# Check for SSL certificate files
if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
    echo -e "${GREEN}✅ SSL certificates found${NC}"
    
    # Check certificate validity (if openssl is available)
    if command -v openssl &> /dev/null; then
        echo -e "${BLUE}🔄 Checking certificate validity${NC}"
        if openssl x509 -in nginx/ssl/cert.pem -text -noout > "$SECURITY_RESULTS_DIR/ssl-cert-info.log" 2>&1; then
            EXPIRY_DATE=$(openssl x509 -in nginx/ssl/cert.pem -enddate -noout | cut -d= -f2)
            echo -e "${GREEN}📅 Certificate expires: $EXPIRY_DATE${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  SSL certificates not found${NC}"
fi

# Test 9: Input Validation Security
echo -e "\n${BLUE}🛡️  Input Validation Security${NC}"

# Check for SQL injection protection
echo -e "${BLUE}🔄 Checking for SQL injection protection${NC}"
if grep -r -i "class-validator\|joi\|yup" --include="*.ts" --include="*.js" --exclude-dir=node_modules apps/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Input validation libraries found${NC}"
else
    echo -e "${YELLOW}⚠️  No input validation libraries detected${NC}"
fi

# Check for XSS protection
echo -e "${BLUE}🔄 Checking for XSS protection${NC}"
if grep -r -i "helmet\|xss\|sanitize" --include="*.ts" --include="*.js" --exclude-dir=node_modules apps/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ XSS protection measures found${NC}"
else
    echo -e "${YELLOW}⚠️  No XSS protection measures detected${NC}"
fi

# Test 10: Authentication Security
echo -e "\n${BLUE}🔑 Authentication Security${NC}"

# Check for JWT implementation
echo -e "${BLUE}🔄 Checking JWT implementation${NC}"
if grep -r -i "jsonwebtoken\|jwt" --include="*.ts" --include="*.js" --exclude-dir=node_modules apps/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ JWT implementation found${NC}"
else
    echo -e "${YELLOW}⚠️  No JWT implementation detected${NC}"
fi

# Check for password hashing
echo -e "${BLUE}🔄 Checking password hashing${NC}"
if grep -r -i "bcrypt\|argon2\|scrypt" --include="*.ts" --include="*.js" --exclude-dir=node_modules apps/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Password hashing found${NC}"
else
    echo -e "${YELLOW}⚠️  No password hashing detected${NC}"
fi

# Generate security report
SECURITY_REPORT_FILE="$SECURITY_RESULTS_DIR/security-report.md"
echo "# MDJ Practice Manager Security Report" > "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"
echo "Generated: $(date)" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"
echo "## Security Test Summary" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"
echo "- Total Security Tests: $TOTAL_SECURITY_TESTS" >> "$SECURITY_REPORT_FILE"
echo "- Passed: $PASSED_SECURITY_TESTS" >> "$SECURITY_REPORT_FILE"
echo "- Failed: $FAILED_SECURITY_TESTS" >> "$SECURITY_REPORT_FILE"
echo "- Success Rate: $(( PASSED_SECURITY_TESTS * 100 / TOTAL_SECURITY_TESTS ))%" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"

# Add security findings
echo "## Security Findings" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"
echo "- Permission Issues: $PERMISSION_ISSUES" >> "$SECURITY_REPORT_FILE"
echo "- Environment Issues: $ENV_ISSUES" >> "$SECURITY_REPORT_FILE"
echo "- Debug Configuration Issues: $DEBUG_ISSUES" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"

# Security recommendations
echo "## Security Recommendations" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"
echo "1. Regularly update dependencies to patch security vulnerabilities" >> "$SECURITY_REPORT_FILE"
echo "2. Use environment variables for all sensitive configuration" >> "$SECURITY_REPORT_FILE"
echo "3. Implement proper input validation and sanitization" >> "$SECURITY_REPORT_FILE"
echo "4. Use HTTPS in production with valid SSL certificates" >> "$SECURITY_REPORT_FILE"
echo "5. Implement rate limiting and DDoS protection" >> "$SECURITY_REPORT_FILE"
echo "6. Regular security audits and penetration testing" >> "$SECURITY_REPORT_FILE"
echo "7. Implement proper logging and monitoring" >> "$SECURITY_REPORT_FILE"
echo "8. Use strong authentication and authorization mechanisms" >> "$SECURITY_REPORT_FILE"
echo "" >> "$SECURITY_REPORT_FILE"

# Final security summary
echo ""
echo -e "${GREEN}🔒 Security Test Summary${NC}"
echo "========================================"
echo "Total Security Tests: $TOTAL_SECURITY_TESTS"
echo "Passed: $PASSED_SECURITY_TESTS"
echo "Failed: $FAILED_SECURITY_TESTS"
echo "Success Rate: $(( PASSED_SECURITY_TESTS * 100 / TOTAL_SECURITY_TESTS ))%"
echo ""
echo "Permission Issues: $PERMISSION_ISSUES"
echo "Environment Issues: $ENV_ISSUES"
echo "Debug Configuration Issues: $DEBUG_ISSUES"
echo ""
echo "Security report: $SECURITY_REPORT_FILE"
echo "Security logs: $SECURITY_RESULTS_DIR/"

# Security quality gate
echo ""
echo -e "${BLUE}🚪 Security Quality Gate${NC}"
echo "========================================"

SECURITY_PASSED=true
TOTAL_ISSUES=$((PERMISSION_ISSUES + ENV_ISSUES + DEBUG_ISSUES + FAILED_SECURITY_TESTS))

if [ $TOTAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No security issues found${NC}"
else
    echo -e "${RED}❌ $TOTAL_ISSUES security issues found${NC}"
    SECURITY_PASSED=false
fi

# Final security result
echo ""
if [ "$SECURITY_PASSED" = true ]; then
    echo -e "${GREEN}🎉 Security quality gate passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Security quality gate failed${NC}"
    echo -e "${YELLOW}⚠️  Please review and fix security issues before deployment${NC}"
    exit 1
fi