#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class LoadTester {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.reportPath = options.reportPath || './load-test-report.json';
        this.maxConcurrentUsers = options.maxUsers || 50;
        this.rampUpDuration = options.rampUpTime || 60; // seconds
        this.testDuration = options.testDuration || 300; // seconds
        this.requestDelay = options.requestDelay || 1000; // ms between requests per user
        
        this.results = {
            requests: [],
            summary: null,
            timeline: []
        };
        
        this.activeUsers = 0;
        this.totalRequests = 0;
        this.totalErrors = 0;
        this.startTime = null;
        this.endTime = null;
    }

    async runLoadTest() {
        console.log('🚀 Starting Load Testing');
        console.log(`Target URL: ${this.testUrl}`);
        console.log(`Max Concurrent Users: ${this.maxConcurrentUsers}`);
        console.log(`Ramp-up Duration: ${this.rampUpDuration}s`);
        console.log(`Test Duration: ${this.testDuration}s`);
        
        this.startTime = Date.now();
        
        try {
            // Start load test with ramping pattern
            await this.executeLoadTest();
            
            this.endTime = Date.now();
            const analysis = this.analyzeResults();
            await this.generateReport(analysis);
            
            console.log('\n✅ Load testing completed');
            console.log(`📄 Report saved to: ${this.reportPath}`);
            
            return analysis;
        } catch (error) {
            console.error('❌ Load testing failed:', error.message);
            throw error;
        }
    }

    async executeLoadTest() {
        const userSpawnInterval = (this.rampUpDuration * 1000) / this.maxConcurrentUsers;
        const testEndTime = Date.now() + (this.testDuration * 1000);
        const userPromises = [];
        
        // Timeline tracking
        const timelineInterval = setInterval(() => {
            this.results.timeline.push({
                timestamp: Date.now(),
                activeUsers: this.activeUsers,
                totalRequests: this.totalRequests,
                totalErrors: this.totalErrors,
                requestsPerSecond: this.calculateCurrentRPS()
            });
        }, 5000);

        // Spawn users gradually (ramp-up)
        for (let i = 0; i < this.maxConcurrentUsers; i++) {
            await new Promise(resolve => setTimeout(resolve, userSpawnInterval));
            
            if (Date.now() >= testEndTime) break;
            
            const userPromise = this.simulateUser(i + 1, testEndTime);
            userPromises.push(userPromise);
            this.activeUsers++;
            
            console.log(`👤 Spawned user ${i + 1}/${this.maxConcurrentUsers} (Active: ${this.activeUsers})`);
        }

        // Wait for all users to complete or timeout
        await Promise.allSettled(userPromises);
        clearInterval(timelineInterval);
        
        console.log(`\n📊 Test completed - Total requests: ${this.totalRequests}, Errors: ${this.totalErrors}`);
    }

    async simulateUser(userId, testEndTime) {
        try {
            while (Date.now() < testEndTime) {
                const requestStart = Date.now();
                
                try {
                    const response = await axios.get(this.testUrl, {
                        timeout: 30000,
                        headers: {
                            'User-Agent': `LoadTester-User-${userId}`,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1'
                        }
                    });
                    
                    const requestEnd = Date.now();
                    const responseTime = requestEnd - requestStart;
                    
                    this.results.requests.push({
                        userId,
                        timestamp: requestStart,
                        responseTime,
                        statusCode: response.status,
                        success: true,
                        error: null,
                        contentLength: response.headers['content-length'] || 0
                    });
                    
                    this.totalRequests++;
                    
                } catch (error) {
                    const requestEnd = Date.now();
                    const responseTime = requestEnd - requestStart;
                    
                    this.results.requests.push({
                        userId,
                        timestamp: requestStart,
                        responseTime,
                        statusCode: error.response?.status || 0,
                        success: false,
                        error: error.message,
                        contentLength: 0
                    });
                    
                    this.totalRequests++;
                    this.totalErrors++;
                }
                
                // Wait before next request
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }
        } finally {
            this.activeUsers--;
        }
    }

    calculateCurrentRPS() {
        const now = Date.now();
        const recentRequests = this.results.requests.filter(
            r => now - r.timestamp <= 1000
        );
        return recentRequests.length;
    }

    analyzeResults() {
        const successfulRequests = this.results.requests.filter(r => r.success);
        const failedRequests = this.results.requests.filter(r => !r.success);
        
        if (this.results.requests.length === 0) {
            return {
                status: 'FAILED',
                error: 'No requests completed',
                summary: null
            };
        }

        // Response time analysis
        const responseTimes = successfulRequests.map(r => r.responseTime);
        responseTimes.sort((a, b) => a - b);
        
        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            testConfiguration: {
                targetUrl: this.testUrl,
                maxConcurrentUsers: this.maxConcurrentUsers,
                rampUpDuration: this.rampUpDuration,
                testDuration: this.testDuration,
                actualDuration: Math.round((this.endTime - this.startTime) / 1000)
            },
            requestStatistics: {
                total: this.results.requests.length,
                successful: successfulRequests.length,
                failed: failedRequests.length,
                successRate: ((successfulRequests.length / this.results.requests.length) * 100).toFixed(2) + '%',
                errorRate: ((failedRequests.length / this.results.requests.length) * 100).toFixed(2) + '%'
            },
            performanceMetrics: {
                averageResponseTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : 0,
                medianResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length / 2)] : 0,
                p95ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
                p99ResponseTime: responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
                minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
                maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
                requestsPerSecond: this.results.requests.length / (this.testDuration),
                peakRPS: Math.max(...this.results.timeline.map(t => t.requestsPerSecond || 0))
            },
            errorAnalysis: this.analyzeErrors(failedRequests),
            loadPatterns: this.analyzeLoadPatterns(),
            recommendations: [],
            timeline: this.results.timeline
        };

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis);
        
        // Calculate overall score
        analysis.overallScore = this.calculateLoadTestScore(analysis);

        return analysis;
    }

    analyzeErrors(failedRequests) {
        const errorTypes = {};
        const statusCodes = {};
        
        failedRequests.forEach(request => {
            // Group by error message
            const errorType = request.error || 'Unknown Error';
            errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
            
            // Group by status code
            const statusCode = request.statusCode || 'No Response';
            statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;
        });

        return {
            totalErrors: failedRequests.length,
            errorsByType: errorTypes,
            errorsByStatusCode: statusCodes,
            mostCommonError: Object.keys(errorTypes).reduce((a, b) => 
                errorTypes[a] > errorTypes[b] ? a : b, 'None'),
            errorRate: failedRequests.length / this.results.requests.length
        };
    }

    analyzeLoadPatterns() {
        const timeSlices = [];
        const sliceSize = 30000; // 30 seconds
        
        if (this.results.requests.length === 0) return { timeSlices: [] };
        
        const firstRequest = Math.min(...this.results.requests.map(r => r.timestamp));
        const lastRequest = Math.max(...this.results.requests.map(r => r.timestamp));
        
        for (let time = firstRequest; time <= lastRequest; time += sliceSize) {
            const sliceRequests = this.results.requests.filter(
                r => r.timestamp >= time && r.timestamp < time + sliceSize
            );
            
            if (sliceRequests.length > 0) {
                const successfulInSlice = sliceRequests.filter(r => r.success);
                const avgResponseTime = successfulInSlice.length > 0 ? 
                    successfulInSlice.reduce((sum, r) => sum + r.responseTime, 0) / successfulInSlice.length : 0;
                
                timeSlices.push({
                    startTime: new Date(time).toISOString(),
                    duration: sliceSize / 1000,
                    requests: sliceRequests.length,
                    successfulRequests: successfulInSlice.length,
                    failedRequests: sliceRequests.length - successfulInSlice.length,
                    averageResponseTime: Math.round(avgResponseTime),
                    requestsPerSecond: sliceRequests.length / (sliceSize / 1000)
                });
            }
        }

        return {
            timeSlices,
            patterns: {
                peakLoad: Math.max(...timeSlices.map(s => s.requestsPerSecond)),
                averageLoad: timeSlices.reduce((sum, s) => sum + s.requestsPerSecond, 0) / timeSlices.length,
                loadVariation: this.calculateVariationCoefficient(timeSlices.map(s => s.requestsPerSecond))
            }
        };
    }

    calculateVariationCoefficient(values) {
        const mean = values.reduce((a, b) => a + b) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        return stdDev / mean;
    }

    calculateLoadTestScore(analysis) {
        let score = 100;
        
        // Penalize high error rates
        const errorRate = parseFloat(analysis.requestStatistics.errorRate);
        if (errorRate > 5) score -= 40;
        else if (errorRate > 1) score -= 20;
        else if (errorRate > 0.1) score -= 10;
        
        // Penalize slow response times
        const p95ResponseTime = analysis.performanceMetrics.p95ResponseTime;
        if (p95ResponseTime > 5000) score -= 30;
        else if (p95ResponseTime > 3000) score -= 20;
        else if (p95ResponseTime > 1000) score -= 10;
        
        // Penalize low throughput
        const rps = analysis.performanceMetrics.requestsPerSecond;
        if (rps < 1) score -= 20;
        else if (rps < 5) score -= 10;
        
        return Math.max(0, Math.round(score));
    }

    generateRecommendations(analysis) {
        const recommendations = [];
        const errorRate = parseFloat(analysis.requestStatistics.errorRate);
        const p95ResponseTime = analysis.performanceMetrics.p95ResponseTime;
        const avgResponseTime = analysis.performanceMetrics.averageResponseTime;

        if (errorRate > 5) {
            recommendations.push({
                category: 'Reliability',
                priority: 'CRITICAL',
                issue: `High error rate: ${analysis.requestStatistics.errorRate}`,
                impact: 'Service availability and user experience severely affected',
                solutions: [
                    'Investigate server capacity and resource constraints',
                    'Check for application errors and bottlenecks',
                    'Implement circuit breakers and graceful degradation',
                    'Scale infrastructure to handle concurrent load',
                    'Review database connection pooling and timeouts'
                ]
            });
        }

        if (p95ResponseTime > 3000) {
            recommendations.push({
                category: 'Performance',
                priority: errorRate > 1 ? 'HIGH' : 'CRITICAL',
                issue: `Slow 95th percentile response time: ${p95ResponseTime}ms`,
                impact: '95% of users experience slow page loads',
                solutions: [
                    'Implement caching strategies (CDN, application cache)',
                    'Optimize database queries and indexing',
                    'Consider horizontal scaling of application servers',
                    'Profile and optimize application code bottlenecks',
                    'Implement connection pooling and keep-alive connections'
                ]
            });
        }

        if (avgResponseTime > 1000) {
            recommendations.push({
                category: 'User Experience',
                priority: 'MEDIUM',
                issue: `Average response time: ${avgResponseTime}ms exceeds 1 second`,
                impact: 'User experience degraded, potential for increased bounce rate',
                solutions: [
                    'Optimize critical rendering path',
                    'Implement progressive loading and lazy loading',
                    'Compress and optimize assets (images, CSS, JS)',
                    'Use HTTP/2 and server push for improved loading',
                    'Consider implementing service workers for caching'
                ]
            });
        }

        if (analysis.performanceMetrics.requestsPerSecond < 5) {
            recommendations.push({
                category: 'Scalability',
                priority: 'HIGH',
                issue: `Low throughput: ${analysis.performanceMetrics.requestsPerSecond.toFixed(2)} RPS`,
                impact: 'System cannot handle expected traffic volume',
                solutions: [
                    'Scale application infrastructure (horizontal/vertical)',
                    'Implement load balancing across multiple servers',
                    'Optimize application for higher concurrency',
                    'Consider microservices architecture for better scalability',
                    'Implement async processing for heavy operations'
                ]
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                category: 'Optimization',
                priority: 'LOW',
                issue: 'System performing well under current load',
                impact: 'Opportunity for further optimization',
                solutions: [
                    'Consider stress testing with higher load levels',
                    'Implement monitoring and alerting for production',
                    'Document current performance benchmarks',
                    'Plan capacity for future growth',
                    'Consider implementing auto-scaling policies'
                ]
            });
        }

        return recommendations;
    }

    async generateReport(analysis) {
        const report = {
            testSuite: 'Load Testing',
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
            case '--max-users':
                if (args[i + 1]) options.maxUsers = parseInt(args[++i]);
                break;
            case '--ramp-up':
                if (args[i + 1]) options.rampUpTime = parseInt(args[++i]);
                break;
            case '--duration':
                if (args[i + 1]) options.testDuration = parseInt(args[++i]);
                break;
            case '--delay':
                if (args[i + 1]) options.requestDelay = parseInt(args[++i]);
                break;
            case '--output':
                if (args[i + 1]) options.reportPath = args[++i];
                break;
        }
    }

    const loadTester = new LoadTester(options);
    loadTester.runLoadTest().catch(console.error);
}

module.exports = LoadTester;