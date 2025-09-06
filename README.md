# Comprehensive Performance Test Suite

A comprehensive performance testing suite that includes industry-standard testing methodologies: Core Web Vitals, Beyond Core Web Vitals, Load Testing, Stress Testing, Soak Testing, and Scalability Testing.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run quick test suite (~30 minutes)
npm run test:quick

# Run comprehensive test suite (~1 hour) 
npm run test

# Run full endurance suite with soak testing (~3+ hours)
npm run test:endurance
```

## 📊 Test Suite Overview

### Core Web Vitals Testing
- **Metrics**: LCP, FID, CLS
- **Duration**: ~5 minutes
- **Purpose**: Google's core UX metrics that impact search rankings

### Beyond Core Web Vitals Testing  
- **Metrics**: TTFB, FCP, TTI, TBT, SI
- **Duration**: ~5 minutes
- **Purpose**: Extended performance metrics for comprehensive analysis

### Load Testing
- **Purpose**: Test performance under expected production load
- **Duration**: ~10 minutes
- **Metrics**: Response times, throughput, error rates

### Stress Testing
- **Purpose**: Find the breaking point where performance degrades
- **Duration**: ~15 minutes  
- **Metrics**: Breaking point, maximum capacity, system limits

### Soak Testing (Endurance)
- **Purpose**: Test system stability over extended periods
- **Duration**: ~2 hours (configurable)
- **Metrics**: Memory leaks, performance degradation over time

### Scalability Testing
- **Purpose**: Multi-dimensional scaling across users, data, network conditions
- **Duration**: ~20 minutes
- **Metrics**: Scaling patterns, efficiency, cross-factor performance

## 🛠 Installation

```bash
git clone <repository-url>
cd PerformanceTest
npm install
```

### Dependencies
- Node.js 14+
- puppeteer (for browser automation)
- axios (for HTTP requests)

## 📈 Usage

### Master Test Suite (Recommended)

```bash
# Quick test suite - Core Web Vitals, Extended Vitals, Load Testing
./run-tests.sh --quick

# Comprehensive suite - All tests except Soak Testing  
./run-tests.sh --comprehensive

# Full endurance suite - All tests including Soak Testing
./run-tests.sh --endurance

# Test specific URL
./run-tests.sh --comprehensive --url https://yoursite.com

# Run only Schema.org impact tests
./run-tests.sh --schema-only
```

### Individual Test Execution

```bash
# Core Web Vitals
npm run test:core-web-vitals
# or
node core-web-vitals.js --url https://example.com --iterations 3

# Load Testing
npm run test:load  
# or
node load-testing.js --max-users 50 --duration 300 --ramp-up 60

# Stress Testing
npm run test:stress
# or  
node stress-testing.js --initial-users 10 --max-users 200 --step-size 10

# Soak Testing (Endurance)
npm run test:soak
# or
node soak-testing.js --users 25 --duration 2 --interval 2000

# Scalability Testing
npm run test:scalability
# or
node scalability-testing.js --users 1,5,10,25,50,100 --duration 120
```

## 📋 Test Configuration

### Master Suite Options

```bash
node master-performance-suite.js [options]

Options:
  --url <url>              Target URL to test
  --output-dir <dir>       Output directory for reports  
  --tests <test1,test2>    Comma-separated list of tests to run
  --quick                  Run quick test suite
  --comprehensive          Run comprehensive suite  
  --endurance              Run full endurance suite
```

### Individual Test Options

Each test suite supports various configuration options:

**Core Web Vitals:**
- `--url` - Target URL
- `--iterations` - Number of test iterations (default: 5)
- `--output` - Report output path

**Load Testing:**
- `--max-users` - Maximum concurrent users (default: 50)
- `--ramp-up` - Ramp-up time in seconds (default: 60)  
- `--duration` - Test duration in seconds (default: 300)
- `--delay` - Request delay per user in ms (default: 1000)

**Stress Testing:**
- `--initial-users` - Starting user count (default: 10)
- `--max-users` - Maximum users to test (default: 200)
- `--step-size` - User increment per step (default: 10)
- `--step-duration` - Duration per step in seconds (default: 60)

**Soak Testing:**
- `--users` - Concurrent users (default: 25)
- `--duration` - Test duration in hours (default: 2)
- `--interval` - Request interval in ms (default: 2000)
- `--sampling` - Metrics sampling interval in ms (default: 60000)

**Scalability Testing:**
- `--users` - Comma-separated user counts (default: 1,5,10,25,50,100,150,200)
- `--data` - Data load scenarios (default: light,medium,heavy)
- `--network` - Network conditions (default: fast,slow,mobile)
- `--duration` - Test duration per scenario (default: 120)

## 🤖 MCP Server for AI Tools

This suite can be run as an MCP (Model Context Protocol) server, allowing AI tools like Claude, Amazon Q, and others to run performance tests programmatically.

### Quick MCP Setup

```bash
# Start the MCP server
npm run mcp-server

# Or directly
node mcp-server.js
```

### Available MCP Tools
- `run_performance_suite` - Run complete test suite
- `run_core_web_vitals` - Core Web Vitals testing
- `run_load_test` - Load testing
- `run_stress_test` - Stress testing
- `run_soak_test` - Soak/endurance testing
- `run_scalability_test` - Scalability testing
- `get_test_results` - Retrieve test results
- `list_available_reports` - List available reports

### Example AI Interactions
```
AI: "Run a comprehensive performance test on https://example.com"
AI: "Find the breaking point for my website with stress testing"
AI: "Show me the latest test results and provide recommendations"
```

See [MCP-SETUP.md](./MCP-SETUP.md) for detailed configuration and usage instructions.

## 📊 Reports and Output

All test results are saved as JSON reports in the `performance-reports/` directory:

- `master-performance-report.json` - Comprehensive analysis across all tests
- `core-web-vitals-report.json` - Core Web Vitals results
- `beyond-core-web-vitals-report.json` - Extended web vitals results  
- `load-test-report.json` - Load testing results
- `stress-test-report.json` - Stress testing results
- `soak-test-report.json` - Soak testing results
- `scalability-test-report.json` - Scalability testing results

### Report Structure

Each report includes:
- **Test Configuration** - Parameters used for the test
- **Performance Metrics** - Detailed measurements and statistics
- **Analysis** - Score calculations and performance assessments
- **Recommendations** - Actionable suggestions for improvements
- **Raw Data** - Complete test results for further analysis

### Master Report Features

The master report provides:
- **Overall Performance Score** - Weighted score across all tests
- **Performance Grade** - Letter grade (A+ to F)
- **System Assessment** - Production readiness evaluation
- **Cross-Suite Analysis** - Performance correlations and consistency
- **Consolidated Recommendations** - Prioritized improvement suggestions
- **Executive Summary** - High-level results for stakeholders

## 🎯 Performance Scoring

### Scoring Methodology

Each test suite generates a score from 0-100 based on:
- **Core Web Vitals**: Google's thresholds (Good/Needs Improvement/Poor)
- **Load Testing**: Success rates, response times, throughput
- **Stress Testing**: Breaking point, graceful degradation  
- **Soak Testing**: Stability, memory efficiency, uptime
- **Scalability**: Linear scaling, efficiency, resilience

### Grade Scale
- **A+ (95-100)**: Exceptional performance
- **A (90-94)**: Excellent performance  
- **A- (85-89)**: Very good performance
- **B+ (80-84)**: Good performance
- **B (75-79)**: Acceptable performance
- **B- (70-74)**: Below average performance
- **C+ (65-69)**: Poor performance
- **C (60-64)**: Very poor performance
- **C- (55-59)**: Critical issues
- **D (50-54)**: Major problems
- **F (0-49)**: System failure

## 🔧 Troubleshooting

### Common Issues

**"puppeteer not found" error:**
```bash
npm install puppeteer
```

**"axios not found" error:**
```bash
npm install axios
```

**Timeout errors during testing:**
- Increase timeout values in test configuration
- Check network connectivity to target URL
- Verify target site is accessible and responsive

**Memory issues during soak testing:**
- Reduce concurrent user count
- Decrease test duration
- Monitor system resources

### Debug Mode

Enable verbose logging by setting environment variable:
```bash
DEBUG=true node master-performance-suite.js --quick
```

## 📈 Best Practices

### Test Environment
- Run tests from a stable network connection
- Use consistent hardware for comparative testing
- Avoid running other resource-intensive applications during testing

### Test Frequency  
- **Development**: Run quick suite before major releases
- **Staging**: Run comprehensive suite after deployments
- **Production**: Run endurance suite monthly for capacity planning

### Interpreting Results
- Focus on trends over time rather than single test results
- Pay attention to P95/P99 metrics for user experience impact
- Use stress testing results for capacity planning
- Monitor soak testing for production reliability assessment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google's Web Vitals initiative for performance metrics standards
- Puppeteer team for browser automation capabilities
- Performance testing community for best practices and methodologies

---

## Legacy Schema.org Testing

This suite also includes the original Schema.org impact testing functionality. Use `./run-tests.sh --schema-only` to run the original 20-metric Schema.org analysis for SEO, LLM, and Performance impact assessment.