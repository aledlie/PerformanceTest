#!/usr/bin/env node

/**
 * Performance Test Data Import Utility
 *
 * Imports JSON performance test reports into SQLite database
 * following the schema.org compatible schema.
 *
 * Usage:
 *   node import-test-data.js [options]
 *
 * Options:
 *   --db <path>           Database file path (default: performance_tests.db)
 *   --reports <dir>       Reports directory (default: ./performance-reports)
 *   --file <path>         Import single file
 *   --init                Initialize database schema
 *   --clear               Clear all data before import
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class TestDataImporter {
    constructor(dbPath = 'performance_tests.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else {
                    console.log(`✅ Connected to database: ${this.dbPath}`);
                    resolve();
                }
            });
        });
    }

    async initSchema() {
        const schemaPath = path.join(__dirname, 'performance-test-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        return new Promise((resolve, reject) => {
            this.db.exec(schema, (err) => {
                if (err) reject(err);
                else {
                    console.log('✅ Schema initialized successfully');
                    resolve();
                }
            });
        });
    }

    async clearData() {
        const tables = [
            'recommendations', 'errors_by_status', 'errors_by_type', 'error_analysis',
            'schema_business_impact', 'schema_performance_metrics', 'schema_llm_metrics',
            'schema_seo_metrics', 'schema_impact_summary', 'scalability_scenarios',
            'scalability_test_config', 'soak_test_samples', 'soak_test_config',
            'stress_test_limits', 'stress_test_steps', 'stress_test_last_successful',
            'stress_test_breaking_point', 'stress_test_config', 'load_test_timeline',
            'load_test_time_slices', 'load_test_stats', 'load_test_config',
            'cwv_iterations', 'core_web_vitals', 'test_runs'
        ];

        for (const table of tables) {
            await this.run(`DELETE FROM ${table}`);
        }
        console.log('✅ All data cleared');
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async importCoreWebVitals(report, filePath) {
        console.log(`\n📊 Importing Core Web Vitals: ${report.testConfig.url}`);

        const testRunId = await this.insertTestRun({
            name: `Core Web Vitals - ${report.testConfig.url}`,
            url: report.testConfig.url,
            identifier: `cwv-${Date.now()}`,
            test_suite: 'Core Web Vitals',
            version: report.version,
            status: report.status,
            start_time: new Date(report.timestamp),
            end_time: new Date(report.timestamp),
            timestamp: new Date(report.timestamp),
            overall_score: report.overallScore,
            report_location: filePath
        });

        // Import Core Web Vitals metrics
        for (const [metricName, metricData] of Object.entries(report.coreWebVitals)) {
            await this.run(`
                INSERT INTO core_web_vitals (
                    test_run_id, metric_name, metric_type,
                    average, median, p75, min, max,
                    passing_threshold, needs_improvement_threshold,
                    score, rating, sample_size, unit_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                testRunId, metricName.toUpperCase(), metricName.toUpperCase(),
                metricData.average, metricData.median, metricData.p75,
                metricData.min, metricData.max,
                metricData.passingThreshold, metricData.needsImprovementThreshold,
                metricData.score, metricData.rating, metricData.sampleSize,
                metricName === 'cls' ? 'ratio' : 'ms'
            ]);
        }

        // Import iterations
        if (report.rawData) {
            for (const iteration of report.rawData) {
                await this.run(`
                    INSERT INTO cwv_iterations (
                        test_run_id, iteration_number, timestamp,
                        lcp, fid, cls,
                        dom_content_loaded, load_complete,
                        first_contentful_paint, time_to_interactive,
                        total_bytes, dom_nodes, errors
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    testRunId, iteration.iteration, new Date(iteration.timestamp),
                    iteration.lcp, iteration.fid, iteration.cls,
                    iteration.performanceMetrics?.domContentLoaded,
                    iteration.performanceMetrics?.loadComplete,
                    iteration.performanceMetrics?.firstContentfulPaint,
                    iteration.performanceMetrics?.timeToInteractive,
                    iteration.performanceMetrics?.totalBytes,
                    iteration.performanceMetrics?.domNodes,
                    JSON.stringify(iteration.errors || [])
                ]);
            }
        }

        console.log(`✅ Imported Core Web Vitals test (ID: ${testRunId})`);
        return testRunId;
    }

    async importLoadTest(report, filePath) {
        console.log(`\n🔄 Importing Load Test: ${report.testConfiguration.targetUrl}`);

        const testRunId = await this.insertTestRun({
            name: `Load Test - ${report.testConfiguration.targetUrl}`,
            url: report.testConfiguration.targetUrl,
            identifier: `load-${Date.now()}`,
            test_suite: 'Load Testing',
            version: report.version,
            status: report.status,
            start_time: new Date(report.timestamp),
            end_time: new Date(report.timestamp),
            timestamp: new Date(report.timestamp),
            overall_score: report.overallScore,
            report_location: filePath
        });

        // Import configuration
        await this.run(`
            INSERT INTO load_test_config (
                test_run_id, target_url, max_concurrent_users,
                ramp_up_duration, test_duration, actual_duration
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            testRunId,
            report.testConfiguration.targetUrl,
            report.testConfiguration.maxConcurrentUsers,
            report.testConfiguration.rampUpDuration,
            report.testConfiguration.testDuration,
            report.testConfiguration.actualDuration
        ]);

        // Import statistics
        const stats = report.requestStatistics;
        const perf = report.performanceMetrics;
        await this.run(`
            INSERT INTO load_test_stats (
                test_run_id, total_requests, successful_requests, failed_requests,
                success_rate, error_rate,
                avg_response_time, median_response_time,
                p95_response_time, p99_response_time,
                min_response_time, max_response_time,
                requests_per_second, peak_rps
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testRunId, stats.total, stats.successful, stats.failed,
            parseFloat(stats.successRate), parseFloat(stats.errorRate),
            perf.averageResponseTime, perf.medianResponseTime,
            perf.p95ResponseTime, perf.p99ResponseTime,
            perf.minResponseTime, perf.maxResponseTime,
            perf.requestsPerSecond, perf.peakRPS
        ]);

        // Import time slices
        if (report.loadPatterns?.timeSlices) {
            for (const slice of report.loadPatterns.timeSlices) {
                await this.run(`
                    INSERT INTO load_test_time_slices (
                        test_run_id, start_time, duration,
                        requests, successful_requests, failed_requests,
                        avg_response_time, requests_per_second
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    testRunId, new Date(slice.startTime), slice.duration,
                    slice.requests, slice.successfulRequests, slice.failedRequests,
                    slice.averageResponseTime, slice.requestsPerSecond
                ]);
            }
        }

        // Import timeline
        if (report.timeline) {
            for (const point of report.timeline) {
                await this.run(`
                    INSERT INTO load_test_timeline (
                        test_run_id, timestamp, active_users,
                        total_requests, total_errors, requests_per_second
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    testRunId, point.timestamp, point.activeUsers,
                    point.totalRequests, point.totalErrors, point.requestsPerSecond
                ]);
            }
        }

        // Import error analysis
        if (report.errorAnalysis) {
            const errorAnalysisId = await this.run(`
                INSERT INTO error_analysis (
                    test_run_id, total_errors, error_rate, most_common_error
                ) VALUES (?, ?, ?, ?)
            `, [
                testRunId,
                report.errorAnalysis.totalErrors,
                report.errorAnalysis.errorRate,
                report.errorAnalysis.mostCommonError
            ]);

            // Import errors by type
            if (report.errorAnalysis.errorsByType) {
                for (const [errorMsg, count] of Object.entries(report.errorAnalysis.errorsByType)) {
                    await this.run(`
                        INSERT INTO errors_by_type (error_analysis_id, error_type, error_message, count)
                        VALUES (?, ?, ?, ?)
                    `, [errorAnalysisId, 'HTTP_ERROR', errorMsg, count]);
                }
            }

            // Import errors by status
            if (report.errorAnalysis.errorsByStatusCode) {
                for (const [statusCode, count] of Object.entries(report.errorAnalysis.errorsByStatusCode)) {
                    await this.run(`
                        INSERT INTO errors_by_status (error_analysis_id, status_code, count)
                        VALUES (?, ?, ?)
                    `, [errorAnalysisId, statusCode, count]);
                }
            }
        }

        // Import recommendations
        await this.importRecommendations(testRunId, report.recommendations);

        console.log(`✅ Imported Load Test (ID: ${testRunId})`);
        return testRunId;
    }

    async importStressTest(report, filePath) {
        console.log(`\n⚡ Importing Stress Test: ${report.testConfiguration.targetUrl}`);

        const testRunId = await this.insertTestRun({
            name: `Stress Test - ${report.testConfiguration.targetUrl}`,
            url: report.testConfiguration.targetUrl,
            identifier: `stress-${Date.now()}`,
            test_suite: 'Stress Testing',
            version: report.version,
            status: report.status,
            start_time: new Date(report.timestamp),
            end_time: new Date(report.timestamp),
            timestamp: new Date(report.timestamp),
            overall_score: report.overallScore,
            report_location: filePath
        });

        // Import configuration
        await this.run(`
            INSERT INTO stress_test_config (
                test_run_id, target_url, initial_users, max_users,
                step_size, step_duration, total_steps
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            testRunId,
            report.testConfiguration.targetUrl,
            report.testConfiguration.initialUsers,
            report.testConfiguration.maxUsers,
            report.testConfiguration.stepSize,
            report.testConfiguration.stepDuration,
            report.testConfiguration.totalSteps
        ]);

        // Import breaking point
        if (report.breakingPoint) {
            await this.run(`
                INSERT INTO stress_test_breaking_point (test_run_id, users, step, reason)
                VALUES (?, ?, ?, ?)
            `, [
                testRunId,
                report.breakingPoint.users,
                report.breakingPoint.step,
                report.breakingPoint.reason
            ]);
        }

        // Import last successful load
        if (report.lastSuccessfulLoad) {
            await this.run(`
                INSERT INTO stress_test_last_successful (
                    test_run_id, step, users, error_rate,
                    avg_response_time, requests_per_second
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                testRunId,
                report.lastSuccessfulLoad.step,
                report.lastSuccessfulLoad.users,
                report.lastSuccessfulLoad.errorRate,
                report.lastSuccessfulLoad.avgResponseTime,
                report.lastSuccessfulLoad.requestsPerSecond
            ]);
        }

        // Import system limits
        if (report.systemLimits) {
            await this.run(`
                INSERT INTO stress_test_limits (
                    test_run_id, max_throughput, max_concurrent_users,
                    recommended_capacity, scaling_factor
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                testRunId,
                report.systemLimits.maxThroughput,
                report.systemLimits.maxConcurrentUsers,
                report.systemLimits.recommendedCapacity,
                report.systemLimits.scalingFactor
            ]);
        }

        // Import recommendations
        await this.importRecommendations(testRunId, report.recommendations);

        console.log(`✅ Imported Stress Test (ID: ${testRunId})`);
        return testRunId;
    }

    async importSchemaImpact(report, filePath) {
        console.log(`\n🔍 Importing Schema Impact: ${report.website}`);

        const testRunId = await this.insertTestRun({
            name: `Schema Impact Analysis - ${report.website}`,
            url: report.website,
            identifier: `schema-${Date.now()}`,
            test_suite: 'Schema.org Impact Analysis',
            version: '1.0.0',
            status: 'SUCCESS',
            start_time: new Date(report.timestamp),
            end_time: new Date(report.timestamp),
            timestamp: new Date(report.timestamp),
            overall_score: report.summary.overallScore,
            report_location: filePath
        });

        // Import summary
        await this.run(`
            INSERT INTO schema_impact_summary (
                test_run_id, website, total_tests,
                seo_score, llm_score, performance_score, overall_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            testRunId, report.website, report.summary.totalTests,
            report.summary.seoScore, report.summary.llmScore,
            report.summary.performanceScore, report.summary.overallScore
        ]);

        // Import SEO metrics
        for (const [metricName, data] of Object.entries(report.detailedResults.seo)) {
            await this.run(`
                INSERT INTO schema_seo_metrics (test_run_id, metric_name, score, max_score, details)
                VALUES (?, ?, ?, ?, ?)
            `, [testRunId, metricName, data.score, data.maxScore, data.details]);
        }

        // Import LLM metrics
        for (const [metricName, data] of Object.entries(report.detailedResults.llm)) {
            await this.run(`
                INSERT INTO schema_llm_metrics (test_run_id, metric_name, score, max_score, details)
                VALUES (?, ?, ?, ?, ?)
            `, [testRunId, metricName, data.score, data.maxScore, data.details]);
        }

        // Import Performance metrics
        for (const [metricName, data] of Object.entries(report.detailedResults.performance)) {
            await this.run(`
                INSERT INTO schema_performance_metrics (test_run_id, metric_name, score, max_score, details)
                VALUES (?, ?, ?, ?, ?)
            `, [testRunId, metricName, data.score, data.maxScore, data.details]);
        }

        // Import Business Impact
        const bi = report.detailedResults.businessImpact;
        await this.run(`
            INSERT INTO schema_business_impact (
                test_run_id,
                current_monthly_traffic, projected_traffic_increase,
                additional_monthly_visitors, annual_value, traffic_confidence,
                current_ctr, projected_ctr, ctr_improvement,
                additional_clicks, ctr_confidence,
                monthly_voice_searches, voice_capture_rate,
                additional_voice_traffic, yearly_voice_value, voice_confidence,
                knowledge_graph_likelihood, trust_signal_score,
                competitive_advantage, brand_recognition_lift,
                market_positioning, brand_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testRunId,
            bi.organicTraffic.currentMonthlyTraffic,
            parseFloat(bi.organicTraffic.projectedIncrease),
            bi.organicTraffic.additionalMonthlyVisitors,
            parseFloat(bi.organicTraffic.annualizedValue.replace(/[^0-9.-]/g, '')),
            bi.organicTraffic.confidence,
            parseFloat(bi.clickThroughRate.currentCTR),
            parseFloat(bi.clickThroughRate.projectedCTR),
            parseFloat(bi.clickThroughRate.improvement),
            bi.clickThroughRate.additionalClicks,
            bi.clickThroughRate.confidence,
            bi.voiceSearchCapture.monthlyVoiceSearches,
            parseFloat(bi.voiceSearchCapture.estimatedCaptureRate),
            bi.voiceSearchCapture.additionalVoiceTraffic,
            parseFloat(bi.voiceSearchCapture.yearlyValue.replace(/[^0-9.-]/g, '')),
            bi.voiceSearchCapture.confidence,
            bi.brandAuthority.knowledgeGraphLikelihood,
            parseFloat(bi.brandAuthority.trustSignalScore.split('/')[0]),
            bi.brandAuthority.competitiveAdvantage,
            parseFloat(bi.brandAuthority.brandRecognitionLift),
            bi.brandAuthority.marketPositioning,
            bi.brandAuthority.confidence
        ]);

        console.log(`✅ Imported Schema Impact (ID: ${testRunId})`);
        return testRunId;
    }

    async insertTestRun(data) {
        return await this.run(`
            INSERT INTO test_runs (
                name, url, identifier, test_suite, version, status,
                start_time, end_time, timestamp, overall_score, report_location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            data.name, data.url, data.identifier, data.test_suite,
            data.version, data.status, data.start_time, data.end_time,
            data.timestamp, data.overall_score, data.report_location
        ]);
    }

    async importRecommendations(testRunId, recommendations) {
        if (!recommendations || recommendations.length === 0) return;

        for (let i = 0; i < recommendations.length; i++) {
            const rec = recommendations[i];
            await this.run(`
                INSERT INTO recommendations (
                    test_run_id, category, priority, issue, impact, solutions, recommendation_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                testRunId, rec.category, rec.priority, rec.issue,
                rec.impact, JSON.stringify(rec.solutions || []), i
            ]);
        }
    }

    async importFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const report = JSON.parse(content);

            // Determine report type and import accordingly
            if (report.testSuite === 'Core Web Vitals' || report.coreWebVitals) {
                await this.importCoreWebVitals(report, filePath);
            } else if (report.testSuite === 'Load Testing' || report.testConfiguration?.targetUrl) {
                await this.importLoadTest(report, filePath);
            } else if (report.testSuite === 'Stress Testing' || report.breakingPoint) {
                await this.importStressTest(report, filePath);
            } else if (report.testSuite === 'Schema.org Impact Analysis' || report.detailedResults) {
                await this.importSchemaImpact(report, filePath);
            } else {
                console.log(`⚠️  Unknown report type: ${filePath}`);
            }
        } catch (error) {
            console.error(`❌ Error importing ${filePath}:`, error.message);
        }
    }

    async importDirectory(dirPath) {
        const files = fs.readdirSync(dirPath)
            .filter(f => f.endsWith('.json'))
            .map(f => path.join(dirPath, f));

        console.log(`\n📁 Found ${files.length} JSON files in ${dirPath}\n`);

        for (const file of files) {
            await this.importFile(file);
        }
    }

    close() {
        if (this.db) {
            this.db.close();
            console.log('\n✅ Database connection closed');
        }
    }
}

// CLI
async function main() {
    const args = process.argv.slice(2);

    let dbPath = 'performance_tests.db';
    let reportsDir = './performance-reports';
    let singleFile = null;
    let shouldInit = false;
    let shouldClear = false;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--db' && args[i + 1]) {
            dbPath = args[++i];
        } else if (args[i] === '--reports' && args[i + 1]) {
            reportsDir = args[++i];
        } else if (args[i] === '--file' && args[i + 1]) {
            singleFile = args[++i];
        } else if (args[i] === '--init') {
            shouldInit = true;
        } else if (args[i] === '--clear') {
            shouldClear = true;
        } else if (args[i] === '--help') {
            console.log(`
Performance Test Data Import Utility

Usage:
  node import-test-data.js [options]

Options:
  --db <path>       Database file path (default: performance_tests.db)
  --reports <dir>   Reports directory (default: ./performance-reports)
  --file <path>     Import single file
  --init            Initialize database schema
  --clear           Clear all data before import
  --help            Show this help message

Examples:
  # Initialize database and import all reports
  node import-test-data.js --init --reports ./performance-reports

  # Import single file
  node import-test-data.js --file ./performance-reports/load-report.json

  # Clear and re-import
  node import-test-data.js --clear --reports ./performance-reports
            `);
            process.exit(0);
        }
    }

    const importer = new TestDataImporter(dbPath);

    try {
        await importer.connect();

        if (shouldInit) {
            await importer.initSchema();
        }

        if (shouldClear) {
            await importer.clearData();
        }

        if (singleFile) {
            await importer.importFile(singleFile);
        } else {
            await importer.importDirectory(reportsDir);
        }

        console.log('\n🎉 Import completed successfully!');
    } catch (error) {
        console.error('\n❌ Import failed:', error);
        process.exit(1);
    } finally {
        importer.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = { TestDataImporter };
