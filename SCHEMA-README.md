# Performance Test Database Schema

## Quick Start

### 1. Initialize the Database

```bash
# Create database and schema
sqlite3 performance_tests.db < performance-test-schema.sql
```

### 2. Import Test Data

```bash
# Import all reports from the performance-reports directory
node import-test-data.js --init --reports ./performance-reports

# Or import a single file
node import-test-data.js --file ./performance-reports/coreWebVitals-report.json
```

### 3. Query the Data

```bash
# Open database
sqlite3 performance_tests.db

# View latest tests
SELECT * FROM v_latest_tests;

# View Core Web Vitals summary
SELECT * FROM v_cwv_summary ORDER BY timestamp DESC LIMIT 5;
```

## Files Overview

- **`performance-test-schema.sql`** - Complete SQLite database schema with 25+ tables
- **`import-test-data.js`** - Node.js script to import JSON reports into the database
- **`SCHEMA-DOCUMENTATION.md`** - Comprehensive documentation with examples
- **`SCHEMA-README.md`** - This file (quick start guide)

## Schema.org Compatibility

This schema follows schema.org vocabulary patterns:

| Schema.org Type | Database Tables | Purpose |
|----------------|-----------------|---------|
| `TestAction` | `test_runs` | Main test execution records |
| `QuantitativeValue` | `core_web_vitals`, `load_test_stats` | Numeric measurements |
| `QualitativeValue` | `core_web_vitals.rating` | Quality ratings (GOOD, POOR) |
| `Recommendation` | `recommendations` | Actionable recommendations |
| `Report` | `test_runs.report_location` | Full test reports |

## Supported Test Types

1. **Core Web Vitals** - LCP, FID, CLS metrics
2. **Beyond Core Web Vitals** - TTFB, FCP, TTI, TBT, Speed Index
3. **Load Testing** - Request statistics, performance under load
4. **Stress Testing** - Breaking point analysis
5. **Soak Testing** - Long-duration endurance testing
6. **Scalability Testing** - Multi-dimensional scaling analysis
7. **Schema.org Impact** - SEO, LLM, and business impact analysis

## Database Structure

### Core Tables
- `test_runs` - Main test metadata (all tests)
- `recommendations` - Actionable recommendations

### Core Web Vitals
- `core_web_vitals` - Aggregated metrics (LCP, FID, CLS)
- `cwv_iterations` - Individual test iterations

### Load Testing
- `load_test_config` - Test configuration
- `load_test_stats` - Aggregated statistics
- `load_test_time_slices` - 30-second time windows
- `load_test_timeline` - 5-second detailed timeline

### Stress Testing
- `stress_test_config` - Test configuration
- `stress_test_breaking_point` - Where system failed
- `stress_test_steps` - Performance at each load level
- `stress_test_limits` - Calculated system limits

### Schema Impact
- `schema_impact_summary` - Overall scores
- `schema_seo_metrics` - SEO category metrics
- `schema_llm_metrics` - LLM compatibility metrics
- `schema_performance_metrics` - Performance impact
- `schema_business_impact` - Business projections

## Common Queries

### Get Latest Test Results
```sql
SELECT
    test_suite,
    url,
    status,
    overall_score,
    timestamp
FROM v_latest_tests;
```

### View Core Web Vitals Trends
```sql
SELECT
    DATE(timestamp) as date,
    AVG(lcp_avg) as avg_lcp,
    AVG(cls_avg) as avg_cls
FROM v_cwv_summary
WHERE url = 'https://example.com'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Find Critical Issues
```sql
SELECT
    t.test_suite,
    t.url,
    r.issue,
    r.impact
FROM recommendations r
JOIN test_runs t ON r.test_run_id = t.id
WHERE r.priority = 'CRITICAL'
ORDER BY t.timestamp DESC;
```

### Compare Load Test Performance
```sql
SELECT
    DATE(t.timestamp) as date,
    ls.avg_response_time,
    ls.throughput,
    ls.error_rate
FROM test_runs t
JOIN load_test_stats ls ON t.id = ls.test_run_id
ORDER BY t.timestamp DESC
LIMIT 10;
```

### Analyze Stress Test Breaking Points
```sql
SELECT
    t.url,
    t.timestamp,
    bp.users as breaking_point,
    bp.reason,
    ls.users as last_successful
FROM test_runs t
JOIN stress_test_breaking_point bp ON t.id = bp.test_run_id
JOIN stress_test_last_successful ls ON t.id = ls.test_run_id
WHERE t.test_suite = 'Stress Testing'
ORDER BY t.timestamp DESC;
```

### Business Impact Summary
```sql
SELECT
    t.url,
    t.timestamp,
    si.seo_score,
    si.llm_score,
    bi.projected_traffic_increase,
    bi.market_positioning
FROM test_runs t
JOIN schema_impact_summary si ON t.id = si.test_run_id
JOIN schema_business_impact bi ON t.id = bi.test_run_id
ORDER BY t.timestamp DESC;
```

## Import Options

### Full Import
```bash
# Initialize schema and import all reports
node import-test-data.js --init --reports ./performance-reports
```

### Clear and Re-import
```bash
# Clear existing data and import fresh
node import-test-data.js --clear --reports ./performance-reports
```

### Custom Database Location
```bash
# Use a different database file
node import-test-data.js --db ./custom/path/tests.db --init --reports ./reports
```

### Single File Import
```bash
# Import just one report
node import-test-data.js --file ./schema-impact-report.json
```

## Export to Schema.org JSON-LD

Export test data as schema.org JSON-LD:

```sql
SELECT json_object(
    '@context', 'https://schema.org',
    '@type', 'TestAction',
    'name', name,
    'url', url,
    'startTime', start_time,
    'endTime', end_time,
    'actionStatus', status,
    'result', json_object(
        '@type', 'Report',
        'score', overall_score,
        'url', report_location
    )
) as jsonld
FROM test_runs
WHERE id = ?;
```

## Maintenance

### Backup Database
```bash
sqlite3 performance_tests.db ".backup performance_tests_backup.db"
```

### Optimize Database
```bash
sqlite3 performance_tests.db "VACUUM;"
```

### Check Database Size
```bash
ls -lh performance_tests.db
```

### Archive Old Data
```sql
-- Delete tests older than 90 days
DELETE FROM test_runs WHERE timestamp < date('now', '-90 days');

-- Vacuum to reclaim space
VACUUM;
```

## Integration Examples

### Node.js
```javascript
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('performance_tests.db');

db.all('SELECT * FROM v_latest_tests', (err, rows) => {
    console.log('Latest tests:', rows);
});
```

### Python
```python
import sqlite3

conn = sqlite3.connect('performance_tests.db')
cursor = conn.cursor()

cursor.execute('SELECT * FROM v_latest_tests')
print(cursor.fetchall())
```

### MCP Server
The database can be queried through the existing MCP server by adding new tools.

## Troubleshooting

### Import Errors
```bash
# Check if file is valid JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('./file.json')))"

# Run import with Node debug
node --trace-warnings import-test-data.js --file ./file.json
```

### Database Locked
```bash
# Check for lock file
ls -la performance_tests.db*

# Remove if needed (when no other process is using it)
rm performance_tests.db-journal
```

### Schema Changes
```bash
# Drop and recreate (WARNING: loses data)
rm performance_tests.db
sqlite3 performance_tests.db < performance-test-schema.sql
```

## Next Steps

1. **Automate Import** - Add a cron job or CI/CD step to auto-import new reports
2. **Create Dashboards** - Connect to Grafana, Metabase, or similar tools
3. **Add Alerts** - Set up monitoring for performance degradation
4. **Compare Tests** - Build views to compare tests side-by-side
5. **Export Reports** - Generate PDF/HTML reports from the data

## Resources

- **Schema.org Documentation**: https://schema.org/TestAction
- **SQLite Documentation**: https://www.sqlite.org/docs.html
- **Full Schema Documentation**: See `SCHEMA-DOCUMENTATION.md`

## License

MIT License - See main project LICENSE file
