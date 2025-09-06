#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class SoakTester {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.reportPath = options.reportPath || './soak-test-report.json';
        this.concurrentUsers = options.concurrentUsers || 25;
        this.testDurationHours = options.testDurationHours || 2;
        this.requestInterval = options.requestInterval || 2000; // ms between requests per user
        this.samplingInterval = options.samplingInterval || 60000; // Sample metrics every minute
        
        this.results = {
            samples: [],
            memoryLeaks: [],
            performanceDegradation: [],
            summary: null
        };
        
        this.activeUsers = 0;
        this.testStartTime = null;
        this.testEndTime = null;
        this.totalRequests = 0;
        this.totalErrors = 0;
        this.isRunning = false;
        this.samplingTimer = null;
    }

    async runSoakTest() {
        console.log('⏰ Starting Soak Testing (Endurance Test)');
        console.log(`Target URL: ${this.testUrl}`);
        console.log(`Concurrent Users: ${this.concurrentUsers}`);
        console.log(`Test Duration: ${this.testDurationHours} hours`);
        console.log(`Request Interval: ${this.requestInterval}ms`);
        
        this.testStartTime = Date.now();
        this.testEndTime = this.testStartTime + (this.testDurationHours * 60 * 60 * 1000);
        this.isRunning = true;
        
        try {
            // Start periodic sampling
            this.startPeriodicSampling();
            
            // Execute the soak test
            await this.executeSoakTest();
            
            this.stopPeriodicSampling();
            
            const analysis = this.analyzeResults();
            await this.generateReport(analysis);
            
            console.log('\n✅ Soak testing completed');
            console.log(`📄 Report saved to: ${this.reportPath}`);
            console.log(`🕐 Total test duration: ${this.formatDuration(Date.now() - this.testStartTime)}`);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Soak testing failed:', error.message);
            throw error;
        } finally {
            this.isRunning = false;
            this.stopPeriodicSampling();
        }
    }

    async executeSoakTest() {
        const userPromises = [];
        
        // Spawn all concurrent users
        for (let i = 0; i < this.concurrentUsers; i++) {
            const userPromise = this.simulateSoakUser(i + 1);
            userPromises.push(userPromise);
            this.activeUsers++;
            
            console.log(`👤 Spawned user ${i + 1}/${this.concurrentUsers}`);
            
            // Gradual ramp-up to avoid thundering herd
            if (i < this.concurrentUsers - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`🏁 All ${this.concurrentUsers} users active. Soak test running for ${this.testDurationHours} hours...`);
        
        // Wait for all users to complete or timeout
        const results = await Promise.allSettled(userPromises);
        
        // Count any users that failed to start properly
        const failedUsers = results.filter(r => r.status === 'rejected').length;
        if (failedUsers > 0) {
            console.log(`⚠️ ${failedUsers} users failed during the test`);
        }
    }

    async simulateSoakUser(userId) {
        const userStartTime = Date.now();
        let userRequests = 0;
        let userErrors = 0;
        
        try {
            while (Date.now() < this.testEndTime && this.isRunning) {
                const requestStart = Date.now();
                
                try {
                    const response = await axios.get(this.testUrl, {
                        timeout: 30000,
                        headers: {
                            'User-Agent': `SoakTester-User-${userId}`,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Connection': 'keep-alive',
                            'Cache-Control': 'no-cache, no-store, must-revalidate'
                        }
                    });
                    
                    const requestEnd = Date.now();
                    const responseTime = requestEnd - requestStart;
                    
                    userRequests++;
                    this.totalRequests++;
                    
                    // Log slow responses
                    if (responseTime > 10000) {
                        console.log(`⚠️ Slow response: User ${userId}, ${responseTime}ms`);
                    }
                    
                } catch (error) {
                    userErrors++;
                    this.totalErrors++;
                    
                    // Log different types of errors
                    if (error.code === 'ECONNREFUSED') {
                        console.log(`🔌 Connection refused: User ${userId}`);
                    } else if (error.code === 'TIMEOUT') {
                        console.log(`⏱️ Timeout: User ${userId}`);
                    } else if (error.response?.status >= 500) {
                        console.log(`🔥 Server error: User ${userId}, Status ${error.response.status}`);
                    }
                }
                
                // Wait before next request
                await new Promise(resolve => setTimeout(resolve, this.requestInterval));
                
                // Periodic user status update (every 10 minutes)
                if (userRequests % Math.ceil(600000 / this.requestInterval) === 0) {
                    const runtime = this.formatDuration(Date.now() - userStartTime);
                    console.log(`👤 User ${userId}: ${userRequests} requests, ${userErrors} errors, runtime: ${runtime}`);
                }
            }
        } finally {
            this.activeUsers--;
            const userRuntime = Date.now() - userStartTime;
            console.log(`👤 User ${userId} completed: ${userRequests} requests, ${userErrors} errors, runtime: ${this.formatDuration(userRuntime)}`);
        }
    }

    startPeriodicSampling() {
        let sampleCount = 0;
        
        this.samplingTimer = setInterval(async () => {
            sampleCount++;
            const timestamp = Date.now();
            const runtime = timestamp - this.testStartTime;
            
            try {
                // Take a performance sample
                const sample = await this.takeSample(sampleCount, timestamp, runtime);
                this.results.samples.push(sample);
                
                // Check for performance degradation
                this.checkPerformanceDegradation(sample, sampleCount);
                
                // Check for memory leaks (simulated through response patterns)
                this.checkForAnomalies(sample, sampleCount);
                
                // Progress report
                const progress = ((runtime / (this.testDurationHours * 60 * 60 * 1000)) * 100).toFixed(1);
                console.log(`📊 Sample ${sampleCount}: ${progress}% complete, ` +
                          `${this.activeUsers} users, ${this.totalRequests} requests, ` +
                          `${this.totalErrors} errors (${((this.totalErrors/this.totalRequests)*100).toFixed(2)}%)`);
                
            } catch (error) {
                console.error(`Error taking sample ${sampleCount}:`, error.message);
            }
        }, this.samplingInterval);
    }

    stopPeriodicSampling() {
        if (this.samplingTimer) {
            clearInterval(this.samplingTimer);
            this.samplingTimer = null;
        }
    }

    async takeSample(sampleNumber, timestamp, runtime) {
        // Test a single request to measure current performance
        const sampleStart = Date.now();
        let sampleResponseTime = null;
        let sampleSuccess = false;
        let sampleError = null;
        
        try {
            const response = await axios.get(this.testUrl, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'SoakTester-Sampler',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Cache-Control': 'no-cache'
                }
            });
            
            sampleResponseTime = Date.now() - sampleStart;
            sampleSuccess = true;
            
        } catch (error) {
            sampleResponseTime = Date.now() - sampleStart;
            sampleSuccess = false;
            sampleError = error.message;
        }

        // Get current system metrics
        const processMetrics = process.memoryUsage();
        
        return {
            sampleNumber,
            timestamp: new Date(timestamp).toISOString(),
            runtime: Math.round(runtime / 1000), // seconds
            activeUsers: this.activeUsers,
            totalRequests: this.totalRequests,
            totalErrors: this.totalErrors,
            currentErrorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) * 100 : 0,
            requestsPerSecond: this.calculateCurrentRPS(),
            sampleResponseTime,
            sampleSuccess,
            sampleError,
            processMemory: {
                rss: Math.round(processMetrics.rss / 1024 / 1024), // MB
                heapUsed: Math.round(processMetrics.heapUsed / 1024 / 1024), // MB
                heapTotal: Math.round(processMetrics.heapTotal / 1024 / 1024), // MB
                external: Math.round(processMetrics.external / 1024 / 1024) // MB
            }
        };
    }

    calculateCurrentRPS() {
        if (this.results.samples.length < 2) return 0;
        
        const currentSample = this.results.samples[this.results.samples.length - 1];
        const previousSample = this.results.samples[this.results.samples.length - 2];
        
        const timeDiff = (new Date(currentSample.timestamp) - new Date(previousSample.timestamp)) / 1000;
        const requestDiff = currentSample.totalRequests - previousSample.totalRequests;
        
        return requestDiff / timeDiff;
    }

    checkPerformanceDegradation(sample, sampleNumber) {
        if (sampleNumber < 5) return; // Need baseline
        
        // Compare with early samples (first 25% of test)
        const baselineSamples = this.results.samples.slice(0, Math.ceil(this.results.samples.length * 0.25));
        const baselineAvgResponseTime = baselineSamples.reduce((sum, s) => sum + (s.sampleResponseTime || 0), 0) / baselineSamples.length;
        const baselineAvgErrorRate = baselineSamples.reduce((sum, s) => sum + s.currentErrorRate, 0) / baselineSamples.length;
        
        // Current performance (last 5 samples)
        const recentSamples = this.results.samples.slice(-5);
        const recentAvgResponseTime = recentSamples.reduce((sum, s) => sum + (s.sampleResponseTime || 0), 0) / recentSamples.length;
        const recentAvgErrorRate = recentSamples.reduce((sum, s) => sum + s.currentErrorRate, 0) / recentSamples.length;
        
        // Detect degradation
        const responseTimeDegradation = (recentAvgResponseTime / baselineAvgResponseTime) - 1;
        const errorRateIncrease = recentAvgErrorRate - baselineAvgErrorRate;
        
        if (responseTimeDegradation > 0.5 || errorRateIncrease > 5) {
            this.results.performanceDegradation.push({
                detectedAt: sample.timestamp,
                sampleNumber,
                runtime: sample.runtime,
                responseTimeDegradation: (responseTimeDegradation * 100).toFixed(2) + '%',
                errorRateIncrease: errorRateIncrease.toFixed(2) + '%',
                baselineResponseTime: Math.round(baselineAvgResponseTime),
                currentResponseTime: Math.round(recentAvgResponseTime),
                baselineErrorRate: baselineAvgErrorRate.toFixed(2) + '%',
                currentErrorRate: recentAvgErrorRate.toFixed(2) + '%'
            });
            
            console.log(`📉 Performance degradation detected at sample ${sampleNumber}`);
        }
    }

    checkForAnomalies(sample, sampleNumber) {
        if (sampleNumber < 10) return; // Need more data
        
        // Check for memory growth patterns
        const recentMemory = this.results.samples.slice(-10).map(s => s.processMemory.heapUsed);
        const memoryTrend = this.calculateTrend(recentMemory);
        
        if (memoryTrend > 5) { // Growing more than 5MB per sample over 10 samples
            this.results.memoryLeaks.push({
                detectedAt: sample.timestamp,
                sampleNumber,
                runtime: sample.runtime,
                memoryTrend: `+${memoryTrend.toFixed(2)}MB per sample`,
                currentMemory: `${sample.processMemory.heapUsed}MB`,
                severity: memoryTrend > 10 ? 'HIGH' : 'MEDIUM'
            });
            
            console.log(`🧠 Memory growth pattern detected: +${memoryTrend.toFixed(2)}MB per sample`);
        }
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + (x * y), 0);
        const sumXX = values.reduce((sum, _, x) => sum + (x * x), 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    analyzeResults() {
        if (this.results.samples.length === 0) {
            return {
                status: 'FAILED',
                error: 'No samples collected during test',
                summary: null
            };
        }

        const actualDuration = (Date.now() - this.testStartTime) / 1000 / 3600; // hours
        const samples = this.results.samples;
        
        // Calculate various metrics
        const responseTimes = samples.map(s => s.sampleResponseTime).filter(t => t !== null);
        const errorRates = samples.map(s => s.currentErrorRate);
        const requestsPerSecond = samples.map(s => s.requestsPerSecond).filter(rps => rps > 0);
        
        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            testConfiguration: {
                targetUrl: this.testUrl,
                concurrentUsers: this.concurrentUsers,
                plannedDurationHours: this.testDurationHours,
                actualDurationHours: actualDuration.toFixed(2),
                requestInterval: this.requestInterval,
                samplingInterval: this.samplingInterval
            },
            enduranceMetrics: {
                totalSamples: samples.length,
                totalRequests: this.totalRequests,
                totalErrors: this.totalErrors,
                overallErrorRate: ((this.totalErrors / this.totalRequests) * 100).toFixed(2) + '%',
                averageResponseTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : 0,
                responseTimeStability: this.calculateStability(responseTimes),
                averageRPS: requestsPerSecond.length > 0 ? (requestsPerSecond.reduce((a, b) => a + b) / requestsPerSecond.length).toFixed(2) : 0,
                throughputStability: this.calculateStability(requestsPerSecond)
            },
            stabilityAnalysis: {
                performanceDegradations: this.results.performanceDegradation.length,
                memoryAnomalies: this.results.memoryLeaks.length,
                systemStability: this.assessSystemStability(),
                uptimePercentage: this.calculateUptime()
            },
            resourceUtilization: this.analyzeResourceUsage(),
            recommendations: [],
            overallScore: 0,
            timelineData: samples
        };

        analysis.recommendations = this.generateSoakRecommendations(analysis);
        analysis.overallScore = this.calculateSoakTestScore(analysis);

        return analysis;
    }

    calculateStability(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;
        
        // Convert to stability score (lower variation = higher stability)
        return Math.max(0, 100 - (coefficientOfVariation * 100));
    }

    assessSystemStability() {
        const degradationCount = this.results.performanceDegradation.length;
        const memoryIssueCount = this.results.memoryLeaks.length;
        const sampleCount = this.results.samples.length;
        
        if (degradationCount === 0 && memoryIssueCount === 0) {
            return 'EXCELLENT';
        } else if (degradationCount / sampleCount < 0.05 && memoryIssueCount < 3) {
            return 'GOOD';
        } else if (degradationCount / sampleCount < 0.1 && memoryIssueCount < 5) {
            return 'FAIR';
        } else {
            return 'POOR';
        }
    }

    calculateUptime() {
        const samples = this.results.samples;
        const successfulSamples = samples.filter(s => s.sampleSuccess).length;
        return ((successfulSamples / samples.length) * 100).toFixed(2);
    }

    analyzeResourceUsage() {
        const samples = this.results.samples;
        if (samples.length === 0) return {};
        
        const memoryUsage = samples.map(s => s.processMemory.heapUsed);
        const initialMemory = memoryUsage[0];
        const finalMemory = memoryUsage[memoryUsage.length - 1];
        const peakMemory = Math.max(...memoryUsage);
        
        return {
            memoryGrowth: `${((finalMemory - initialMemory) / initialMemory * 100).toFixed(2)}%`,
            peakMemoryUsage: `${peakMemory}MB`,
            averageMemoryUsage: `${Math.round(memoryUsage.reduce((a, b) => a + b) / memoryUsage.length)}MB`,
            memoryEfficiency: finalMemory <= initialMemory * 1.5 ? 'GOOD' : 'CONCERNING'
        };
    }

    generateSoakRecommendations(analysis) {
        const recommendations = [];
        const degradations = analysis.stabilityAnalysis.performanceDegradations;
        const memoryIssues = analysis.stabilityAnalysis.memoryAnomalies;
        const errorRate = parseFloat(analysis.enduranceMetrics.overallErrorRate);
        const stability = analysis.stabilityAnalysis.systemStability;

        if (stability === 'POOR') {
            recommendations.push({
                category: 'System Stability',
                priority: 'CRITICAL',
                issue: `Poor system stability with ${degradations} performance degradations and ${memoryIssues} memory anomalies`,
                impact: 'System unreliable for sustained production load',
                solutions: [
                    'Investigate and fix memory leaks in application code',
                    'Implement proper connection pooling and resource cleanup',
                    'Review garbage collection settings and memory management',
                    'Add comprehensive monitoring and alerting',
                    'Implement circuit breakers for external dependencies'
                ]
            });
        }

        if (errorRate > 2) {
            recommendations.push({
                category: 'Error Rate',
                priority: 'HIGH',
                issue: `Sustained error rate of ${analysis.enduranceMetrics.overallErrorRate} over ${analysis.testConfiguration.actualDurationHours} hours`,
                impact: 'Reduced reliability and poor user experience during extended usage',
                solutions: [
                    'Investigate root causes of recurring errors',
                    'Implement retry mechanisms with exponential backoff',
                    'Review timeout configurations and connection handling',
                    'Add proper error logging and monitoring',
                    'Consider implementing health checks and auto-recovery'
                ]
            });
        }

        if (analysis.enduranceMetrics.responseTimeStability < 70) {
            recommendations.push({
                category: 'Performance Consistency',
                priority: 'MEDIUM',
                issue: `Low response time stability score: ${analysis.enduranceMetrics.responseTimeStability.toFixed(2)}%`,
                impact: 'Inconsistent user experience over time',
                solutions: [
                    'Identify and eliminate performance bottlenecks',
                    'Implement caching strategies to reduce load variations',
                    'Optimize database queries and connection management',
                    'Consider implementing load balancing',
                    'Review resource allocation and scaling policies'
                ]
            });
        }

        if (analysis.resourceUtilization.memoryEfficiency === 'CONCERNING') {
            recommendations.push({
                category: 'Memory Management',
                priority: 'HIGH',
                issue: `Concerning memory growth: ${analysis.resourceUtilization.memoryGrowth}`,
                impact: 'Potential memory leaks leading to system crashes over time',
                solutions: [
                    'Profile application for memory leaks',
                    'Review object lifecycle and garbage collection',
                    'Implement proper resource cleanup in finally blocks',
                    'Consider using memory profiling tools',
                    'Add memory usage monitoring and alerting'
                ]
            });
        }

        if (parseFloat(analysis.stabilityAnalysis.uptimePercentage) < 95) {
            recommendations.push({
                category: 'Reliability',
                priority: 'HIGH',
                issue: `Low uptime percentage: ${analysis.stabilityAnalysis.uptimePercentage}%`,
                impact: 'Service availability concerns for extended operations',
                solutions: [
                    'Implement health check endpoints',
                    'Add redundancy and failover mechanisms',
                    'Review infrastructure reliability and monitoring',
                    'Implement graceful degradation strategies',
                    'Consider distributed architecture for better resilience'
                ]
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                category: 'Optimization',
                priority: 'LOW',
                issue: 'System performed well during endurance test',
                impact: 'Good foundation for sustained production load',
                solutions: [
                    'Continue regular soak testing as part of CI/CD pipeline',
                    'Monitor production metrics to validate test results',
                    'Document current performance benchmarks',
                    'Plan for growth and increased load scenarios',
                    'Consider testing with longer durations or higher loads'
                ]
            });
        }

        return recommendations;
    }

    calculateSoakTestScore(analysis) {
        let score = 100;
        
        // Penalize for poor stability
        const stability = analysis.stabilityAnalysis.systemStability;
        if (stability === 'POOR') score -= 40;
        else if (stability === 'FAIR') score -= 25;
        else if (stability === 'GOOD') score -= 10;
        
        // Penalize for high error rates
        const errorRate = parseFloat(analysis.enduranceMetrics.overallErrorRate);
        if (errorRate > 5) score -= 30;
        else if (errorRate > 2) score -= 20;
        else if (errorRate > 1) score -= 10;
        
        // Penalize for performance degradations
        const degradations = analysis.stabilityAnalysis.performanceDegradations;
        if (degradations > 5) score -= 20;
        else if (degradations > 2) score -= 10;
        else if (degradations > 0) score -= 5;
        
        // Penalize for memory issues
        const memoryIssues = analysis.stabilityAnalysis.memoryAnomalies;
        if (memoryIssues > 3) score -= 15;
        else if (memoryIssues > 1) score -= 10;
        else if (memoryIssues > 0) score -= 5;
        
        // Penalize for low uptime
        const uptime = parseFloat(analysis.stabilityAnalysis.uptimePercentage);
        if (uptime < 90) score -= 25;
        else if (uptime < 95) score -= 15;
        else if (uptime < 99) score -= 5;
        
        return Math.max(0, Math.round(score));
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    async generateReport(analysis) {
        const report = {
            testSuite: 'Soak Testing',
            version: '1.0.0',
            ...analysis
        };

        fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
        return report;
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--url':
                if (args[i + 1]) options.url = args[++i];
                break;
            case '--users':
                if (args[i + 1]) options.concurrentUsers = parseInt(args[++i]);
                break;
            case '--duration':
                if (args[i + 1]) options.testDurationHours = parseFloat(args[++i]);
                break;
            case '--interval':
                if (args[i + 1]) options.requestInterval = parseInt(args[++i]);
                break;
            case '--sampling':
                if (args[i + 1]) options.samplingInterval = parseInt(args[++i]);
                break;
            case '--output':
                if (args[i + 1]) options.reportPath = args[++i];
                break;
        }
    }

    const soakTester = new SoakTester(options);
    soakTester.runSoakTest().catch(console.error);
}

module.exports = SoakTester;