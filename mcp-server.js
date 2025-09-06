#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ErrorCode, McpError } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

// Import all test suites
const CoreWebVitalsTest = require('./core-web-vitals.js');
const BeyondCoreWebVitalsTest = require('./beyond-core-web-vitals.js');
const LoadTester = require('./load-testing.js');
const StressTester = require('./stress-testing.js');
const SoakTester = require('./soak-testing.js');
const ScalabilityTester = require('./scalability-testing.js');
const MasterPerformanceSuite = require('./master-performance-suite.js');

class PerformanceTestMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: "performance-test-suite",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandler();
    }

    setupToolHandlers() {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'run_performance_suite':
                        return await this.runPerformanceSuite(args);
                    
                    case 'run_core_web_vitals':
                        return await this.runCoreWebVitals(args);
                    
                    case 'run_beyond_core_web_vitals':
                        return await this.runBeyondCoreWebVitals(args);
                    
                    case 'run_load_test':
                        return await this.runLoadTest(args);
                    
                    case 'run_stress_test':
                        return await this.runStressTest(args);
                    
                    case 'run_soak_test':
                        return await this.runSoakTest(args);
                    
                    case 'run_scalability_test':
                        return await this.runScalabilityTest(args);
                    
                    case 'get_test_results':
                        return await this.getTestResults(args);
                    
                    case 'list_available_reports':
                        return await this.listAvailableReports();
                    
                    case 'get_test_status':
                        return await this.getTestStatus();
                    
                    case 'run_schema_test':
                        return await this.runSchemaTest(args);

                    default:
                        throw new McpError(
                            ErrorCode.MethodNotFound,
                            `Unknown tool: ${name}`
                        );
                }
            } catch (error) {
                if (error instanceof McpError) {
                    throw error;
                }
                
                throw new McpError(
                    ErrorCode.InternalError,
                    `Tool execution failed: ${error.message}`
                );
            }
        });
    }

    setupErrorHandler() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
    }

    async runPerformanceSuite(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            suite_type = 'comprehensive',
            output_dir = './performance-reports',
            custom_tests = null
        } = args;

        try {
            const options = {
                url,
                outputDir: output_dir
            };

            // Configure suite based on type
            switch (suite_type) {
                case 'quick':
                    options.tests = ['core-web-vitals', 'beyond-core-web-vitals', 'load'];
                    options.suiteOptions = {
                        load: { maxUsers: 25, testDuration: 60 }
                    };
                    break;
                case 'comprehensive':
                    options.tests = ['core-web-vitals', 'beyond-core-web-vitals', 'load', 'stress', 'scalability'];
                    break;
                case 'endurance':
                    options.tests = ['core-web-vitals', 'beyond-core-web-vitals', 'load', 'stress', 'soak', 'scalability'];
                    options.suiteOptions = {
                        soak: { testDurationHours: 1 } // Shorter for MCP usage
                    };
                    break;
                case 'custom':
                    if (custom_tests && Array.isArray(custom_tests)) {
                        options.tests = custom_tests;
                    } else {
                        throw new Error('Custom suite type requires custom_tests array');
                    }
                    break;
            }

            const masterSuite = new MasterPerformanceSuite(options);
            const results = await masterSuite.runFullSuite();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            suite_type,
                            target_url: url,
                            overall_score: results.overallScore,
                            performance_grade: results.performanceGrade,
                            execution_time: results.executionSummary.totalExecutionTime,
                            successful_suites: results.executionSummary.successfulSuites,
                            failed_suites: results.executionSummary.failedSuites,
                            system_assessment: results.systemAssessment,
                            top_recommendations: results.consolidatedRecommendations.slice(0, 3),
                            report_location: path.join(output_dir, 'master-performance-report.json'),
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error.message,
                            suite_type,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runCoreWebVitals(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            iterations = 5,
            output = './performance-reports/core-web-vitals-report.json'
        } = args;

        try {
            const tester = new CoreWebVitalsTest({ url, iterations, reportPath: output });
            const results = await tester.runTests();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            test_type: 'Core Web Vitals',
                            target_url: url,
                            overall_score: results.overallScore,
                            core_web_vitals: {
                                lcp: results.coreWebVitals.lcp,
                                fid: results.coreWebVitals.fid,
                                cls: results.coreWebVitals.cls
                            },
                            recommendations: results.recommendations,
                            report_location: output,
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            test_type: 'Core Web Vitals',
                            error: error.message,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runBeyondCoreWebVitals(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            iterations = 5,
            output = './performance-reports/beyond-core-web-vitals-report.json'
        } = args;

        try {
            const tester = new BeyondCoreWebVitalsTest({ url, iterations, reportPath: output });
            const results = await tester.runTests();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            test_type: 'Beyond Core Web Vitals',
                            target_url: url,
                            overall_score: results.overallScore,
                            extended_metrics: results.extendedMetrics,
                            performance_insights: results.performanceInsights,
                            recommendations: results.recommendations,
                            report_location: output,
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            test_type: 'Beyond Core Web Vitals',
                            error: error.message,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runLoadTest(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            max_users = 50,
            ramp_up_time = 60,
            test_duration = 300,
            request_delay = 1000,
            output = './performance-reports/load-test-report.json'
        } = args;

        try {
            const tester = new LoadTester({
                url,
                maxUsers: max_users,
                rampUpTime: ramp_up_time,
                testDuration: test_duration,
                requestDelay: request_delay,
                reportPath: output
            });
            
            const results = await tester.runLoadTest();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            test_type: 'Load Test',
                            target_url: url,
                            test_config: results.testConfiguration,
                            overall_score: results.overallScore,
                            performance_metrics: results.performanceMetrics,
                            request_statistics: results.requestStatistics,
                            recommendations: results.recommendations,
                            report_location: output,
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            test_type: 'Load Test',
                            error: error.message,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runStressTest(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            initial_users = 10,
            max_users = 200,
            step_size = 10,
            step_duration = 60,
            request_interval = 500,
            output = './performance-reports/stress-test-report.json'
        } = args;

        try {
            const tester = new StressTester({
                url,
                initialUsers: initial_users,
                maxUsers: max_users,
                stepSize: step_size,
                stepDuration: step_duration,
                requestInterval: request_interval,
                reportPath: output
            });
            
            const results = await tester.runStressTest();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            test_type: 'Stress Test',
                            target_url: url,
                            test_config: results.testConfiguration,
                            overall_score: results.overallScore,
                            breaking_point: results.breakingPoint,
                            system_limits: results.systemLimits,
                            last_successful_load: results.lastSuccessfulLoad,
                            recommendations: results.recommendations,
                            report_location: output,
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            test_type: 'Stress Test',
                            error: error.message,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runSoakTest(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            concurrent_users = 25,
            test_duration_hours = 0.5, // Default to 30 minutes for MCP usage
            request_interval = 2000,
            sampling_interval = 60000,
            output = './performance-reports/soak-test-report.json'
        } = args;

        try {
            const tester = new SoakTester({
                url,
                concurrentUsers: concurrent_users,
                testDurationHours: test_duration_hours,
                requestInterval: request_interval,
                samplingInterval: sampling_interval,
                reportPath: output
            });
            
            const results = await tester.runSoakTest();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            test_type: 'Soak Test',
                            target_url: url,
                            test_config: results.testConfiguration,
                            overall_score: results.overallScore,
                            endurance_metrics: results.enduranceMetrics,
                            stability_analysis: results.stabilityAnalysis,
                            resource_utilization: results.resourceUtilization,
                            recommendations: results.recommendations,
                            report_location: output,
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            test_type: 'Soak Test',
                            error: error.message,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runScalabilityTest(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com',
            user_scenarios = [1, 5, 10, 25, 50, 100],
            data_scenarios = ['light', 'medium', 'heavy'],
            network_scenarios = ['fast', 'slow', 'mobile'],
            test_duration = 60, // Shorter for MCP usage
            output = './performance-reports/scalability-test-report.json'
        } = args;

        try {
            const tester = new ScalabilityTester({
                url,
                userScenarios: user_scenarios,
                dataScenarios: data_scenarios,
                networkScenarios: network_scenarios,
                testDuration: test_duration,
                reportPath: output
            });
            
            const results = await tester.runScalabilityTest();

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            test_type: 'Scalability Test',
                            target_url: url,
                            test_config: results.testConfiguration,
                            overall_score: results.overallScore,
                            scalability_analysis: results.scalabilityAnalysis,
                            scaling_laws: results.scalingLaws,
                            performance_envelope: results.performanceEnvelope,
                            recommendations: results.recommendations,
                            report_location: output,
                            timestamp: results.timestamp
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            test_type: 'Scalability Test',
                            error: error.message,
                            target_url: url,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async runSchemaTest(args = {}) {
        const {
            url = 'https://inspiredmovementaustin.com'
        } = args;

        return new Promise((resolve, reject) => {
            const process = spawn('node', ['schema-impact-test.js'], {
                cwd: __dirname,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Try to read the schema impact report
                        const reportPath = './schema-impact-report.json';
                        let results = null;
                        
                        if (fs.existsSync(reportPath)) {
                            results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
                        }

                        resolve({
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        success: true,
                                        test_type: 'Schema.org Impact Test',
                                        target_url: url,
                                        results: results,
                                        stdout: stdout,
                                        timestamp: new Date().toISOString()
                                    }, null, 2)
                                }
                            ]
                        });
                    } catch (error) {
                        resolve({
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        success: false,
                                        test_type: 'Schema.org Impact Test',
                                        error: `Failed to parse results: ${error.message}`,
                                        stdout: stdout,
                                        stderr: stderr,
                                        timestamp: new Date().toISOString()
                                    }, null, 2)
                                }
                            ]
                        });
                    }
                } else {
                    resolve({
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    success: false,
                                    test_type: 'Schema.org Impact Test',
                                    error: `Process exited with code ${code}`,
                                    stdout: stdout,
                                    stderr: stderr,
                                    timestamp: new Date().toISOString()
                                }, null, 2)
                            }
                        ]
                    });
                }
            });

            // Set a timeout for the schema test
            setTimeout(() => {
                process.kill('SIGTERM');
                resolve({
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                test_type: 'Schema.org Impact Test',
                                error: 'Test timed out after 5 minutes',
                                timestamp: new Date().toISOString()
                            }, null, 2)
                        }
                    ]
                });
            }, 300000); // 5 minutes timeout
        });
    }

    async getTestResults(args = {}) {
        const {
            report_type = 'master',
            report_path = null
        } = args;

        try {
            let filePath;
            
            if (report_path) {
                filePath = report_path;
            } else {
                const reportDir = './performance-reports';
                switch (report_type) {
                    case 'master':
                        filePath = path.join(reportDir, 'master-performance-report.json');
                        break;
                    case 'core-web-vitals':
                        filePath = path.join(reportDir, 'core-web-vitals-report.json');
                        break;
                    case 'beyond-core-web-vitals':
                        filePath = path.join(reportDir, 'beyond-core-web-vitals-report.json');
                        break;
                    case 'load':
                        filePath = path.join(reportDir, 'load-test-report.json');
                        break;
                    case 'stress':
                        filePath = path.join(reportDir, 'stress-test-report.json');
                        break;
                    case 'soak':
                        filePath = path.join(reportDir, 'soak-test-report.json');
                        break;
                    case 'scalability':
                        filePath = path.join(reportDir, 'scalability-test-report.json');
                        break;
                    case 'schema':
                        filePath = './schema-impact-report.json';
                        break;
                    default:
                        throw new Error(`Unknown report type: ${report_type}`);
                }
            }

            if (!fs.existsSync(filePath)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                error: `Report file not found: ${filePath}`,
                                report_type,
                                timestamp: new Date().toISOString()
                            }, null, 2)
                        }
                    ]
                };
            }

            const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            report_type,
                            report_path: filePath,
                            results: results,
                            file_size: fs.statSync(filePath).size,
                            modified_time: fs.statSync(filePath).mtime,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error.message,
                            report_type,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async listAvailableReports() {
        try {
            const reportDir = './performance-reports';
            const schemaReport = './schema-impact-report.json';
            const reports = [];

            // Check performance reports directory
            if (fs.existsSync(reportDir)) {
                const files = fs.readdirSync(reportDir);
                files.forEach(file => {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(reportDir, file);
                        const stats = fs.statSync(filePath);
                        reports.push({
                            name: file,
                            path: filePath,
                            size: stats.size,
                            modified: stats.mtime,
                            type: file.replace('-report.json', '').replace('.json', '')
                        });
                    }
                });
            }

            // Check schema report
            if (fs.existsSync(schemaReport)) {
                const stats = fs.statSync(schemaReport);
                reports.push({
                    name: 'schema-impact-report.json',
                    path: schemaReport,
                    size: stats.size,
                    modified: stats.mtime,
                    type: 'schema'
                });
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            available_reports: reports,
                            total_reports: reports.length,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async getTestStatus() {
        try {
            // This is a simple implementation - in a real system you might track running tests
            const status = {
                server_status: 'running',
                available_tests: [
                    'run_performance_suite',
                    'run_core_web_vitals',
                    'run_beyond_core_web_vitals',
                    'run_load_test',
                    'run_stress_test',
                    'run_soak_test',
                    'run_scalability_test',
                    'run_schema_test'
                ],
                system_info: {
                    node_version: process.version,
                    platform: process.platform,
                    memory_usage: process.memoryUsage(),
                    uptime: process.uptime()
                }
            };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            status: status,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };

        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        }, null, 2)
                    }
                ]
            };
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("Performance Test MCP Server running on stdio");
    }
}

// Run the server
if (require.main === module) {
    const server = new PerformanceTestMCPServer();
    server.run().catch(console.error);
}

module.exports = PerformanceTestMCPServer;