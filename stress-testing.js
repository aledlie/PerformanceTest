#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class StressTester {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.reportPath = options.reportPath || './stress-test-report.json';
        this.initialUsers = options.initialUsers || 10;
        this.maxUsers = options.maxUsers || 200;
        this.stepSize = options.stepSize || 10;
        this.stepDuration = options.stepDuration || 60; // seconds per step
        this.requestInterval = options.requestInterval || 500; // ms between requests
        
        this.results = {
            steps: [],
            breakingPoint: null,
            summary: null
        };
        
        this.currentStep = 0;
        this.activeUsers = 0;
        this.testRunning = false;
        this.breakingPointFound = false;
    }

    async runStressTest() {
        console.log('⚡ Starting Stress Testing');
        console.log(`Target URL: ${this.testUrl}`);
        console.log(`User progression: ${this.initialUsers} → ${this.maxUsers} (steps of ${this.stepSize})`);
        console.log(`Step duration: ${this.stepDuration}s`);
        
        this.testRunning = true;
        let currentUsers = this.initialUsers;
        
        try {
            while (currentUsers <= this.maxUsers && this.testRunning && !this.breakingPointFound) {
                this.currentStep++;
                console.log(`\n🔸 Step ${this.currentStep}: Testing with ${currentUsers} concurrent users`);
                
                const stepResult = await this.executeStressStep(currentUsers);
                this.results.steps.push(stepResult);
                
                // Check if we've found the breaking point
                if (this.isBreakingPoint(stepResult)) {
                    console.log(`💥 Breaking point detected at ${currentUsers} users!`);
                    this.results.breakingPoint = {
                        users: currentUsers,
                        step: this.currentStep,
                        reason: this.getBreakingPointReason(stepResult)
                    };
                    this.breakingPointFound = true;
                    break;
                }
                
                currentUsers += this.stepSize;
                
                // Brief cooldown between steps
                console.log('⏳ Cooling down before next step...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            const analysis = this.analyzeResults();
            await this.generateReport(analysis);
            
            console.log('\n✅ Stress testing completed');
            console.log(`📄 Report saved to: ${this.reportPath}`);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Stress testing failed:', error.message);
            throw error;
        } finally {
            this.testRunning = false;
        }
    }

    async executeStressStep(userCount) {
        const stepStartTime = Date.now();
        const stepEndTime = stepStartTime + (this.stepDuration * 1000);
        const userPromises = [];
        const stepResults = {
            step: this.currentStep,
            users: userCount,
            duration: this.stepDuration,
            startTime: new Date(stepStartTime).toISOString(),
            requests: [],
            metrics: null
        };

        // Spawn all users for this step
        for (let i = 0; i < userCount; i++) {
            const userPromise = this.simulateStressUser(i + 1, stepEndTime, stepResults);
            userPromises.push(userPromise);
        }

        // Wait for step to complete
        await Promise.all(userPromises.map(p => p.catch(error => ({ error: error.message }))));
        
        // Calculate step metrics
        stepResults.endTime = new Date().toISOString();
        stepResults.metrics = this.calculateStepMetrics(stepResults.requests);
        
        console.log(`   📊 Step ${this.currentStep} results: ${stepResults.requests.length} requests, ` +
                   `${stepResults.metrics.errorRate.toFixed(2)}% error rate, ` +
                   `${stepResults.metrics.avgResponseTime}ms avg response time`);
        
        return stepResults;
    }

    async simulateStressUser(userId, endTime, stepResults) {
        while (Date.now() < endTime && this.testRunning) {
            const requestStart = Date.now();
            
            try {
                const response = await axios.get(this.testUrl, {
                    timeout: 20000,
                    headers: {
                        'User-Agent': `StressTester-Step${this.currentStep}-User${userId}`,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'no-cache'
                    }
                });
                
                const requestEnd = Date.now();
                const responseTime = requestEnd - requestStart;
                
                stepResults.requests.push({
                    userId,
                    timestamp: requestStart,
                    responseTime,
                    statusCode: response.status,
                    success: true,
                    error: null,
                    contentLength: response.data?.length || 0
                });
                
            } catch (error) {
                const requestEnd = Date.now();
                const responseTime = requestEnd - requestStart;
                
                stepResults.requests.push({
                    userId,
                    timestamp: requestStart,
                    responseTime,
                    statusCode: error.response?.status || 0,
                    success: false,
                    error: error.code || error.message,
                    contentLength: 0
                });
            }
            
            // Wait before next request (if time allows)
            if (Date.now() + this.requestInterval < endTime) {
                await new Promise(resolve => setTimeout(resolve, this.requestInterval));
            }
        }
    }

    calculateStepMetrics(requests) {
        if (requests.length === 0) {
            return {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                successRate: 0,
                errorRate: 100,
                avgResponseTime: 0,
                medianResponseTime: 0,
                p95ResponseTime: 0,
                p99ResponseTime: 0,
                minResponseTime: 0,
                maxResponseTime: 0,
                requestsPerSecond: 0,
                throughput: 0
            };
        }

        const successful = requests.filter(r => r.success);
        const failed = requests.filter(r => !r.success);
        const responseTimes = successful.map(r => r.responseTime).sort((a, b) => a - b);
        
        const totalBytes = successful.reduce((sum, r) => sum + (r.contentLength || 0), 0);
        const duration = this.stepDuration;
        
        return {
            totalRequests: requests.length,
            successfulRequests: successful.length,
            failedRequests: failed.length,
            successRate: (successful.length / requests.length) * 100,
            errorRate: (failed.length / requests.length) * 100,
            avgResponseTime: responseTimes.length > 0 ? 
                Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : 0,
            medianResponseTime: responseTimes.length > 0 ? 
                responseTimes[Math.floor(responseTimes.length / 2)] : 0,
            p95ResponseTime: responseTimes.length > 0 ? 
                responseTimes[Math.floor(responseTimes.length * 0.95)] : 0,
            p99ResponseTime: responseTimes.length > 0 ? 
                responseTimes[Math.floor(responseTimes.length * 0.99)] : 0,
            minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
            maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
            requestsPerSecond: requests.length / duration,
            throughput: totalBytes / duration, // bytes per second
            errorsByType: this.categorizeErrors(failed)
        };
    }

    categorizeErrors(failedRequests) {
        const errorTypes = {};
        
        failedRequests.forEach(request => {
            let category = 'Unknown';
            
            if (request.error) {
                if (request.error.includes('timeout') || request.error.includes('TIMEOUT')) {
                    category = 'Timeout';
                } else if (request.error.includes('ECONNREFUSED')) {
                    category = 'Connection Refused';
                } else if (request.error.includes('ENOTFOUND')) {
                    category = 'DNS Resolution';
                } else if (request.error.includes('ECONNRESET')) {
                    category = 'Connection Reset';
                } else if (request.statusCode >= 500) {
                    category = 'Server Error';
                } else if (request.statusCode >= 400) {
                    category = 'Client Error';
                }
            }
            
            errorTypes[category] = (errorTypes[category] || 0) + 1;
        });
        
        return errorTypes;
    }

    isBreakingPoint(stepResult) {
        const metrics = stepResult.metrics;
        
        // Multiple criteria for breaking point detection
        return (
            metrics.errorRate > 50 ||                    // More than 50% error rate
            metrics.p95ResponseTime > 30000 ||           // 95th percentile > 30 seconds
            metrics.avgResponseTime > 15000 ||           // Average > 15 seconds
            metrics.requestsPerSecond < 1 ||             // Very low throughput
            (metrics.errorsByType['Connection Refused'] || 0) > metrics.totalRequests * 0.3 ||
            (metrics.errorsByType['Timeout'] || 0) > metrics.totalRequests * 0.4
        );
    }

    getBreakingPointReason(stepResult) {
        const metrics = stepResult.metrics;
        const reasons = [];
        
        if (metrics.errorRate > 50) {
            reasons.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
        }
        if (metrics.p95ResponseTime > 30000) {
            reasons.push(`Extremely slow response times: ${metrics.p95ResponseTime}ms P95`);
        }
        if (metrics.avgResponseTime > 15000) {
            reasons.push(`High average response time: ${metrics.avgResponseTime}ms`);
        }
        if (metrics.requestsPerSecond < 1) {
            reasons.push(`Very low throughput: ${metrics.requestsPerSecond.toFixed(2)} RPS`);
        }
        
        const connectionRefused = metrics.errorsByType['Connection Refused'] || 0;
        if (connectionRefused > metrics.totalRequests * 0.3) {
            reasons.push(`High connection refusal rate: ${connectionRefused} requests`);
        }
        
        const timeouts = metrics.errorsByType['Timeout'] || 0;
        if (timeouts > metrics.totalRequests * 0.4) {
            reasons.push(`High timeout rate: ${timeouts} requests`);
        }
        
        return reasons.join('; ');
    }

    analyzeResults() {
        if (this.results.steps.length === 0) {
            return {
                status: 'FAILED',
                error: 'No test steps completed',
                summary: null
            };
        }

        const lastSuccessfulStep = this.findLastSuccessfulStep();
        const performanceTrend = this.analyzePerformanceTrend();
        
        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            testConfiguration: {
                targetUrl: this.testUrl,
                initialUsers: this.initialUsers,
                maxUsers: this.maxUsers,
                stepSize: this.stepSize,
                stepDuration: this.stepDuration,
                totalSteps: this.results.steps.length
            },
            breakingPoint: this.results.breakingPoint,
            lastSuccessfulLoad: lastSuccessfulStep,
            performanceProgression: performanceTrend,
            systemLimits: this.determineSystemLimits(),
            recommendations: [],
            overallScore: 0,
            stepDetails: this.results.steps
        };

        analysis.recommendations = this.generateStressRecommendations(analysis);
        analysis.overallScore = this.calculateStressTestScore(analysis);

        return analysis;
    }

    findLastSuccessfulStep() {
        // Find the last step with acceptable performance
        for (let i = this.results.steps.length - 1; i >= 0; i--) {
            const step = this.results.steps[i];
            if (step.metrics.errorRate < 5 && step.metrics.avgResponseTime < 3000) {
                return {
                    step: step.step,
                    users: step.users,
                    errorRate: step.metrics.errorRate,
                    avgResponseTime: step.metrics.avgResponseTime,
                    requestsPerSecond: step.metrics.requestsPerSecond
                };
            }
        }
        
        return this.results.steps.length > 0 ? {
            step: 1,
            users: this.results.steps[0].users,
            errorRate: this.results.steps[0].metrics.errorRate,
            avgResponseTime: this.results.steps[0].metrics.avgResponseTime,
            requestsPerSecond: this.results.steps[0].metrics.requestsPerSecond
        } : null;
    }

    analyzePerformanceTrend() {
        const trends = {
            errorRateTrend: [],
            responseTimeTrend: [],
            throughputTrend: []
        };

        this.results.steps.forEach(step => {
            trends.errorRateTrend.push({
                users: step.users,
                value: step.metrics.errorRate
            });
            trends.responseTimeTrend.push({
                users: step.users,
                value: step.metrics.avgResponseTime
            });
            trends.throughputTrend.push({
                users: step.users,
                value: step.metrics.requestsPerSecond
            });
        });

        return trends;
    }

    determineSystemLimits() {
        const maxThroughput = Math.max(...this.results.steps.map(s => s.metrics.requestsPerSecond));
        const maxSuccessfulUsers = this.results.breakingPoint ? 
            this.results.breakingPoint.users - this.stepSize : this.maxUsers;
        
        return {
            maxThroughput: maxThroughput,
            maxConcurrentUsers: maxSuccessfulUsers,
            recommendedCapacity: Math.floor(maxSuccessfulUsers * 0.7), // 70% of max for safety
            scalingFactor: maxThroughput / this.initialUsers
        };
    }

    generateStressRecommendations(analysis) {
        const recommendations = [];
        const breakingPoint = analysis.breakingPoint;
        const systemLimits = analysis.systemLimits;

        if (breakingPoint) {
            if (breakingPoint.users < 50) {
                recommendations.push({
                    category: 'Critical Scalability Issue',
                    priority: 'CRITICAL',
                    issue: `System breaks under very low load (${breakingPoint.users} users)`,
                    impact: 'System cannot handle basic production traffic',
                    solutions: [
                        'Immediate infrastructure scaling required',
                        'Review application architecture for bottlenecks',
                        'Optimize database performance and connection pooling',
                        'Implement caching at multiple levels',
                        'Consider load balancer configuration'
                    ]
                });
            } else if (breakingPoint.users < 100) {
                recommendations.push({
                    category: 'Scalability Concern',
                    priority: 'HIGH',
                    issue: `System breaks under moderate load (${breakingPoint.users} users)`,
                    impact: 'Limited capacity for growth and traffic spikes',
                    solutions: [
                        'Scale application infrastructure horizontally',
                        'Implement auto-scaling policies',
                        'Optimize resource usage and memory management',
                        'Review and optimize database queries',
                        'Consider implementing rate limiting'
                    ]
                });
            } else {
                recommendations.push({
                    category: 'Capacity Planning',
                    priority: 'MEDIUM',
                    issue: `Breaking point identified at ${breakingPoint.users} users`,
                    impact: 'Good baseline capacity with room for optimization',
                    solutions: [
                        'Plan for auto-scaling before reaching 70% of capacity',
                        'Monitor system metrics in production',
                        'Implement gradual degradation strategies',
                        'Consider caching and CDN optimization',
                        'Regular stress testing as part of CI/CD'
                    ]
                });
            }
        }

        if (systemLimits.maxThroughput < 10) {
            recommendations.push({
                category: 'Performance Optimization',
                priority: 'HIGH',
                issue: `Low maximum throughput: ${systemLimits.maxThroughput.toFixed(2)} RPS`,
                impact: 'System cannot serve adequate number of requests',
                solutions: [
                    'Profile application for performance bottlenecks',
                    'Implement efficient caching strategies',
                    'Optimize database indexes and queries',
                    'Consider asynchronous processing for heavy operations',
                    'Review and optimize critical code paths'
                ]
            });
        }

        // Analyze performance degradation pattern
        const firstStep = analysis.stepDetails[0];
        const lastStep = analysis.stepDetails[analysis.stepDetails.length - 1];
        
        if (firstStep && lastStep) {
            const responseTimeIncrease = (lastStep.metrics.avgResponseTime / firstStep.metrics.avgResponseTime);
            
            if (responseTimeIncrease > 5) {
                recommendations.push({
                    category: 'Performance Degradation',
                    priority: 'HIGH',
                    issue: `Response time increases dramatically under load (${responseTimeIncrease.toFixed(1)}x)`,
                    impact: 'Poor user experience as load increases',
                    solutions: [
                        'Implement connection pooling and resource management',
                        'Optimize application for concurrent access',
                        'Review locking mechanisms and concurrent processing',
                        'Consider implementing queuing systems',
                        'Optimize garbage collection and memory management'
                    ]
                });
            }
        }

        return recommendations;
    }

    calculateStressTestScore(analysis) {
        let score = 0;
        
        // Base score based on breaking point
        if (analysis.breakingPoint) {
            const breakingUsers = analysis.breakingPoint.users;
            if (breakingUsers >= 200) score += 40;
            else if (breakingUsers >= 100) score += 30;
            else if (breakingUsers >= 50) score += 20;
            else score += 10;
        } else {
            score += 45; // No breaking point found within test range
        }
        
        // Score based on maximum throughput
        const maxThroughput = analysis.systemLimits.maxThroughput;
        if (maxThroughput >= 50) score += 25;
        else if (maxThroughput >= 20) score += 20;
        else if (maxThroughput >= 10) score += 15;
        else if (maxThroughput >= 5) score += 10;
        else score += 5;
        
        // Score based on performance consistency
        if (analysis.lastSuccessfulLoad) {
            const errorRate = analysis.lastSuccessfulLoad.errorRate;
            const responseTime = analysis.lastSuccessfulLoad.avgResponseTime;
            
            if (errorRate < 1 && responseTime < 1000) score += 20;
            else if (errorRate < 2 && responseTime < 2000) score += 15;
            else if (errorRate < 5 && responseTime < 3000) score += 10;
            else score += 5;
        }
        
        // Bonus for graceful degradation
        const hasGracefulDegradation = this.checkGracefulDegradation(analysis.stepDetails);
        if (hasGracefulDegradation) score += 10;
        
        return Math.min(100, Math.round(score));
    }

    checkGracefulDegradation(steps) {
        if (steps.length < 3) return false;
        
        // Check if error rate increases gradually rather than suddenly
        for (let i = 1; i < steps.length - 1; i++) {
            const current = steps[i].metrics.errorRate;
            const next = steps[i + 1].metrics.errorRate;
            
            if (next - current > 30) { // Sudden jump in error rate
                return false;
            }
        }
        
        return true;
    }

    async generateReport(analysis) {
        const report = {
            testSuite: 'Stress Testing',
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
            case '--initial-users':
                if (args[i + 1]) options.initialUsers = parseInt(args[++i]);
                break;
            case '--max-users':
                if (args[i + 1]) options.maxUsers = parseInt(args[++i]);
                break;
            case '--step-size':
                if (args[i + 1]) options.stepSize = parseInt(args[++i]);
                break;
            case '--step-duration':
                if (args[i + 1]) options.stepDuration = parseInt(args[++i]);
                break;
            case '--interval':
                if (args[i + 1]) options.requestInterval = parseInt(args[++i]);
                break;
            case '--output':
                if (args[i + 1]) options.reportPath = args[++i];
                break;
        }
    }

    const stressTester = new StressTester(options);
    stressTester.runStressTest().catch(console.error);
}

module.exports = StressTester;