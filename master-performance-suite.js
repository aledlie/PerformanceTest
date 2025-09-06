#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import all test suites
const CoreWebVitalsTest = require('./core-web-vitals.js');
const BeyondCoreWebVitalsTest = require('./beyond-core-web-vitals.js');
const LoadTester = require('./load-testing.js');
const StressTester = require('./stress-testing.js');
const SoakTester = require('./soak-testing.js');
const ScalabilityTester = require('./scalability-testing.js');

class MasterPerformanceSuite {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.outputDir = options.outputDir || './performance-reports';
        this.suiteOptions = options.suiteOptions || {};
        
        // Test suite configurations
        this.testSuites = {
            coreWebVitals: {
                name: 'Core Web Vitals',
                class: CoreWebVitalsTest,
                enabled: options.tests?.includes('core-web-vitals') ?? true,
                duration: '~5 minutes',
                description: 'Tests LCP, FID, and CLS metrics'
            },
            beyondCoreWebVitals: {
                name: 'Beyond Core Web Vitals',
                class: BeyondCoreWebVitalsTest,
                enabled: options.tests?.includes('beyond-core-web-vitals') ?? true,
                duration: '~5 minutes',
                description: 'Tests TTFB, FCP, TTI, TBT, and SI metrics'
            },
            load: {
                name: 'Load Testing',
                class: LoadTester,
                enabled: options.tests?.includes('load') ?? true,
                duration: '~10 minutes',
                description: 'Tests performance under expected load'
            },
            stress: {
                name: 'Stress Testing',
                class: StressTester,
                enabled: options.tests?.includes('stress') ?? true,
                duration: '~15 minutes',
                description: 'Finds system breaking point'
            },
            soak: {
                name: 'Soak Testing',
                class: SoakTester,
                enabled: options.tests?.includes('soak') ?? false, // Disabled by default due to duration
                duration: '~2 hours',
                description: 'Tests system stability over extended time'
            },
            scalability: {
                name: 'Scalability Testing',
                class: ScalabilityTester,
                enabled: options.tests?.includes('scalability') ?? true,
                duration: '~20 minutes',
                description: 'Tests multi-dimensional scaling characteristics'
            }
        };
        
        this.results = {
            summary: null,
            individual: {},
            startTime: null,
            endTime: null,
            overallScore: 0
        };
    }

    async runFullSuite() {
        console.log('🚀 Starting Master Performance Test Suite');
        console.log('=====================================\n');
        
        console.log(`Target URL: ${this.testUrl}`);
        console.log(`Output Directory: ${this.outputDir}`);
        
        // Display enabled tests
        const enabledTests = Object.entries(this.testSuites)
            .filter(([_, config]) => config.enabled)
            .map(([key, config]) => `  • ${config.name} (${config.duration})`);
        
        console.log('\nEnabled Test Suites:');
        console.log(enabledTests.join('\n'));
        
        const totalEstimatedTime = this.calculateEstimatedTime();
        console.log(`\nEstimated Total Time: ${totalEstimatedTime}`);
        console.log('\n=====================================\n');

        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }

        this.results.startTime = new Date().toISOString();

        try {
            // Run each enabled test suite
            for (const [testKey, testConfig] of Object.entries(this.testSuites)) {
                if (!testConfig.enabled) {
                    console.log(`⏭️  Skipping ${testConfig.name}\n`);
                    continue;
                }

                console.log(`🧪 Running ${testConfig.name}`);
                console.log(`📝 Description: ${testConfig.description}`);
                console.log(`⏱️  Estimated Duration: ${testConfig.duration}`);
                console.log('---');

                const suiteStartTime = Date.now();
                
                try {
                    const result = await this.runTestSuite(testKey, testConfig);
                    this.results.individual[testKey] = {
                        ...result,
                        executionTime: Date.now() - suiteStartTime,
                        status: 'SUCCESS'
                    };
                    
                    console.log(`✅ ${testConfig.name} completed successfully`);
                    console.log(`⏱️  Execution time: ${this.formatDuration(Date.now() - suiteStartTime)}\n`);
                    
                } catch (error) {
                    console.error(`❌ ${testConfig.name} failed: ${error.message}`);
                    this.results.individual[testKey] = {
                        error: error.message,
                        executionTime: Date.now() - suiteStartTime,
                        status: 'FAILED'
                    };
                    console.log(`⏱️  Execution time: ${this.formatDuration(Date.now() - suiteStartTime)}\n`);
                }
            }

            this.results.endTime = new Date().toISOString();
            
            // Generate comprehensive analysis
            const analysis = this.generateComprehensiveAnalysis();
            await this.generateMasterReport(analysis);
            
            // Display final summary
            this.displayFinalSummary(analysis);
            
            return analysis;

        } catch (error) {
            console.error('❌ Master test suite failed:', error.message);
            throw error;
        }
    }

    async runTestSuite(testKey, testConfig) {
        const options = {
            url: this.testUrl,
            reportPath: path.join(this.outputDir, `${testKey}-report.json`),
            ...this.suiteOptions[testKey]
        };

        const testInstance = new testConfig.class(options);
        
        // Different run methods for different test types
        switch (testKey) {
            case 'coreWebVitals':
            case 'beyondCoreWebVitals':
                return await testInstance.runTests();
            case 'load':
                return await testInstance.runLoadTest();
            case 'stress':
                return await testInstance.runStressTest();
            case 'soak':
                return await testInstance.runSoakTest();
            case 'scalability':
                return await testInstance.runScalabilityTest();
            default:
                throw new Error(`Unknown test suite: ${testKey}`);
        }
    }

    calculateEstimatedTime() {
        const durations = {
            coreWebVitals: 5,
            beyondCoreWebVitals: 5,
            load: 10,
            stress: 15,
            soak: 120, // 2 hours
            scalability: 20
        };

        const totalMinutes = Object.entries(this.testSuites)
            .filter(([_, config]) => config.enabled)
            .reduce((total, [key]) => total + durations[key], 0);

        if (totalMinutes >= 60) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return `${hours}h ${minutes}m`;
        } else {
            return `${totalMinutes}m`;
        }
    }

    generateComprehensiveAnalysis() {
        const successfulTests = Object.entries(this.results.individual)
            .filter(([_, result]) => result.status === 'SUCCESS');
        
        const failedTests = Object.entries(this.results.individual)
            .filter(([_, result]) => result.status === 'FAILED');

        if (successfulTests.length === 0) {
            return {
                status: 'FAILED',
                error: 'No test suites completed successfully',
                overallScore: 0,
                summary: null
            };
        }

        // Calculate overall score
        const scores = successfulTests
            .map(([_, result]) => result.overallScore || 0)
            .filter(score => score > 0);
        
        const overallScore = scores.length > 0 ? 
            Math.round(scores.reduce((a, b) => a + b) / scores.length) : 0;

        // Categorize performance metrics
        const performanceMetrics = this.extractPerformanceMetrics(successfulTests);
        const recommendations = this.consolidateRecommendations(successfulTests);
        
        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            executionSummary: {
                totalSuites: Object.keys(this.testSuites).length,
                enabledSuites: Object.values(this.testSuites).filter(s => s.enabled).length,
                successfulSuites: successfulTests.length,
                failedSuites: failedTests.length,
                totalExecutionTime: new Date(this.results.endTime) - new Date(this.results.startTime),
                startTime: this.results.startTime,
                endTime: this.results.endTime
            },
            overallScore,
            performanceGrade: this.calculatePerformanceGrade(overallScore),
            performanceMetrics,
            crossSuiteAnalysis: this.performCrossSuiteAnalysis(successfulTests),
            consolidatedRecommendations: recommendations,
            systemAssessment: this.generateSystemAssessment(performanceMetrics, overallScore),
            failedTests: failedTests.map(([key, result]) => ({
                suite: this.testSuites[key].name,
                error: result.error,
                executionTime: result.executionTime
            })),
            individualResults: this.results.individual
        };

        return analysis;
    }

    extractPerformanceMetrics(successfulTests) {
        const metrics = {
            coreWebVitals: null,
            loadPerformance: null,
            stressLimits: null,
            endurance: null,
            scalability: null
        };

        successfulTests.forEach(([testKey, result]) => {
            switch (testKey) {
                case 'coreWebVitals':
                    metrics.coreWebVitals = {
                        lcp: result.coreWebVitals?.lcp?.p75 || null,
                        fid: result.coreWebVitals?.fid?.p75 || null,
                        cls: result.coreWebVitals?.cls?.p75 || null,
                        overallRating: this.getCoreWebVitalsRating(result.coreWebVitals)
                    };
                    break;

                case 'beyondCoreWebVitals':
                    metrics.extendedWebVitals = {
                        ttfb: result.extendedMetrics?.ttfb?.median || null,
                        fcp: result.extendedMetrics?.fcp?.median || null,
                        tti: result.extendedMetrics?.tti?.median || null,
                        overallRating: this.getExtendedWebVitalsRating(result.extendedMetrics)
                    };
                    break;

                case 'load':
                    metrics.loadPerformance = {
                        requestsPerSecond: result.performanceMetrics?.requestsPerSecond || null,
                        averageResponseTime: result.performanceMetrics?.averageResponseTime || null,
                        successRate: parseFloat(result.requestStatistics?.successRate) || null,
                        p95ResponseTime: result.performanceMetrics?.p95ResponseTime || null
                    };
                    break;

                case 'stress':
                    metrics.stressLimits = {
                        breakingPoint: result.breakingPoint?.users || null,
                        maxThroughput: result.systemLimits?.maxThroughput || null,
                        recommendedCapacity: result.systemLimits?.recommendedCapacity || null
                    };
                    break;

                case 'soak':
                    metrics.endurance = {
                        uptimePercentage: parseFloat(result.stabilityAnalysis?.uptimePercentage) || null,
                        systemStability: result.stabilityAnalysis?.systemStability || null,
                        memoryEfficiency: result.resourceUtilization?.memoryEfficiency || null,
                        performanceDegradations: result.stabilityAnalysis?.performanceDegradations || 0
                    };
                    break;

                case 'scalability':
                    metrics.scalability = {
                        maxEffectiveUsers: result.scalabilityAnalysis?.userScalability?.maxEffectiveUsers || null,
                        throughputScalingPattern: result.scalabilityAnalysis?.userScalability?.throughputScaling?.pattern || null,
                        networkResilience: result.scalabilityAnalysis?.networkScalability?.networkResilience || null,
                        combinedScalabilityIndex: result.scalabilityAnalysis?.combinedScenarios?.combinedScalabilityIndex || null
                    };
                    break;
            }
        });

        return metrics;
    }

    getCoreWebVitalsRating(coreWebVitals) {
        if (!coreWebVitals) return 'NOT_TESTED';
        
        const ratings = [
            coreWebVitals.lcp?.rating,
            coreWebVitals.fid?.rating,
            coreWebVitals.cls?.rating
        ].filter(Boolean);

        if (ratings.length === 0) return 'NO_DATA';
        if (ratings.every(r => r === 'GOOD')) return 'GOOD';
        if (ratings.some(r => r === 'POOR')) return 'POOR';
        return 'NEEDS_IMPROVEMENT';
    }

    getExtendedWebVitalsRating(extendedMetrics) {
        if (!extendedMetrics) return 'NOT_TESTED';
        
        const ratings = Object.values(extendedMetrics)
            .map(metric => metric?.rating)
            .filter(Boolean);

        if (ratings.length === 0) return 'NO_DATA';
        if (ratings.every(r => r === 'GOOD')) return 'GOOD';
        if (ratings.some(r => r === 'POOR')) return 'POOR';
        return 'NEEDS_IMPROVEMENT';
    }

    performCrossSuiteAnalysis(successfulTests) {
        const analysis = {
            consistencyScore: 0,
            performanceCorrelations: [],
            systemBottlenecks: [],
            strengthsAndWeaknesses: {
                strengths: [],
                weaknesses: []
            }
        };

        // Find consistent performance patterns
        const scores = successfulTests.map(([_, result]) => result.overallScore || 0);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const scoreVariance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
        
        analysis.consistencyScore = Math.max(0, 100 - Math.sqrt(scoreVariance));

        // Identify system bottlenecks
        successfulTests.forEach(([testKey, result]) => {
            if (result.overallScore < 70) {
                analysis.systemBottlenecks.push({
                    area: this.testSuites[testKey].name,
                    score: result.overallScore,
                    primaryIssues: result.recommendations?.slice(0, 2).map(r => r.issue) || []
                });
            }
        });

        // Identify strengths and weaknesses
        successfulTests.forEach(([testKey, result]) => {
            const testName = this.testSuites[testKey].name;
            if (result.overallScore >= 90) {
                analysis.strengthsAndWeaknesses.strengths.push(`Excellent ${testName} performance`);
            } else if (result.overallScore < 60) {
                analysis.strengthsAndWeaknesses.weaknesses.push(`Poor ${testName} performance`);
            }
        });

        return analysis;
    }

    consolidateRecommendations(successfulTests) {
        const allRecommendations = [];
        const categoryGroups = {};

        // Collect all recommendations
        successfulTests.forEach(([testKey, result]) => {
            if (result.recommendations) {
                result.recommendations.forEach(rec => {
                    allRecommendations.push({
                        ...rec,
                        source: this.testSuites[testKey].name
                    });
                });
            }
        });

        // Group by category
        allRecommendations.forEach(rec => {
            const category = rec.category || 'General';
            if (!categoryGroups[category]) {
                categoryGroups[category] = [];
            }
            categoryGroups[category].push(rec);
        });

        // Prioritize and consolidate
        const consolidated = [];
        Object.entries(categoryGroups).forEach(([category, recommendations]) => {
            const critical = recommendations.filter(r => r.priority === 'CRITICAL');
            const high = recommendations.filter(r => r.priority === 'HIGH');
            const medium = recommendations.filter(r => r.priority === 'MEDIUM');
            const low = recommendations.filter(r => r.priority === 'LOW');

            // Add top recommendations from each priority level
            if (critical.length > 0) consolidated.push(...critical.slice(0, 2));
            if (high.length > 0) consolidated.push(...high.slice(0, 2));
            if (medium.length > 0) consolidated.push(...medium.slice(0, 1));
            if (low.length > 0 && consolidated.length < 8) consolidated.push(low[0]);
        });

        return consolidated.sort((a, b) => {
            const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    generateSystemAssessment(metrics, overallScore) {
        const assessment = {
            overall: this.getOverallAssessment(overallScore),
            readiness: this.assessProductionReadiness(metrics),
            scalingCapacity: this.assessScalingCapacity(metrics),
            userExperience: this.assessUserExperience(metrics),
            reliability: this.assessReliability(metrics),
            recommendations: {
                immediate: [],
                shortTerm: [],
                longTerm: []
            }
        };

        // Generate tiered recommendations
        if (overallScore < 60) {
            assessment.recommendations.immediate.push('Critical performance issues require immediate attention');
            assessment.recommendations.immediate.push('System not ready for production load');
        } else if (overallScore < 80) {
            assessment.recommendations.shortTerm.push('Address performance bottlenecks');
            assessment.recommendations.shortTerm.push('Implement monitoring and alerting');
        } else {
            assessment.recommendations.longTerm.push('Continue regular performance testing');
            assessment.recommendations.longTerm.push('Plan for future growth and scaling');
        }

        return assessment;
    }

    getOverallAssessment(score) {
        if (score >= 90) return 'EXCELLENT';
        if (score >= 80) return 'GOOD';
        if (score >= 70) return 'ACCEPTABLE';
        if (score >= 60) return 'NEEDS_IMPROVEMENT';
        return 'CRITICAL_ISSUES';
    }

    assessProductionReadiness(metrics) {
        const factors = [];
        
        if (metrics.coreWebVitals?.overallRating === 'GOOD') factors.push('Core Web Vitals: PASS');
        else factors.push('Core Web Vitals: NEEDS WORK');
        
        if (metrics.loadPerformance?.successRate > 95) factors.push('Load Handling: PASS');
        else factors.push('Load Handling: NEEDS WORK');
        
        if (metrics.stressLimits?.breakingPoint > 50) factors.push('Stress Tolerance: PASS');
        else factors.push('Stress Tolerance: NEEDS WORK');
        
        const passCount = factors.filter(f => f.includes('PASS')).length;
        
        if (passCount === factors.length) return 'READY';
        if (passCount >= factors.length * 0.7) return 'MOSTLY_READY';
        return 'NOT_READY';
    }

    assessScalingCapacity(metrics) {
        if (!metrics.scalability) return 'NOT_TESTED';
        
        const maxUsers = metrics.scalability.maxEffectiveUsers;
        const scalingPattern = metrics.scalability.throughputScalingPattern;
        
        if (maxUsers > 100 && scalingPattern === 'LINEAR') return 'EXCELLENT';
        if (maxUsers > 50 && scalingPattern !== 'DEGRADING') return 'GOOD';
        if (maxUsers > 25) return 'LIMITED';
        return 'POOR';
    }

    assessUserExperience(metrics) {
        const factors = [];
        
        if (metrics.coreWebVitals) {
            if (metrics.coreWebVitals.lcp <= 2500) factors.push('Fast loading');
            if (metrics.coreWebVitals.fid <= 100) factors.push('Responsive interaction');
            if (metrics.coreWebVitals.cls <= 0.1) factors.push('Visual stability');
        }
        
        if (metrics.loadPerformance?.averageResponseTime <= 1000) {
            factors.push('Fast response times');
        }
        
        return factors.length >= 3 ? 'EXCELLENT' :
               factors.length >= 2 ? 'GOOD' :
               factors.length >= 1 ? 'FAIR' : 'POOR';
    }

    assessReliability(metrics) {
        const factors = [];
        
        if (metrics.loadPerformance?.successRate > 99) factors.push('High success rate');
        if (metrics.endurance?.systemStability === 'EXCELLENT') factors.push('Stable over time');
        if (metrics.stressLimits?.breakingPoint > 100) factors.push('High stress tolerance');
        
        return factors.length >= 2 ? 'HIGH' :
               factors.length >= 1 ? 'MEDIUM' : 'LOW';
    }

    calculatePerformanceGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A';
        if (score >= 85) return 'A-';
        if (score >= 80) return 'B+';
        if (score >= 75) return 'B';
        if (score >= 70) return 'B-';
        if (score >= 65) return 'C+';
        if (score >= 60) return 'C';
        if (score >= 55) return 'C-';
        if (score >= 50) return 'D';
        return 'F';
    }

    displayFinalSummary(analysis) {
        console.log('\n🎯 MASTER PERFORMANCE TEST SUITE RESULTS');
        console.log('=========================================\n');
        
        console.log(`Overall Score: ${analysis.overallScore}/100 (${analysis.performanceGrade})`);
        console.log(`System Assessment: ${analysis.systemAssessment.overall}`);
        console.log(`Production Readiness: ${analysis.systemAssessment.readiness}`);
        console.log(`Total Execution Time: ${this.formatDuration(analysis.executionSummary.totalExecutionTime)}\n`);

        // Test Results Summary
        console.log('📊 Test Suite Results:');
        Object.entries(this.testSuites).forEach(([key, config]) => {
            if (!config.enabled) return;
            
            const result = analysis.individualResults[key];
            if (result) {
                const status = result.status === 'SUCCESS' ? '✅' : '❌';
                const score = result.overallScore ? ` (${result.overallScore}/100)` : '';
                const time = this.formatDuration(result.executionTime);
                console.log(`  ${status} ${config.name}${score} - ${time}`);
            }
        });

        // Key Metrics
        console.log('\n🔑 Key Performance Metrics:');
        const metrics = analysis.performanceMetrics;
        
        if (metrics.coreWebVitals) {
            console.log(`  Core Web Vitals: ${metrics.coreWebVitals.overallRating}`);
        }
        if (metrics.loadPerformance) {
            console.log(`  Load Performance: ${metrics.loadPerformance.successRate}% success rate`);
        }
        if (metrics.stressLimits) {
            console.log(`  Stress Limits: ${metrics.stressLimits.breakingPoint} user breaking point`);
        }
        if (metrics.scalability) {
            console.log(`  Scalability: ${metrics.scalability.maxEffectiveUsers} max effective users`);
        }

        // Top Recommendations
        if (analysis.consolidatedRecommendations.length > 0) {
            console.log('\n⚡ Top Recommendations:');
            analysis.consolidatedRecommendations.slice(0, 3).forEach((rec, i) => {
                console.log(`  ${i + 1}. [${rec.priority}] ${rec.issue}`);
            });
        }

        console.log(`\n📄 Detailed reports saved to: ${this.outputDir}/`);
        console.log(`📄 Master report: ${this.outputDir}/master-performance-report.json\n`);
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    async generateMasterReport(analysis) {
        const masterReport = {
            testSuite: 'Master Performance Suite',
            version: '1.0.0',
            ...analysis
        };

        const reportPath = path.join(this.outputDir, 'master-performance-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(masterReport, null, 2));
        
        return reportPath;
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        suiteOptions: {}
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--url':
                if (args[i + 1]) options.url = args[++i];
                break;
            case '--output-dir':
                if (args[i + 1]) options.outputDir = args[++i];
                break;
            case '--tests':
                if (args[i + 1]) options.tests = args[++i].split(',');
                break;
            case '--quick':
                // Quick test configuration
                options.tests = ['core-web-vitals', 'beyond-core-web-vitals', 'load'];
                options.suiteOptions.load = { maxUsers: 25, testDuration: 60 };
                break;
            case '--comprehensive':
                // Comprehensive test configuration
                options.tests = ['core-web-vitals', 'beyond-core-web-vitals', 'load', 'stress', 'scalability'];
                break;
            case '--endurance':
                // Include soak testing
                options.tests = ['core-web-vitals', 'beyond-core-web-vitals', 'load', 'stress', 'soak', 'scalability'];
                options.suiteOptions.soak = { testDurationHours: 1 }; // Shorter for demo
                break;
            case '--help':
                console.log(`
Master Performance Test Suite

Usage: node master-performance-suite.js [options]

Options:
  --url <url>              Target URL to test (default: https://inspiredmovementaustin.com)
  --output-dir <dir>       Output directory for reports (default: ./performance-reports)
  --tests <test1,test2>    Comma-separated list of tests to run
  --quick                  Run quick test suite (Core Web Vitals, Beyond Core Web Vitals, Load)
  --comprehensive          Run comprehensive suite (excludes Soak testing)
  --endurance              Run full endurance suite (includes Soak testing)
  --help                   Show this help message

Available Tests:
  core-web-vitals          Core Web Vitals (LCP, FID, CLS)
  beyond-core-web-vitals   Extended Web Vitals (TTFB, FCP, TTI, TBT, SI)
  load                     Load testing
  stress                   Stress testing
  soak                     Soak/Endurance testing
  scalability              Scalability testing

Examples:
  node master-performance-suite.js --quick
  node master-performance-suite.js --comprehensive
  node master-performance-suite.js --tests core-web-vitals,load,stress
  node master-performance-suite.js --url https://example.com --output-dir ./reports
                `);
                process.exit(0);
                break;
        }
    }

    const masterSuite = new MasterPerformanceSuite(options);
    masterSuite.runFullSuite().catch(console.error);
}

module.exports = MasterPerformanceSuite;