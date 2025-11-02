# Performance Test Database Schema Documentation

## Overview

This database schema provides a comprehensive, normalized structure for storing performance test results from various testing suites. The schema is designed to be compatible with [schema.org](https://schema.org) vocabulary, particularly the `TestAction`, `WebSite`, `SoftwareApplication`, and `Report` types.

## Schema.org Compatibility

The schema follows schema.org principles by:

- Using standard property names from schema.org vocabulary (e.g., `name`, `description`, `url`, `startTime`, `endTime`)
- Implementing standard types like `TestAction`, `QuantitativeValue`, `QualitativeValue`
- Including temporal properties for time-series data
- Supporting structured recommendations and reports

## Database Structure

### Core Tables

#### 1. `test_runs` (Primary Entity)
**Schema.org Type:** `TestAction`

The main table storing metadata about each test run.

**Key Columns:**
- `id`: Primary key
- `name`: Test name (schema.org: name)
- `url`: Target URL being tested (schema.org: target > URL)
- `identifier`: Unique identifier (UUID)
- `test_suite`: Type of test (Core Web Vitals, Load Testing, etc.)
- `status`: Test outcome (SUCCESS, FAILED, PARTIAL)
- `timestamp`: When the test was run
- `overall_score`: Computed score (0-100)

**Relationships:** One-to-many with all test-specific tables

---

### Core Web Vitals Tables

#### 2. `core_web_vitals`
**Schema.org Type:** `QuantitativeValue` / `QualitativeValue`

Stores aggregated Core Web Vitals metrics (LCP, FID, CLS).

**Key Metrics:**
- Statistical measures: average, median, p75, p95, p99, min, max
- Thresholds: passing and needs improvement
- Evaluation: score (0-100) and rating (GOOD, NEEDS_IMPROVEMENT, POOR)

**Use Case:** View overall performance metrics across multiple test iterations

#### 3. `cwv_iterations`
Stores individual measurements from each test iteration.

**Metrics Captured:**
- Core Web Vitals: LCP, FID, CLS
- Additional metrics: TTFB, FCP, TTI, TBT, Speed Index
- Page metrics: DOM nodes, total bytes
- Performance timings: DOM content loaded, load complete

**Use Case:** Analyze individual test runs and variance

---

### Load Testing Tables

#### 4. `load_test_config`
Configuration parameters for load tests.

#### 5. `load_test_stats`
**Schema.org Type:** `QuantitativeValue`

Aggregated statistics for the entire load test.

**Key Metrics:**
- Request counts and rates
- Response time statistics (avg, median, p95, p99)
- Throughput (requests per second, peak RPS)
- Success/error rates

#### 6. `load_test_time_slices`
Time-series data broken into time periods (e.g., 30-second windows).

**Use Case:** Analyze performance degradation over time

#### 7. `load_test_timeline`
High-resolution timeline data (typically 5-second intervals).

**Use Case:** Create detailed performance graphs and identify exact failure points

---

### Stress Testing Tables

#### 8. `stress_test_config`
Configuration for stress test parameters.

#### 9. `stress_test_breaking_point`
Records the system breaking point.

**Key Data:**
- Number of users at failure
- Step number where failure occurred
- Reason for failure

#### 10. `stress_test_last_successful`
Records the last successful load level before breaking.

#### 11. `stress_test_steps`
Performance metrics for each step in the stress test.

**Use Case:** Understand performance degradation patterns as load increases

#### 12. `stress_test_limits`
Calculated system limits and capacity recommendations.

---

### Soak Testing Tables

#### 13. `soak_test_config`
Configuration for endurance testing.

#### 14. `soak_test_samples`
Periodic samples during the soak test.

**Metrics:**
- Performance: response time, error rate, throughput
- Resources: memory usage, CPU usage
- Request statistics

**Use Case:** Identify memory leaks and performance degradation over time

---

### Scalability Testing Tables

#### 15. `scalability_test_config`
Configuration for multi-dimensional scalability tests.

#### 16. `scalability_scenarios`
Results for each test scenario combination.

**Dimensions:**
- User count (1, 5, 10, 25, 50, 100+)
- Data load (light, medium, heavy)
- Network conditions (fast, slow, mobile)

**Use Case:** Understand how the system scales across multiple dimensions

---

### Schema.org Impact Analysis Tables

#### 17. `schema_impact_summary`
Overall summary of schema.org impact analysis.

**Scores:**
- SEO score
- LLM compatibility score
- Performance score
- Overall score

#### 18-20. `schema_seo_metrics`, `schema_llm_metrics`, `schema_performance_metrics`
Detailed metrics for each category.

#### 21. `schema_business_impact`
**Schema.org Type:** `QuantitativeValue`

Business impact projections including:
- Organic traffic projections
- Click-through rate improvements
- Voice search capture
- Brand authority metrics

---

### Supporting Tables

#### 22-24. Error Analysis Tables
- `error_analysis`: Aggregated error statistics
- `errors_by_type`: Breakdown by error type/message
- `errors_by_status`: Breakdown by HTTP status code

#### 25. `recommendations`
**Schema.org Type:** `Recommendation`

Actionable recommendations from test results.

**Structure:**
- Category, priority, issue
- Impact description
- Solutions (JSON array)

---

## Views

### `v_latest_tests`
Shows the most recent test for each test suite type.

### `v_cwv_summary`
Pivot view showing all Core Web Vitals metrics in a single row.

### `v_performance_trends`
Daily aggregated performance trends by test suite and URL.

---

## Relationships

```
test_runs (1)
    ├── core_web_vitals (N)
    ├── cwv_iterations (N)
    ├── load_test_config (1)
    ├── load_test_stats (1)
    ├── load_test_time_slices (N)
    ├── load_test_timeline (N)
    ├── stress_test_config (1)
    ├── stress_test_breaking_point (1)
    ├── stress_test_last_successful (1)
    ├── stress_test_steps (N)
    ├── stress_test_limits (1)
    ├── soak_test_config (1)
    ├── soak_test_samples (N)
    ├── scalability_test_config (1)
    ├── scalability_scenarios (N)
    ├── schema_impact_summary (1)
    │   ├── schema_seo_metrics (N)
    │   ├── schema_llm_metrics (N)
    │   └── schema_performance_metrics (N)
    ├── schema_business_impact (1)
    ├── error_analysis (1)
    │   ├── errors_by_type (N)
    │   └── errors_by_status (N)
    └── recommendations (N)
```

---

## Usage Examples

### 1. Initialize the Database

```bash
sqlite3 performance_tests.db < performance-test-schema.sql
```

### 2. Insert a Test Run

```sql
INSERT INTO test_runs (
    name,
    url,
    identifier,
    test_suite,
    version,
    status,
    start_time,
    end_time,
    timestamp,
    overall_score
) VALUES (
    'Core Web Vitals Test - zouk.mx',
    'https://zouk.mx/',
    'cwv-2025-11-01-001',
    'Core Web Vitals',
    '1.0.0',
    'SUCCESS',
    '2025-11-01 21:03:54',
    '2025-11-01 21:04:39',
    '2025-11-01 21:04:39.985',
    66
);
```

### 3. Query Latest Test Results

```sql
SELECT * FROM v_latest_tests;
```

### 4. Get Core Web Vitals Summary

```sql
SELECT * FROM v_cwv_summary
WHERE url = 'https://zouk.mx/'
ORDER BY timestamp DESC
LIMIT 5;
```

### 5. Analyze Performance Trends

```sql
SELECT * FROM v_performance_trends
WHERE url = 'https://zouk.mx/'
AND test_suite = 'Core Web Vitals'
ORDER BY test_date DESC;
```

### 6. Find Critical Recommendations

```sql
SELECT
    t.test_suite,
    t.url,
    t.timestamp,
    r.category,
    r.issue,
    r.impact
FROM recommendations r
JOIN test_runs t ON r.test_run_id = t.id
WHERE r.priority = 'CRITICAL'
ORDER BY t.timestamp DESC;
```

### 7. Compare Load Test Results Over Time

```sql
SELECT
    DATE(t.timestamp) as test_date,
    ls.avg_response_time,
    ls.throughput,
    ls.error_rate,
    ls.success_rate
FROM test_runs t
JOIN load_test_stats ls ON t.id = ls.test_run_id
WHERE t.test_suite = 'Load Testing'
ORDER BY t.timestamp DESC;
```

### 8. Find Stress Test Breaking Points

```sql
SELECT
    t.url,
    t.timestamp,
    bp.users as breaking_point_users,
    bp.reason,
    ls.users as last_successful_users,
    ls.error_rate as last_error_rate
FROM test_runs t
JOIN stress_test_breaking_point bp ON t.id = bp.test_run_id
JOIN stress_test_last_successful ls ON t.id = ls.test_run_id
WHERE t.test_suite = 'Stress Testing'
ORDER BY t.timestamp DESC;
```

---

## Data Import Strategy

### From JSON Reports

Create a data import script to parse JSON files and populate the database:

```javascript
// Example structure for importing Core Web Vitals data
const report = require('./performance-reports/coreWebVitals-report.json');

// 1. Insert test_run
const testRunId = insertTestRun({
    name: `${report.testSuite} - ${report.testConfig.url}`,
    url: report.testConfig.url,
    test_suite: report.testSuite,
    status: report.status,
    timestamp: report.timestamp,
    overall_score: report.overallScore
});

// 2. Insert core_web_vitals metrics
Object.entries(report.coreWebVitals).forEach(([metric, data]) => {
    insertCoreWebVital(testRunId, metric, data);
});

// 3. Insert cwv_iterations
report.rawData.forEach((iteration, index) => {
    insertCWVIteration(testRunId, index + 1, iteration);
});

// 4. Insert recommendations
report.recommendations.forEach((rec, index) => {
    insertRecommendation(testRunId, rec, index);
});
```

---

## Best Practices

1. **Indexing**: The schema includes indexes on frequently queried columns. Add additional indexes based on your query patterns.

2. **Data Retention**: Implement a data retention policy to archive old test results:
   ```sql
   DELETE FROM test_runs WHERE timestamp < date('now', '-90 days');
   ```

3. **Normalization**: The schema is normalized to reduce data duplication. Use views for denormalized reporting.

4. **Transactions**: Always use transactions when importing test data to ensure consistency:
   ```sql
   BEGIN TRANSACTION;
   -- Insert statements
   COMMIT;
   ```

5. **JSON Storage**: Some fields store JSON arrays (e.g., errors, solutions). Use SQLite's JSON functions for querying:
   ```sql
   SELECT json_extract(solutions, '$[0]') as first_solution
   FROM recommendations;
   ```

---

## Schema Extensions

The schema can be extended with:

1. **User Management**: Add tables for tracking who ran tests
2. **Test Environments**: Add tables for environment configurations
3. **Alerts**: Add tables for alert thresholds and notifications
4. **Comparisons**: Add views for comparing tests side-by-side
5. **Reports**: Add tables for storing generated reports and dashboards

---

## Schema.org Export

To export data in schema.org JSON-LD format:

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
        'score', overall_score
    )
) as jsonld
FROM test_runs
WHERE id = 1;
```

---

## Maintenance

### Update Schema Version

```sql
UPDATE schema_metadata
SET value = '1.1.0', updated_at = CURRENT_TIMESTAMP
WHERE key = 'schema_version';
```

### Vacuum Database

Periodically optimize the database:

```bash
sqlite3 performance_tests.db "VACUUM;"
```

### Backup

Regular backups are recommended:

```bash
sqlite3 performance_tests.db ".backup performance_tests_backup.db"
```

---

## License

This schema is part of the Performance Test Suite and follows the same MIT license.

## Contributing

When extending the schema:
1. Maintain schema.org compatibility where possible
2. Add appropriate indexes
3. Update this documentation
4. Include migration scripts for schema changes
5. Test with real data before deployment
