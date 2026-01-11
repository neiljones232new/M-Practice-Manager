#!/bin/bash

# MDJ Practice Manager Comprehensive Test Suite
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 MDJ Practice Manager Test Suite${NC}"
echo "========================================"

# Test configuration
API_DIR="apps/api"
WEB_DIR="apps/web"
TEST_RESULTS_DIR="test-results"
COVERAGE_THRESHOLD=80

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to run command and capture output
run_test() {
    local test_name="$1"
    local command="$2"
    local log_file="$TEST_RESULTS_DIR/${test_name}.log"
    
    echo -e "${BLUE}🔄 Running: $test_name${NC}"
    
    if eval "$command" > "$log_file" 2>&1; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        echo "   Log: $log_file"
        return 1
    fi
}

# Function to check test coverage
check_coverage() {
    local coverage_file="$1"
    local threshold="$2"
    
    if [ -f "$coverage_file" ]; then
        # Extract coverage percentage (this is a simplified example)
        local coverage=$(grep -o '[0-9]*\.[0-9]*%' "$coverage_file" | head -1 | sed 's/%//')
        
        if [ -n "$coverage" ]; then
            if (( $(echo "$coverage >= $threshold" | bc -l) )); then
                echo -e "${GREEN}✅ Coverage: $coverage% (>= $threshold%)${NC}"
                return 0
            else
                echo -e "${RED}❌ Coverage: $coverage% (< $threshold%)${NC}"
                return 1
            fi
        fi
    fi
    
    echo -e "${YELLOW}⚠️  Coverage information not available${NC}"
    return 1
}

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: API Unit Tests
echo -e "\n${BLUE}📋 API Unit Tests${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "api-unit-tests" "cd $API_DIR && npm test -- --coverage --watchAll=false"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    check_coverage "$API_DIR/coverage/lcov-report/index.html" "$COVERAGE_THRESHOLD"
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 2: API Linting
echo -e "\n${BLUE}📋 API Linting${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "api-lint" "cd $API_DIR && npm run lint"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 3: API Type Checking
echo -e "\n${BLUE}📋 API Type Checking${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "api-type-check" "cd $API_DIR && npx tsc --noEmit"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 4: API Build
echo -e "\n${BLUE}📋 API Build${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "api-build" "cd $API_DIR && npm run build"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 5: Web Type Checking
echo -e "\n${BLUE}📋 Web Type Checking${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "web-type-check" "cd $WEB_DIR && npm run type-check"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 6: Web Linting
echo -e "\n${BLUE}📋 Web Linting${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "web-lint" "cd $WEB_DIR && npm run lint"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 7: Web Build
echo -e "\n${BLUE}📋 Web Build${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "web-build" "cd $WEB_DIR && npm run build"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 8: Docker Build Test
echo -e "\n${BLUE}📋 Docker Build Test${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "docker-build" "docker-compose -f docker-compose.yml build --no-cache"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 9: Security Audit
echo -e "\n${BLUE}📋 Security Audit${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "security-audit-api" "cd $API_DIR && npm audit --audit-level=high"; then
    if run_test "security-audit-web" "cd $WEB_DIR && npm audit --audit-level=high"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 10: Dependency Check
echo -e "\n${BLUE}📋 Dependency Check${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "dependency-check" "npm ls --depth=0"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Performance Tests
echo -e "\n${BLUE}📋 Performance Tests${NC}"

# Test file system performance
echo -e "${BLUE}🔄 Testing file system performance${NC}"
PERF_TEST_DIR="$TEST_RESULTS_DIR/perf-test"
mkdir -p "$PERF_TEST_DIR"

# Create test files
START_TIME=$(date +%s%N)
for i in {1..100}; do
    echo '{"test": "data", "id": '$i'}' > "$PERF_TEST_DIR/test-$i.json"
done
END_TIME=$(date +%s%N)
WRITE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

# Read test files
START_TIME=$(date +%s%N)
for i in {1..100}; do
    cat "$PERF_TEST_DIR/test-$i.json" > /dev/null
done
END_TIME=$(date +%s%N)
READ_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

echo -e "${GREEN}📊 File System Performance:${NC}"
echo "  Write 100 files: ${WRITE_TIME}ms"
echo "  Read 100 files: ${READ_TIME}ms"

# Cleanup performance test files
rm -rf "$PERF_TEST_DIR"

# Memory usage test
echo -e "${BLUE}🔄 Checking memory usage${NC}"
if command -v free &> /dev/null; then
    MEMORY_INFO=$(free -h)
    echo -e "${GREEN}💾 Memory Usage:${NC}"
    echo "$MEMORY_INFO"
fi

# Disk usage test
echo -e "${BLUE}🔄 Checking disk usage${NC}"
DISK_USAGE=$(df -h .)
echo -e "${GREEN}💽 Disk Usage:${NC}"
echo "$DISK_USAGE"

# Generate test report
REPORT_FILE="$TEST_RESULTS_DIR/test-report.md"
echo "# MDJ Practice Manager Test Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Test Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- Total Tests: $TOTAL_TESTS" >> "$REPORT_FILE"
echo "- Passed: $PASSED_TESTS" >> "$REPORT_FILE"
echo "- Failed: $FAILED_TESTS" >> "$REPORT_FILE"
echo "- Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Add performance metrics
echo "## Performance Metrics" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- File Write (100 files): ${WRITE_TIME}ms" >> "$REPORT_FILE"
echo "- File Read (100 files): ${READ_TIME}ms" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Add system information
echo "## System Information" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- OS: $(uname -s)" >> "$REPORT_FILE"
echo "- Architecture: $(uname -m)" >> "$REPORT_FILE"
echo "- Node.js: $(node --version 2>/dev/null || echo 'Not available')" >> "$REPORT_FILE"
echo "- npm: $(npm --version 2>/dev/null || echo 'Not available')" >> "$REPORT_FILE"
echo "- Docker: $(docker --version 2>/dev/null || echo 'Not available')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Add detailed test results
echo "## Detailed Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
for log_file in "$TEST_RESULTS_DIR"/*.log; do
    if [ -f "$log_file" ]; then
        test_name=$(basename "$log_file" .log)
        echo "### $test_name" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        tail -20 "$log_file" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
done

# Final summary
echo ""
echo -e "${GREEN}📊 Test Summary${NC}"
echo "================================"
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""
echo "Report generated: $REPORT_FILE"
echo "Test logs: $TEST_RESULTS_DIR/"

# Quality gates
echo ""
echo -e "${BLUE}🚪 Quality Gates${NC}"
echo "================================"

QUALITY_PASSED=true

# Check success rate
SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}✅ Success Rate: $SUCCESS_RATE% (>= 90%)${NC}"
else
    echo -e "${RED}❌ Success Rate: $SUCCESS_RATE% (< 90%)${NC}"
    QUALITY_PASSED=false
fi

# Check performance
if [ $WRITE_TIME -le 1000 ] && [ $READ_TIME -le 500 ]; then
    echo -e "${GREEN}✅ Performance: Write ${WRITE_TIME}ms, Read ${READ_TIME}ms${NC}"
else
    echo -e "${RED}❌ Performance: Write ${WRITE_TIME}ms, Read ${READ_TIME}ms (too slow)${NC}"
    QUALITY_PASSED=false
fi

# Final result
echo ""
if [ "$QUALITY_PASSED" = true ]; then
    echo -e "${GREEN}🎉 All quality gates passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some quality gates failed${NC}"
    exit 1
fi