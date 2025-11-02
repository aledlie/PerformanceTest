-- Example Queries for Performance Test Database
-- Run these after importing test data

-- ============================================================================
-- Basic Queries
-- ============================================================================

-- View all test runs
.mode column
.headers on
.width 10 25 40 12 10 20

SELECT
    id,
    test_suite,
    url,
    status,
    overall_score,
    timestamp
FROM test_runs
ORDER BY timestamp DESC
LIMIT 10;

.print ""
.print "================================================"
.print "Latest Test Results by Suite"
.print "================================================"
.print ""

-- Latest tests by suite
SELECT * FROM v_latest_tests;

-- ============================================================================
-- Core Web Vitals Analysis
-- ============================================================================

.print ""
.print "================================================"
.print "Core Web Vitals Summary"
.print "================================================"
.print ""

SELECT
    url,
    timestamp,
    overall_score,
    lcp_avg as "LCP (ms)",
    lcp_rating as "LCP Rating",
    fid_avg as "FID (ms)",
    fid_rating as "FID Rating",
    cls_avg as "CLS",
    cls_rating as "CLS Rating"
FROM v_cwv_summary
ORDER BY timestamp DESC
LIMIT 5;

.print ""
.print "================================================"
.print "Core Web Vitals - Failed Metrics"
.print "================================================"
.print ""

-- Find metrics that are not GOOD
SELECT
    t.url,
    t.timestamp,
    cwv.metric_name,
    cwv.average,
    cwv.rating,
    cwv.passing_threshold
FROM core_web_vitals cwv
JOIN test_runs t ON cwv.test_run_id = t.id
WHERE cwv.rating != 'GOOD'
ORDER BY t.timestamp DESC;

-- ============================================================================
-- Performance Trends
-- ============================================================================

.print ""
.print "================================================"
.print "Performance Trends Over Time"
.print "================================================"
.print ""

SELECT * FROM v_performance_trends
LIMIT 10;

-- ============================================================================
-- Load Testing Analysis
-- ============================================================================

.print ""
.print "================================================"
.print "Load Test Results"
.print "================================================"
.print ""

SELECT
    t.url,
    t.timestamp,
    t.overall_score,
    ls.total_requests,
    ls.success_rate || '%' as success_rate,
    ls.avg_response_time || ' ms' as avg_response,
    ls.throughput || ' req/s' as throughput
FROM test_runs t
JOIN load_test_stats ls ON t.id = ls.test_run_id
WHERE t.test_suite = 'Load Testing'
ORDER BY t.timestamp DESC;

.print ""
.print "================================================"
.print "Load Test Error Analysis"
.print "================================================"
.print ""

SELECT
    t.url,
    t.timestamp,
    ea.total_errors,
    ROUND(ea.error_rate * 100, 2) || '%' as error_rate,
    ea.most_common_error
FROM test_runs t
JOIN error_analysis ea ON t.test_run_id = ea.test_run_id
WHERE t.test_suite = 'Load Testing'
ORDER BY t.timestamp DESC;

-- ============================================================================
-- Stress Testing Analysis
-- ============================================================================

.print ""
.print "================================================"
.print "Stress Test Breaking Points"
.print "================================================"
.print ""

SELECT
    t.url,
    t.timestamp,
    bp.users as breaking_users,
    bp.step as breaking_step,
    bp.reason,
    ls.users as last_successful_users,
    ROUND(ls.error_rate, 2) || '%' as last_error_rate
FROM test_runs t
JOIN stress_test_breaking_point bp ON t.id = bp.test_run_id
LEFT JOIN stress_test_last_successful ls ON t.id = ls.test_run_id
WHERE t.test_suite = 'Stress Testing'
ORDER BY t.timestamp DESC;

.print ""
.print "================================================"
.print "Stress Test System Limits"
.print "================================================"
.print ""

SELECT
    t.url,
    t.timestamp,
    sl.max_concurrent_users,
    sl.recommended_capacity,
    ROUND(sl.max_throughput, 2) as max_rps,
    ROUND(sl.scaling_factor, 2) as scaling_factor
FROM test_runs t
JOIN stress_test_limits sl ON t.id = sl.test_run_id
WHERE t.test_suite = 'Stress Testing'
ORDER BY t.timestamp DESC;

-- ============================================================================
-- Schema.org Impact Analysis
-- ============================================================================

.print ""
.print "================================================"
.print "Schema.org Impact Summary"
.print "================================================"
.print ""

SELECT
    t.url,
    t.timestamp,
    si.seo_score as "SEO",
    si.llm_score as "LLM",
    si.performance_score as "Perf",
    si.overall_score as "Overall"
FROM test_runs t
JOIN schema_impact_summary si ON t.id = si.test_run_id
ORDER BY t.timestamp DESC;

.print ""
.print "================================================"
.print "Schema.org Business Impact"
.print "================================================"
.print ""

SELECT
    t.url,
    bi.projected_traffic_increase || '%' as traffic_increase,
    bi.additional_monthly_visitors as new_visitors,
    '$' || ROUND(bi.annual_value, 0) as annual_value,
    bi.ctr_improvement || '%' as ctr_improvement,
    bi.market_positioning
FROM test_runs t
JOIN schema_business_impact bi ON t.id = bi.test_run_id
ORDER BY t.timestamp DESC;

-- ============================================================================
-- Recommendations
-- ============================================================================

.print ""
.print "================================================"
.print "Critical Recommendations"
.print "================================================"
.print ""

.width 15 40 12 50
SELECT
    t.test_suite,
    t.url,
    r.priority,
    r.issue
FROM recommendations r
JOIN test_runs t ON r.test_run_id = t.id
WHERE r.priority = 'CRITICAL'
ORDER BY t.timestamp DESC;

.print ""
.print "================================================"
.print "All Recommendations by Priority"
.print "================================================"
.print ""

SELECT
    r.priority,
    COUNT(*) as count,
    GROUP_CONCAT(DISTINCT t.test_suite) as test_suites
FROM recommendations r
JOIN test_runs t ON r.test_run_id = t.id
GROUP BY r.priority
ORDER BY
    CASE r.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
    END;

-- ============================================================================
-- Advanced Analytics
-- ============================================================================

.print ""
.print "================================================"
.print "Response Time Distribution (Load Tests)"
.print "================================================"
.print ""

SELECT
    t.url,
    ROUND(ls.min_response_time, 0) as min_ms,
    ROUND(ls.median_response_time, 0) as median_ms,
    ROUND(ls.avg_response_time, 0) as avg_ms,
    ROUND(ls.p95_response_time, 0) as p95_ms,
    ROUND(ls.p99_response_time, 0) as p99_ms,
    ROUND(ls.max_response_time, 0) as max_ms
FROM test_runs t
JOIN load_test_stats ls ON t.id = ls.test_run_id
WHERE t.test_suite = 'Load Testing'
ORDER BY t.timestamp DESC;

.print ""
.print "================================================"
.print "Test Coverage by URL"
.print "================================================"
.print ""

SELECT
    url,
    COUNT(*) as total_tests,
    COUNT(DISTINCT test_suite) as test_types,
    GROUP_CONCAT(DISTINCT test_suite) as suites_run,
    ROUND(AVG(overall_score), 1) as avg_score
FROM test_runs
GROUP BY url
ORDER BY total_tests DESC;

.print ""
.print "================================================"
.print "Recent Test Activity (Last 7 Days)"
.print "================================================"
.print ""

SELECT
    DATE(timestamp) as date,
    COUNT(*) as tests_run,
    GROUP_CONCAT(DISTINCT test_suite) as suites,
    ROUND(AVG(overall_score), 1) as avg_score
FROM test_runs
WHERE timestamp >= date('now', '-7 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- ============================================================================
-- Performance Comparison
-- ============================================================================

.print ""
.print "================================================"
.print "Core Web Vitals - Best vs Worst"
.print "================================================"
.print ""

SELECT
    'Best LCP' as metric,
    url,
    MIN(lcp_avg) as value,
    'ms' as unit
FROM v_cwv_summary
WHERE lcp_avg IS NOT NULL
UNION ALL
SELECT
    'Worst LCP' as metric,
    url,
    MAX(lcp_avg) as value,
    'ms' as unit
FROM v_cwv_summary
WHERE lcp_avg IS NOT NULL
UNION ALL
SELECT
    'Best CLS' as metric,
    url,
    MIN(cls_avg) as value,
    'ratio' as unit
FROM v_cwv_summary
WHERE cls_avg IS NOT NULL
UNION ALL
SELECT
    'Worst CLS' as metric,
    url,
    MAX(cls_avg) as value,
    'ratio' as unit
FROM v_cwv_summary
WHERE cls_avg IS NOT NULL;

-- ============================================================================
-- Database Statistics
-- ============================================================================

.print ""
.print "================================================"
.print "Database Statistics"
.print "================================================"
.print ""

SELECT
    'Total Test Runs' as metric,
    COUNT(*) as count
FROM test_runs
UNION ALL
SELECT
    'Core Web Vitals Tests',
    COUNT(*)
FROM test_runs
WHERE test_suite = 'Core Web Vitals'
UNION ALL
SELECT
    'Load Tests',
    COUNT(*)
FROM test_runs
WHERE test_suite = 'Load Testing'
UNION ALL
SELECT
    'Stress Tests',
    COUNT(*)
FROM test_runs
WHERE test_suite = 'Stress Testing'
UNION ALL
SELECT
    'Schema Impact Tests',
    COUNT(*)
FROM test_runs
WHERE test_suite = 'Schema.org Impact Analysis'
UNION ALL
SELECT
    'Total Recommendations',
    COUNT(*)
FROM recommendations
UNION ALL
SELECT
    'Critical Issues',
    COUNT(*)
FROM recommendations
WHERE priority = 'CRITICAL';

.print ""
.print "================================================"
.print "Schema Metadata"
.print "================================================"
.print ""

SELECT key, value FROM schema_metadata;
