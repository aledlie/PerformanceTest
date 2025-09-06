# MCP Server Setup Guide

This guide explains how to set up and use the Performance Test Suite as a Model Context Protocol (MCP) server with AI tools like Claude, Amazon Q, and others.

## 📋 What is MCP?

Model Context Protocol (MCP) allows AI tools to interact with external systems and run tools programmatically. This MCP server exposes all performance testing capabilities to AI assistants, enabling them to run tests, analyze results, and provide recommendations automatically.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the MCP Server

```bash
npm run mcp-server
```

Or directly:
```bash
node mcp-server.js
```

### 3. Configure Your AI Tool

Add the MCP server configuration to your AI tool's settings. The exact steps depend on your AI client, but typically involve adding a server configuration pointing to the running MCP server.

## 🛠 Available MCP Tools

The MCP server exposes the following tools:

### Core Testing Tools

#### `run_performance_suite`
Run the complete performance test suite with configurable options.

**Parameters:**
- `url` (string): Target URL to test (default: "https://inspiredmovementaustin.com")
- `suite_type` (string): Type of suite - "quick", "comprehensive", "endurance", or "custom"
- `output_dir` (string): Directory for output reports
- `custom_tests` (array): Custom test selection (required if suite_type is "custom")

**Example Usage in AI:**
```
Please run a comprehensive performance test suite on https://example.com
```

#### `run_core_web_vitals`
Run Core Web Vitals testing (LCP, FID, CLS).

**Parameters:**
- `url` (string): Target URL
- `iterations` (number): Number of test iterations (1-20)
- `output` (string): Output file path

#### `run_beyond_core_web_vitals`
Run Beyond Core Web Vitals testing (TTFB, FCP, TTI, TBT, SI).

**Parameters:**
- `url` (string): Target URL
- `iterations` (number): Number of test iterations (1-20)
- `output` (string): Output file path

#### `run_load_test`
Run load testing to evaluate performance under expected traffic.

**Parameters:**
- `url` (string): Target URL
- `max_users` (number): Maximum concurrent users (1-500)
- `ramp_up_time` (number): Ramp-up time in seconds (10-600)
- `test_duration` (number): Test duration in seconds (60-1800)
- `request_delay` (number): Delay between requests per user in ms (100-10000)
- `output` (string): Output file path

#### `run_stress_test`
Run stress testing to find the system breaking point.

**Parameters:**
- `url` (string): Target URL
- `initial_users` (number): Starting number of users (1-100)
- `max_users` (number): Maximum users to test (10-1000)
- `step_size` (number): User increment per step (1-50)
- `step_duration` (number): Duration per step in seconds (30-300)
- `request_interval` (number): Interval between requests in ms (100-5000)
- `output` (string): Output file path

#### `run_soak_test`
Run soak/endurance testing for extended periods.

**Parameters:**
- `url` (string): Target URL
- `concurrent_users` (number): Number of concurrent users (1-100)
- `test_duration_hours` (number): Test duration in hours (0.1-24)
- `request_interval` (number): Request interval in ms (500-10000)
- `sampling_interval` (number): Metrics sampling interval in ms (10000-300000)
- `output` (string): Output file path

#### `run_scalability_test`
Run multi-dimensional scalability testing.

**Parameters:**
- `url` (string): Target URL
- `user_scenarios` (array): User count scenarios to test
- `data_scenarios` (array): Data load scenarios ("light", "medium", "heavy")
- `network_scenarios` (array): Network conditions ("fast", "slow", "mobile")
- `test_duration` (number): Duration per scenario in seconds (30-300)
- `output` (string): Output file path

#### `run_schema_test`
Run the original Schema.org impact testing.

**Parameters:**
- `url` (string): Target URL

### Utility Tools

#### `get_test_results`
Retrieve results from a previous test run.

**Parameters:**
- `report_type` (string): Type of report ("master", "core-web-vitals", "beyond-core-web-vitals", "load", "stress", "soak", "scalability", "schema")
- `report_path` (string): Custom path to report file (optional)

#### `list_available_reports`
List all available test reports.

#### `get_test_status`
Get current status of the test server and available tests.

## 💡 Example AI Interactions

Here are some example ways to interact with the MCP server through an AI assistant:

### Basic Performance Test
```
AI: "Run a quick performance test on https://example.com"
```
This will execute the quick test suite including Core Web Vitals, Beyond Core Web Vitals, and Load Testing.

### Custom Test Configuration
```
AI: "Run a load test with 100 concurrent users for 10 minutes on https://example.com"
```
This will run a load test with specific parameters.

### Stress Testing
```
AI: "Find the breaking point for https://example.com starting with 10 users and going up to 200"
```
This will run stress testing to identify system limits.

### Results Analysis
```
AI: "Show me the latest test results and provide recommendations"
```
This will retrieve recent test results and provide analysis.

### Comprehensive Analysis
```
AI: "Run a full endurance test suite on my website and analyze the results for production readiness"
```
This will run the complete test suite including soak testing.

## 🔧 Configuration

### Environment Variables

You can configure the MCP server using environment variables:

```bash
export PERFORMANCE_DEFAULT_URL="https://your-default-site.com"
export PERFORMANCE_REPORTS_DIR="./custom-reports"
export PERFORMANCE_TIMEOUT="300000"
```

### Custom Configuration File

Create a `mcp-config.json` file:

```json
{
  "default_url": "https://your-site.com",
  "reports_dir": "./reports",
  "timeouts": {
    "core_web_vitals": 300000,
    "load_test": 1800000,
    "stress_test": 3600000,
    "soak_test": 7200000,
    "scalability_test": 1800000
  },
  "default_params": {
    "load_test": {
      "max_users": 50,
      "test_duration": 300
    },
    "stress_test": {
      "max_users": 200,
      "step_size": 10
    }
  }
}
```

## 📊 Response Format

All MCP tools return JSON responses with the following structure:

### Success Response
```json
{
  "success": true,
  "test_type": "Load Test",
  "target_url": "https://example.com",
  "overall_score": 85,
  "performance_grade": "B+",
  "execution_time": 180000,
  "recommendations": [...],
  "report_location": "./performance-reports/load-test-report.json",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "test_type": "Load Test",
  "error": "Connection timeout",
  "target_url": "https://example.com",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🚦 Status Codes and Error Handling

The MCP server handles various error conditions:

- **Connection Errors**: Network connectivity issues
- **Timeout Errors**: Tests taking longer than expected
- **Configuration Errors**: Invalid parameters or missing dependencies
- **Resource Errors**: Insufficient system resources
- **Permission Errors**: File system access issues

## 🔍 Troubleshooting

### Common Issues

**MCP Server Won't Start**
```bash
# Check Node.js version
node --version  # Should be 14+

# Install dependencies
npm install

# Check for errors
npm run mcp-server
```

**Tests Timing Out**
- Increase timeout values in configuration
- Check network connectivity
- Verify target URL is accessible

**Memory Issues During Soak Testing**
- Reduce concurrent user count
- Decrease test duration
- Monitor system resources

**Permission Errors**
```bash
# Ensure write permissions for reports directory
chmod 755 ./performance-reports
```

### Debug Mode

Enable debug logging:
```bash
DEBUG=true npm run mcp-server
```

## 📈 Best Practices

### For AI Interactions

1. **Be Specific**: Provide clear parameters for tests
2. **Start Small**: Begin with quick tests before running comprehensive suites
3. **Monitor Resources**: Be aware of system resource usage during long tests
4. **Review Results**: Always analyze results and recommendations

### For Production Use

1. **Security**: Run MCP server in isolated environment
2. **Resource Limits**: Set appropriate timeouts and limits
3. **Monitoring**: Monitor server health and performance
4. **Backups**: Regularly backup test reports and configurations

## 🔗 Integration Examples

### Claude Desktop Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "performance-test-suite": {
      "command": "node",
      "args": ["/path/to/PerformanceTest/mcp-server.js"],
      "env": {}
    }
  }
}
```

### Amazon Q Configuration

Configure Amazon Q to connect to the MCP server endpoint.

### Custom AI Tool Integration

Use the MCP protocol to integrate with any AI tool that supports MCP:

```javascript
const client = new MCPClient();
await client.connect('stdio', {
  command: 'node',
  args: ['mcp-server.js']
});

const result = await client.callTool('run_performance_suite', {
  url: 'https://example.com',
  suite_type: 'comprehensive'
});
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the server logs for error messages
3. Ensure all dependencies are properly installed
4. Verify your AI tool's MCP configuration
5. Open an issue on the GitHub repository

---

The MCP server makes the entire performance testing suite accessible to AI tools, enabling automated performance analysis, continuous testing, and intelligent recommendations.