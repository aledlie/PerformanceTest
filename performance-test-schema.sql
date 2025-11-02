-- Performance Test Suite Database Schema
-- Schema.org Compatible SQLite Database Design
--
-- This schema follows schema.org vocabulary patterns for storing performance test data
-- Primary types used: TestAction, WebSite, SoftwareApplication, Report
--
-- Created: 2025-11-01

-- ============================================================================
-- Core Tables (schema.org: Thing > Action > TestAction)
-- ============================================================================

-- Main test runs table (schema.org: TestAction)
CREATE TABLE test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- schema.org TestAction properties
    name TEXT NOT NULL,                    -- schema.org: name
    description TEXT,                       -- schema.org: description
    url TEXT,                              -- schema.org: target > URL (tested URL)
    identifier TEXT UNIQUE,                 -- schema.org: identifier (UUID or unique ID)

    -- Test metadata
    test_suite TEXT NOT NULL,              -- Type: Core Web Vitals, Load Testing, etc
    version TEXT NOT NULL DEFAULT '1.0.0', -- schema.org: version
    status TEXT NOT NULL,                  -- SUCCESS, FAILED, PARTIAL (schema.org: actionStatus)

    -- Temporal properties (schema.org temporal)
    start_time DATETIME NOT NULL,          -- schema.org: startTime
    end_time DATETIME,                     -- schema.org: endTime
    timestamp DATETIME NOT NULL,           -- schema.org: dateCreated

    -- Overall metrics
    overall_score INTEGER,                 -- Computed overall score (0-100)

    -- schema.org: Thing > CreativeWork > Report
    report_location TEXT,                  -- Path to full JSON report

    -- Additional context
    agent TEXT,                            -- schema.org: agent (who/what ran the test)
    environment TEXT,                      -- Test environment (production, staging, etc)

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_runs_suite ON test_runs(test_suite);
CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_timestamp ON test_runs(timestamp);
CREATE INDEX idx_test_runs_url ON test_runs(url);

-- ============================================================================
-- Core Web Vitals Tables (schema.org: QualitativeValue, QuantitativeValue)
-- ============================================================================

-- Core Web Vitals aggregated metrics
CREATE TABLE core_web_vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    -- schema.org: PropertyValue
    metric_name TEXT NOT NULL,             -- LCP, FID, CLS (schema.org: name)
    metric_type TEXT NOT NULL,             -- schema.org: @type

    -- Statistical measures (schema.org: QuantitativeValue)
    average REAL,                          -- schema.org: value
    median REAL,                           -- schema.org: median
    p75 REAL,                             -- 75th percentile
    p95 REAL,                             -- 95th percentile
    p99 REAL,                             -- 99th percentile
    min REAL,                             -- schema.org: minValue
    max REAL,                             -- schema.org: maxValue

    -- Thresholds
    passing_threshold REAL,
    needs_improvement_threshold REAL,

    -- Evaluation (schema.org: QualitativeValue)
    score INTEGER,                         -- 0-100 score
    rating TEXT,                          -- GOOD, NEEDS_IMPROVEMENT, POOR

    -- Metadata
    sample_size INTEGER,                   -- Number of measurements
    unit_code TEXT,                       -- schema.org: unitCode (ms, ratio, etc)

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_cwv_test_run ON core_web_vitals(test_run_id);
CREATE INDEX idx_cwv_metric ON core_web_vitals(metric_name);

-- Individual Core Web Vitals measurements (iterations)
CREATE TABLE cwv_iterations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    -- Iteration info
    iteration_number INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,

    -- Core Web Vitals measurements
    lcp REAL,                             -- Largest Contentful Paint (ms)
    fid REAL,                             -- First Input Delay (ms)
    cls REAL,                             -- Cumulative Layout Shift (ratio)

    -- Additional performance metrics
    dom_content_loaded REAL,              -- DOMContentLoaded (ms)
    load_complete REAL,                   -- Load event (ms)
    first_contentful_paint REAL,         -- FCP (ms)
    time_to_interactive REAL,            -- TTI (ms)
    total_bytes INTEGER,                  -- Total page weight (bytes)
    dom_nodes INTEGER,                    -- Number of DOM nodes

    -- Beyond Core Web Vitals
    ttfb REAL,                            -- Time to First Byte (ms)
    tbt REAL,                             -- Total Blocking Time (ms)
    speed_index REAL,                     -- Speed Index

    -- Errors (JSON array)
    errors TEXT,                          -- JSON array of errors

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_cwv_iter_test_run ON cwv_iterations(test_run_id);
CREATE INDEX idx_cwv_iter_timestamp ON cwv_iterations(timestamp);

-- ============================================================================
-- Load Testing Tables
-- ============================================================================

-- Load test configuration (schema.org: HowTo > configuration)
CREATE TABLE load_test_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    target_url TEXT NOT NULL,
    max_concurrent_users INTEGER,
    ramp_up_duration INTEGER,            -- seconds
    test_duration INTEGER,               -- seconds
    actual_duration INTEGER,             -- actual runtime
    request_delay INTEGER,               -- milliseconds between requests

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Load test request statistics
CREATE TABLE load_test_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    -- Request counts
    total_requests INTEGER NOT NULL,
    successful_requests INTEGER NOT NULL,
    failed_requests INTEGER NOT NULL,

    -- Rates (schema.org: QuantitativeValue)
    success_rate REAL,                   -- percentage
    error_rate REAL,                     -- percentage

    -- Performance metrics
    avg_response_time REAL,              -- milliseconds
    median_response_time REAL,
    p95_response_time REAL,
    p99_response_time REAL,
    min_response_time REAL,
    max_response_time REAL,

    -- Throughput
    requests_per_second REAL,
    peak_rps REAL,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Load test time slices (time series data)
CREATE TABLE load_test_time_slices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    -- schema.org temporal
    start_time DATETIME NOT NULL,
    duration INTEGER NOT NULL,           -- seconds

    -- Metrics for this time slice
    requests INTEGER,
    successful_requests INTEGER,
    failed_requests INTEGER,
    avg_response_time REAL,
    requests_per_second REAL,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_load_slices_test_run ON load_test_time_slices(test_run_id);
CREATE INDEX idx_load_slices_time ON load_test_time_slices(start_time);

-- Load test timeline (detailed time series)
CREATE TABLE load_test_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    timestamp BIGINT NOT NULL,           -- Unix timestamp in milliseconds
    active_users INTEGER,
    total_requests INTEGER,
    total_errors INTEGER,
    requests_per_second INTEGER,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_load_timeline_test_run ON load_test_timeline(test_run_id);
CREATE INDEX idx_load_timeline_timestamp ON load_test_timeline(timestamp);

-- ============================================================================
-- Stress Testing Tables
-- ============================================================================

-- Stress test configuration
CREATE TABLE stress_test_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    target_url TEXT NOT NULL,
    initial_users INTEGER,
    max_users INTEGER,
    step_size INTEGER,                   -- user increment per step
    step_duration INTEGER,               -- seconds
    total_steps INTEGER,
    request_interval INTEGER,            -- milliseconds

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Stress test breaking point
CREATE TABLE stress_test_breaking_point (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    users INTEGER,                       -- Number of users at breaking point
    step INTEGER,                        -- Step number
    reason TEXT,                         -- Why it broke

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Last successful load before breaking
CREATE TABLE stress_test_last_successful (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    step INTEGER,
    users INTEGER,
    error_rate REAL,
    avg_response_time REAL,
    requests_per_second REAL,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Stress test step results (performance progression)
CREATE TABLE stress_test_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    step_number INTEGER NOT NULL,
    users INTEGER NOT NULL,

    -- Performance metrics
    error_rate REAL,
    avg_response_time REAL,
    throughput REAL,                     -- requests per second

    -- Request statistics
    total_requests INTEGER,
    successful_requests INTEGER,
    failed_requests INTEGER,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_stress_steps_test_run ON stress_test_steps(test_run_id);

-- Stress test system limits
CREATE TABLE stress_test_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    max_throughput REAL,
    max_concurrent_users INTEGER,
    recommended_capacity INTEGER,
    scaling_factor REAL,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Soak Testing Tables
-- ============================================================================

CREATE TABLE soak_test_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    target_url TEXT NOT NULL,
    concurrent_users INTEGER,
    test_duration_hours REAL,
    request_interval INTEGER,           -- milliseconds
    sampling_interval INTEGER,          -- milliseconds

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE soak_test_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    timestamp DATETIME NOT NULL,
    elapsed_time INTEGER,               -- seconds since start

    -- Performance metrics
    avg_response_time REAL,
    error_rate REAL,
    throughput REAL,

    -- Resource metrics
    memory_usage REAL,                  -- MB or percentage
    cpu_usage REAL,                     -- percentage

    -- Request counts
    total_requests INTEGER,
    successful_requests INTEGER,
    failed_requests INTEGER,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_soak_samples_test_run ON soak_test_samples(test_run_id);
CREATE INDEX idx_soak_samples_timestamp ON soak_test_samples(timestamp);

-- ============================================================================
-- Scalability Testing Tables
-- ============================================================================

CREATE TABLE scalability_test_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    target_url TEXT NOT NULL,
    test_duration INTEGER,              -- seconds per scenario

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE scalability_scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    scenario_id TEXT NOT NULL,          -- unique scenario identifier

    -- Scenario dimensions
    user_count INTEGER,
    data_load TEXT,                     -- light, medium, heavy
    network_condition TEXT,             -- fast, slow, mobile

    -- Performance results
    avg_response_time REAL,
    error_rate REAL,
    throughput REAL,
    p95_response_time REAL,

    -- Resource utilization
    cpu_usage REAL,
    memory_usage REAL,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_scalability_test_run ON scalability_scenarios(test_run_id);
CREATE INDEX idx_scalability_scenario ON scalability_scenarios(scenario_id);

-- ============================================================================
-- Schema.org Impact Analysis Tables
-- ============================================================================

CREATE TABLE schema_impact_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    website TEXT NOT NULL,
    total_tests INTEGER,

    -- Category scores
    seo_score INTEGER,
    llm_score INTEGER,
    performance_score INTEGER,
    overall_score INTEGER,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE schema_seo_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    metric_name TEXT NOT NULL,
    score INTEGER,
    max_score INTEGER,
    details TEXT,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_schema_seo_test_run ON schema_seo_metrics(test_run_id);

CREATE TABLE schema_llm_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    metric_name TEXT NOT NULL,
    score INTEGER,
    max_score INTEGER,
    details TEXT,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_schema_llm_test_run ON schema_llm_metrics(test_run_id);

CREATE TABLE schema_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    metric_name TEXT NOT NULL,
    score INTEGER,
    max_score INTEGER,
    details TEXT,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_schema_perf_test_run ON schema_performance_metrics(test_run_id);

CREATE TABLE schema_business_impact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL UNIQUE,

    -- Organic traffic projection
    current_monthly_traffic INTEGER,
    projected_traffic_increase REAL,   -- percentage
    additional_monthly_visitors INTEGER,
    annual_value REAL,                  -- dollar value
    traffic_confidence INTEGER,         -- percentage

    -- Click-through rate
    current_ctr REAL,                   -- percentage
    projected_ctr REAL,                 -- percentage
    ctr_improvement REAL,               -- percentage
    additional_clicks INTEGER,
    ctr_confidence INTEGER,

    -- Voice search
    monthly_voice_searches INTEGER,
    voice_capture_rate REAL,            -- percentage
    additional_voice_traffic INTEGER,
    yearly_voice_value REAL,
    voice_confidence INTEGER,

    -- Brand authority
    knowledge_graph_likelihood TEXT,
    trust_signal_score REAL,            -- 0-10
    competitive_advantage TEXT,
    brand_recognition_lift REAL,        -- percentage
    market_positioning TEXT,
    brand_confidence REAL,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Error Analysis Tables
-- ============================================================================

CREATE TABLE error_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    total_errors INTEGER,
    error_rate REAL,
    most_common_error TEXT,

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE errors_by_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_analysis_id INTEGER NOT NULL,

    error_type TEXT NOT NULL,
    error_message TEXT,
    count INTEGER NOT NULL,

    FOREIGN KEY (error_analysis_id) REFERENCES error_analysis(id) ON DELETE CASCADE
);

CREATE INDEX idx_errors_by_type_analysis ON errors_by_type(error_analysis_id);

CREATE TABLE errors_by_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_analysis_id INTEGER NOT NULL,

    status_code TEXT NOT NULL,
    count INTEGER NOT NULL,

    FOREIGN KEY (error_analysis_id) REFERENCES error_analysis(id) ON DELETE CASCADE
);

CREATE INDEX idx_errors_by_status_analysis ON errors_by_status(error_analysis_id);

-- ============================================================================
-- Recommendations Table (schema.org: Recommendation)
-- ============================================================================

CREATE TABLE recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_run_id INTEGER NOT NULL,

    -- schema.org: Recommendation
    category TEXT NOT NULL,              -- schema.org: category
    priority TEXT NOT NULL,              -- CRITICAL, HIGH, MEDIUM, LOW
    issue TEXT NOT NULL,                 -- schema.org: name
    impact TEXT,                         -- schema.org: description
    solutions TEXT,                      -- JSON array of solution steps

    -- Additional metadata
    recommendation_order INTEGER,        -- Display order

    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE INDEX idx_recommendations_test_run ON recommendations(test_run_id);
CREATE INDEX idx_recommendations_priority ON recommendations(priority);

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Latest test results by suite
CREATE VIEW v_latest_tests AS
SELECT
    t.id,
    t.test_suite,
    t.url,
    t.status,
    t.overall_score,
    t.timestamp,
    t.report_location
FROM test_runs t
INNER JOIN (
    SELECT test_suite, MAX(timestamp) as max_timestamp
    FROM test_runs
    GROUP BY test_suite
) latest ON t.test_suite = latest.test_suite AND t.timestamp = latest.max_timestamp;

-- Core Web Vitals summary
CREATE VIEW v_cwv_summary AS
SELECT
    t.id as test_run_id,
    t.url,
    t.timestamp,
    t.overall_score,
    MAX(CASE WHEN cwv.metric_name = 'LCP' THEN cwv.average END) as lcp_avg,
    MAX(CASE WHEN cwv.metric_name = 'LCP' THEN cwv.rating END) as lcp_rating,
    MAX(CASE WHEN cwv.metric_name = 'FID' THEN cwv.average END) as fid_avg,
    MAX(CASE WHEN cwv.metric_name = 'FID' THEN cwv.rating END) as fid_rating,
    MAX(CASE WHEN cwv.metric_name = 'CLS' THEN cwv.average END) as cls_avg,
    MAX(CASE WHEN cwv.metric_name = 'CLS' THEN cwv.rating END) as cls_rating
FROM test_runs t
LEFT JOIN core_web_vitals cwv ON t.id = cwv.test_run_id
WHERE t.test_suite = 'Core Web Vitals'
GROUP BY t.id, t.url, t.timestamp, t.overall_score;

-- Performance trends over time
CREATE VIEW v_performance_trends AS
SELECT
    DATE(timestamp) as test_date,
    test_suite,
    url,
    AVG(overall_score) as avg_score,
    MIN(overall_score) as min_score,
    MAX(overall_score) as max_score,
    COUNT(*) as test_count
FROM test_runs
GROUP BY DATE(timestamp), test_suite, url
ORDER BY test_date DESC;

-- ============================================================================
-- Triggers for data integrity and automation
-- ============================================================================

-- Update timestamp on modification
CREATE TRIGGER update_test_runs_timestamp
AFTER UPDATE ON test_runs
BEGIN
    UPDATE test_runs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- Schema Metadata (schema.org: DataCatalog)
-- ============================================================================

CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_metadata (key, value, description) VALUES
    ('schema_version', '1.0.0', 'Database schema version'),
    ('schema_type', 'PerformanceTest', 'Primary schema.org type'),
    ('created_date', '2025-11-01', 'Schema creation date'),
    ('compatible_with', 'schema.org/TestAction', 'Schema.org vocabulary compatibility'),
    ('database_engine', 'SQLite', 'Database engine'),
    ('description', 'Performance testing database schema compatible with schema.org vocabulary', 'Schema description');
