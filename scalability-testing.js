#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class ScalabilityTester {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.reportPath = options.reportPath || './scalability-test-report.json';
        
        // Multi-dimensional scaling tests
        this.userScenarios = options.userScenarios || [1, 5, 10, 25, 50, 100, 150, 200];
        this.dataScenarios = options.dataScenarios || ['light', 'medium', 'heavy'];
        this.networkScenarios = options.networkScenarios || ['fast', 'slow', 'mobile'];
        this.testDuration = options.testDuration || 120; // seconds per scenario
        
        this.results = {
            userScaling: [],
            dataScaling: [],
            networkScaling: [],
            crossScenarios: [],
            scalingLaws: null,
            summary: null
        };
    }

    async runScalabilityTest() {
        console.log('📈 Starting Comprehensive Scalability Testing');
        console.log(`Target URL: ${this.testUrl}`);
        console.log(`User Scenarios: ${this.userScenarios.join(', ')}`);
        console.log(`Data Scenarios: ${this.dataScenarios.join(', ')}`);
        console.log(`Network Scenarios: ${this.networkScenarios.join(', ')}`);
        
        try {
            // Phase 1: User Scalability
            console.log('\n🧑‍🤝‍🧑 Phase 1: User Scalability Testing');
            await this.testUserScalability();
            
            // Phase 2: Data Volume Scalability
            console.log('\n💾 Phase 2: Data Volume Scalability Testing');
            await this.testDataScalability();
            
            // Phase 3: Network Condition Scalability
            console.log('\n🌐 Phase 3: Network Condition Scalability Testing');
            await this.testNetworkScalability();
            
            // Phase 4: Cross-dimensional Testing
            console.log('\n🔀 Phase 4: Cross-dimensional Scalability Testing');
            await this.testCrossDimensionalScalability();
            
            const analysis = this.analyzeResults();
            await this.generateReport(analysis);
            
            console.log('\n✅ Scalability testing completed');
            console.log(`📄 Report saved to: ${this.reportPath}`);
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Scalability testing failed:', error.message);
            throw error;
        }
    }

    async testUserScalability() {
        for (const userCount of this.userScenarios) {
            console.log(`\n  🧪 Testing with ${userCount} users`);
            
            const result = await this.executeScalabilityTest({
                users: userCount,
                dataLoad: 'medium',
                networkCondition: 'fast',
                duration: this.testDuration
            });
            
            this.results.userScaling.push({
                userCount,
                ...result,
                scalingMetric: 'user'
            });
            
            // Brief cooldown between tests
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async testDataScalability() {
        const baselineUsers = 25; // Fixed user count for data scaling
        
        for (const dataLoad of this.dataScenarios) {
            console.log(`\n  📊 Testing with ${dataLoad} data load`);
            
            const result = await this.executeScalabilityTest({
                users: baselineUsers,
                dataLoad,
                networkCondition: 'fast',
                duration: this.testDuration
            });
            
            this.results.dataScaling.push({
                dataLoad,
                userCount: baselineUsers,
                ...result,
                scalingMetric: 'data'
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async testNetworkScalability() {
        const baselineUsers = 25; // Fixed user count for network scaling
        
        for (const networkCondition of this.networkScenarios) {
            console.log(`\n  🔌 Testing with ${networkCondition} network conditions`);
            
            const result = await this.executeScalabilityTest({
                users: baselineUsers,
                dataLoad: 'medium',
                networkCondition,
                duration: this.testDuration
            });
            
            this.results.networkScaling.push({
                networkCondition,
                userCount: baselineUsers,
                ...result,
                scalingMetric: 'network'
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async testCrossDimensionalScalability() {
        // Test combinations of high user count + heavy data + slow network
        const criticalScenarios = [
            { users: 50, dataLoad: 'heavy', networkCondition: 'slow', label: 'High Load + Heavy Data + Slow Network' },
            { users: 100, dataLoad: 'medium', networkCondition: 'mobile', label: 'Very High Load + Mobile Network' },
            { users: 25, dataLoad: 'heavy', networkCondition: 'mobile', label: 'Heavy Data + Mobile Network' }
        ];
        
        for (const scenario of criticalScenarios) {
            console.log(`\n  🎯 Testing: ${scenario.label}`);
            
            const result = await this.executeScalabilityTest({
                users: scenario.users,
                dataLoad: scenario.dataLoad,
                networkCondition: scenario.networkCondition,
                duration: this.testDuration
            });
            
            this.results.crossScenarios.push({
                ...scenario,
                ...result,
                scalingMetric: 'combined'
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async executeScalabilityTest(config) {
        const startTime = Date.now();
        const endTime = startTime + (config.duration * 1000);
        const userPromises = [];
        const testResults = {
            requests: [],
            config,
            startTime: new Date(startTime).toISOString(),
            metrics: null
        };

        // Configure request parameters based on scenarios
        const requestConfig = this.getRequestConfig(config);
        
        // Spawn users
        for (let i = 0; i < config.users; i++) {
            const userPromise = this.simulateScalabilityUser(
                i + 1, 
                endTime, 
                requestConfig, 
                testResults
            );
            userPromises.push(userPromise);
            
            // Gradual ramp-up
            if (i < config.users - 1) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }

        // Wait for test completion
        await Promise.all(userPromises.map(p => p.catch(error => ({ error: error.message }))));
        
        // Calculate metrics
        testResults.endTime = new Date().toISOString();
        testResults.actualDuration = (Date.now() - startTime) / 1000;
        testResults.metrics = this.calculateScalabilityMetrics(testResults.requests);
        
        return testResults;
    }

    getRequestConfig(config) {
        const baseConfig = {
            timeout: 30000,
            headers: {
                'User-Agent': `ScalabilityTester-${config.users}u-${config.dataLoad}-${config.networkCondition}`,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            }
        };

        // Adjust timeout based on network conditions
        switch (config.networkCondition) {
            case 'slow':
                baseConfig.timeout = 60000;
                break;
            case 'mobile':
                baseConfig.timeout = 45000;
                break;
            case 'fast':
            default:
                baseConfig.timeout = 30000;
                break;
        }

        // Add data load simulation parameters
        switch (config.dataLoad) {
            case 'light':
                baseConfig.headers['Accept-Encoding'] = 'gzip';
                break;
            case 'medium':
                baseConfig.headers['Accept-Encoding'] = 'gzip, deflate';
                break;
            case 'heavy':
                baseConfig.headers['Accept-Encoding'] = 'gzip, deflate, br';
                baseConfig.headers['Accept'] = '*/*'; // Request all content types
                break;
        }

        return baseConfig;
    }

    async simulateScalabilityUser(userId, endTime, requestConfig, testResults) {
        const userStartTime = Date.now();
        
        while (Date.now() < endTime) {
            const requestStart = Date.now();
            
            try {
                // Simulate network delays based on condition
                const networkDelay = this.getNetworkDelay(requestConfig.headers['User-Agent']);
                if (networkDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, networkDelay));
                }
                
                const response = await axios.get(this.testUrl, requestConfig);
                const requestEnd = Date.now();
                
                testResults.requests.push({
                    userId,
                    timestamp: requestStart,
                    responseTime: requestEnd - requestStart - networkDelay,
                    totalTime: requestEnd - requestStart,
                    networkDelay,
                    statusCode: response.status,
                    success: true,
                    error: null,
                    contentLength: response.data?.length || 0,
                    headers: Object.keys(response.headers).length
                });
                
            } catch (error) {
                const requestEnd = Date.now();
                
                testResults.requests.push({
                    userId,
                    timestamp: requestStart,
                    responseTime: requestEnd - requestStart,
                    totalTime: requestEnd - requestStart,
                    networkDelay: 0,
                    statusCode: error.response?.status || 0,
                    success: false,
                    error: error.code || error.message,
                    contentLength: 0,
                    headers: 0
                });
            }
            
            // Wait between requests (varies by network condition)
            const requestInterval = this.getRequestInterval(requestConfig.headers['User-Agent']);
            await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
    }

    getNetworkDelay(userAgent) {
        if (userAgent.includes('slow')) {
            return Math.random() * 1000 + 500; // 500-1500ms delay
        } else if (userAgent.includes('mobile')) {
            return Math.random() * 500 + 200; // 200-700ms delay
        }
        return 0; // No additional delay for fast
    }

    getRequestInterval(userAgent) {
        if (userAgent.includes('slow')) {
            return 3000 + Math.random() * 2000; // 3-5s between requests
        } else if (userAgent.includes('mobile')) {
            return 2000 + Math.random() * 1000; // 2-3s between requests
        }
        return 1000 + Math.random() * 500; // 1-1.5s between requests for fast
    }

    calculateScalabilityMetrics(requests) {
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
                throughput: 0,
                efficiency: 0
            };
        }

        const successful = requests.filter(r => r.success);
        const failed = requests.filter(r => !r.success);
        const responseTimes = successful.map(r => r.responseTime).sort((a, b) => a - b);
        const totalTimes = successful.map(r => r.totalTime).sort((a, b) => a - b);
        
        return {
            totalRequests: requests.length,
            successfulRequests: successful.length,
            failedRequests: failed.length,
            successRate: (successful.length / requests.length) * 100,
            errorRate: (failed.length / requests.length) * 100,
            
            // Response time metrics (excluding network simulation delays)
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
            
            // Total time metrics (including network delays)
            avgTotalTime: totalTimes.length > 0 ? 
                Math.round(totalTimes.reduce((a, b) => a + b) / totalTimes.length) : 0,
            
            // Performance metrics
            throughput: successful.length / (this.testDuration / 60), // requests per minute
            requestsPerSecond: successful.length / this.testDuration,
            bytesPerSecond: successful.reduce((sum, r) => sum + r.contentLength, 0) / this.testDuration,
            
            // Scalability-specific metrics
            efficiency: this.calculateEfficiency(successful.length, responseTimes),
            resourceUtilization: this.calculateResourceUtilization(requests),
            
            // Error analysis
            errorsByType: this.categorizeErrors(failed),
            timeoutRate: (failed.filter(r => r.error && r.error.includes('timeout')).length / requests.length) * 100
        };
    }

    calculateEfficiency(successfulRequests, responseTimes) {
        if (responseTimes.length === 0) return 0;
        
        // Efficiency = throughput / average response time
        // Higher throughput with lower response time = higher efficiency
        const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
        const throughput = successfulRequests / this.testDuration;
        
        return (throughput * 1000) / (avgResponseTime || 1); // Normalize for milliseconds
    }

    calculateResourceUtilization(requests) {
        const totalBytes = requests.reduce((sum, r) => sum + r.contentLength, 0);
        const avgHeaderCount = requests.length > 0 ? 
            requests.reduce((sum, r) => sum + r.headers, 0) / requests.length : 0;
        
        return {
            totalDataTransferred: totalBytes,
            avgDataPerRequest: requests.length > 0 ? Math.round(totalBytes / requests.length) : 0,
            avgHeadersPerResponse: Math.round(avgHeaderCount),
            bandwidthUtilization: totalBytes / this.testDuration // bytes per second
        };
    }

    categorizeErrors(failedRequests) {
        const errorTypes = {};
        
        failedRequests.forEach(request => {
            let category = 'Unknown';
            
            if (request.error) {
                if (request.error.includes('timeout')) {
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

    analyzeResults() {
        if (this.results.userScaling.length === 0) {
            return {
                status: 'FAILED',
                error: 'No scalability tests completed',
                summary: null
            };
        }

        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            testConfiguration: {
                targetUrl: this.testUrl,
                userScenarios: this.userScenarios,
                dataScenarios: this.dataScenarios,
                networkScenarios: this.networkScenarios,
                testDuration: this.testDuration
            },
            scalabilityAnalysis: {
                userScalability: this.analyzeUserScalability(),
                dataScalability: this.analyzeDataScalability(),
                networkScalability: this.analyzeNetworkScalability(),
                combinedScenarios: this.analyzeCombinedScenarios()
            },
            scalingLaws: this.deriveScalingLaws(),
            performanceEnvelope: this.definePerformanceEnvelope(),
            recommendations: [],
            overallScore: 0,
            detailedResults: {
                userScaling: this.results.userScaling,
                dataScaling: this.results.dataScaling,
                networkScaling: this.results.networkScaling,
                crossScenarios: this.results.crossScenarios
            }
        };

        analysis.recommendations = this.generateScalabilityRecommendations(analysis);
        analysis.overallScore = this.calculateScalabilityScore(analysis);

        return analysis;
    }

    analyzeUserScalability() {
        const results = this.results.userScaling;
        const throughputData = results.map(r => ({ users: r.userCount, throughput: r.metrics.throughput }));
        const responseTimeData = results.map(r => ({ users: r.userCount, responseTime: r.metrics.avgResponseTime }));
        
        return {
            maxEffectiveUsers: this.findMaxEffectiveUsers(results),
            throughputScaling: this.analyzeThroughputScaling(throughputData),
            responseTimeScaling: this.analyzeResponseTimeScaling(responseTimeData),
            scalingBreakpoint: this.findScalingBreakpoint(results, 'userCount'),
            linearityIndex: this.calculateLinearityIndex(throughputData)
        };
    }

    analyzeDataScalability() {
        const results = this.results.dataScaling;
        
        return {
            dataImpactFactor: this.calculateDataImpactFactor(results),
            efficiencyByDataLoad: results.map(r => ({
                dataLoad: r.dataLoad,
                efficiency: r.metrics.efficiency,
                avgResponseTime: r.metrics.avgResponseTime,
                throughput: r.metrics.throughput
            })),
            recommendedDataLoad: this.findOptimalDataLoad(results)
        };
    }

    analyzeNetworkScalability() {
        const results = this.results.networkScaling;
        
        return {
            networkImpactFactor: this.calculateNetworkImpactFactor(results),
            performanceByNetwork: results.map(r => ({
                networkCondition: r.networkCondition,
                avgTotalTime: r.metrics.avgTotalTime,
                avgResponseTime: r.metrics.avgResponseTime,
                successRate: r.metrics.successRate,
                timeoutRate: r.metrics.timeoutRate
            })),
            networkResilience: this.assessNetworkResilience(results)
        };
    }

    analyzeCombinedScenarios() {
        const results = this.results.crossScenarios;
        
        return {
            worstCasePerformance: this.findWorstCaseScenario(results),
            stressTestResults: results.map(r => ({
                scenario: r.label,
                successRate: r.metrics.successRate,
                avgResponseTime: r.metrics.avgResponseTime,
                efficiency: r.metrics.efficiency,
                verdict: r.metrics.successRate > 95 && r.metrics.avgResponseTime < 5000 ? 'PASS' : 'FAIL'
            })),
            combinedScalabilityIndex: this.calculateCombinedScalabilityIndex(results)
        };
    }

    findMaxEffectiveUsers(results) {
        // Find the user count where efficiency starts to drop significantly
        for (let i = 1; i < results.length; i++) {
            const current = results[i];
            const previous = results[i - 1];
            
            const efficiencyDrop = (previous.metrics.efficiency - current.metrics.efficiency) / previous.metrics.efficiency;
            const errorRateIncrease = current.metrics.errorRate - previous.metrics.errorRate;
            
            if (efficiencyDrop > 0.2 || errorRateIncrease > 5) {
                return previous.userCount;
            }
        }
        
        return results[results.length - 1].userCount;
    }

    analyzeThroughputScaling(data) {
        if (data.length < 2) return { pattern: 'INSUFFICIENT_DATA' };
        
        // Calculate the scaling pattern
        const ratios = [];
        for (let i = 1; i < data.length; i++) {
            const userRatio = data[i].users / data[i - 1].users;
            const throughputRatio = data[i].throughput / data[i - 1].throughput;
            ratios.push(throughputRatio / userRatio);
        }
        
        const avgRatio = ratios.reduce((a, b) => a + b) / ratios.length;
        
        let pattern;
        if (avgRatio > 0.9) pattern = 'LINEAR';
        else if (avgRatio > 0.7) pattern = 'SUB_LINEAR';
        else if (avgRatio > 0.5) pattern = 'POOR';
        else pattern = 'DEGRADING';
        
        return {
            pattern,
            scalingEfficiency: avgRatio,
            maxThroughput: Math.max(...data.map(d => d.throughput))
        };
    }

    analyzeResponseTimeScaling(data) {
        if (data.length < 2) return { pattern: 'INSUFFICIENT_DATA' };
        
        const increases = [];
        for (let i = 1; i < data.length; i++) {
            const increase = (data[i].responseTime - data[i - 1].responseTime) / data[i - 1].responseTime;
            increases.push(increase);
        }
        
        const avgIncrease = increases.reduce((a, b) => a + b) / increases.length;
        
        let pattern;
        if (avgIncrease < 0.1) pattern = 'EXCELLENT';
        else if (avgIncrease < 0.3) pattern = 'GOOD';
        else if (avgIncrease < 0.5) pattern = 'FAIR';
        else pattern = 'POOR';
        
        return {
            pattern,
            avgPercentageIncrease: (avgIncrease * 100).toFixed(2),
            minResponseTime: Math.min(...data.map(d => d.responseTime)),
            maxResponseTime: Math.max(...data.map(d => d.responseTime))
        };
    }

    findScalingBreakpoint(results, dimensionKey) {
        for (let i = 1; i < results.length; i++) {
            const current = results[i];
            if (current.metrics.errorRate > 10 || current.metrics.avgResponseTime > 10000) {
                return {
                    breakpointValue: current[dimensionKey],
                    reason: current.metrics.errorRate > 10 ? 'High Error Rate' : 'Slow Response Time',
                    errorRate: current.metrics.errorRate,
                    avgResponseTime: current.metrics.avgResponseTime
                };
            }
        }
        return null;
    }

    calculateLinearityIndex(data) {
        if (data.length < 3) return 0;
        
        // Calculate R-squared for linear regression
        const n = data.length;
        const sumX = data.reduce((sum, d) => sum + d.users, 0);
        const sumY = data.reduce((sum, d) => sum + d.throughput, 0);
        const sumXY = data.reduce((sum, d) => sum + (d.users * d.throughput), 0);
        const sumXX = data.reduce((sum, d) => sum + (d.users * d.users), 0);
        const sumYY = data.reduce((sum, d) => sum + (d.throughput * d.throughput), 0);
        
        const r = (n * sumXY - sumX * sumY) / 
                 Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return Math.max(0, r * r); // R-squared
    }

    calculateDataImpactFactor(results) {
        const baseline = results.find(r => r.dataLoad === 'light');
        if (!baseline) return 1;
        
        const impacts = results.map(r => ({
            dataLoad: r.dataLoad,
            responseTimeRatio: r.metrics.avgResponseTime / baseline.metrics.avgResponseTime,
            throughputRatio: r.metrics.throughput / baseline.metrics.throughput
        }));
        
        return impacts;
    }

    findOptimalDataLoad(results) {
        // Find the data load with the best efficiency score
        let bestResult = results[0];
        for (const result of results) {
            if (result.metrics.efficiency > bestResult.metrics.efficiency && result.metrics.errorRate < 5) {
                bestResult = result;
            }
        }
        return bestResult.dataLoad;
    }

    calculateNetworkImpactFactor(results) {
        const baseline = results.find(r => r.networkCondition === 'fast');
        if (!baseline) return [];
        
        return results.map(r => ({
            networkCondition: r.networkCondition,
            responseTimeRatio: r.metrics.avgResponseTime / baseline.metrics.avgResponseTime,
            successRateRatio: r.metrics.successRate / baseline.metrics.successRate,
            timeoutRatio: r.metrics.timeoutRate / (baseline.metrics.timeoutRate || 1)
        }));
    }

    assessNetworkResilience(results) {
        const slowNetworkResult = results.find(r => r.networkCondition === 'slow');
        const mobileNetworkResult = results.find(r => r.networkCondition === 'mobile');
        
        if (!slowNetworkResult || !mobileNetworkResult) return 'UNKNOWN';
        
        const avgSuccessRate = (slowNetworkResult.metrics.successRate + mobileNetworkResult.metrics.successRate) / 2;
        
        if (avgSuccessRate > 95) return 'EXCELLENT';
        else if (avgSuccessRate > 90) return 'GOOD';
        else if (avgSuccessRate > 80) return 'FAIR';
        else return 'POOR';
    }

    findWorstCaseScenario(results) {
        let worstResult = results[0];
        for (const result of results) {
            if (result.metrics.successRate < worstResult.metrics.successRate || 
                result.metrics.avgResponseTime > worstResult.metrics.avgResponseTime) {
                worstResult = result;
            }
        }
        
        return {
            scenario: worstResult.label,
            successRate: worstResult.metrics.successRate,
            avgResponseTime: worstResult.metrics.avgResponseTime,
            errorRate: worstResult.metrics.errorRate
        };
    }

    calculateCombinedScalabilityIndex(results) {
        if (results.length === 0) return 0;
        
        const scores = results.map(r => {
            let score = 100;
            
            // Penalize high error rates
            if (r.metrics.errorRate > 10) score -= 40;
            else if (r.metrics.errorRate > 5) score -= 20;
            else if (r.metrics.errorRate > 1) score -= 10;
            
            // Penalize slow response times
            if (r.metrics.avgResponseTime > 10000) score -= 30;
            else if (r.metrics.avgResponseTime > 5000) score -= 20;
            else if (r.metrics.avgResponseTime > 2000) score -= 10;
            
            // Penalize low throughput
            if (r.metrics.throughput < 5) score -= 20;
            else if (r.metrics.throughput < 10) score -= 10;
            
            return Math.max(0, score);
        });
        
        return scores.reduce((a, b) => a + b) / scores.length;
    }

    deriveScalingLaws() {
        // Derive Universal Scalability Law parameters if possible
        const userResults = this.results.userScaling;
        if (userResults.length < 3) {
            return { available: false, reason: 'Insufficient data points' };
        }

        // Simple analysis based on throughput vs user count
        const maxThroughput = Math.max(...userResults.map(r => r.metrics.throughput));
        const optimalUsers = userResults.find(r => r.metrics.throughput === maxThroughput)?.userCount || 0;
        
        return {
            available: true,
            maxThroughputCapacity: maxThroughput,
            optimalUserCount: optimalUsers,
            scalingCoefficient: maxThroughput / optimalUsers,
            degenerationPoint: this.findDegenerationPoint(userResults)
        };
    }

    findDegenerationPoint(results) {
        for (let i = 1; i < results.length; i++) {
            if (results[i].metrics.throughput < results[i - 1].metrics.throughput * 0.9) {
                return results[i].userCount;
            }
        }
        return null;
    }

    definePerformanceEnvelope() {
        const allResults = [
            ...this.results.userScaling,
            ...this.results.dataScaling,
            ...this.results.networkScaling,
            ...this.results.crossScenarios
        ];
        
        return {
            maxSuccessfulThroughput: Math.max(...allResults.map(r => r.metrics.throughput)),
            minAcceptableResponseTime: Math.min(...allResults.filter(r => r.metrics.successRate > 95).map(r => r.metrics.avgResponseTime)),
            maxAcceptableResponseTime: Math.max(...allResults.filter(r => r.metrics.successRate > 95).map(r => r.metrics.avgResponseTime)),
            reliabilityThreshold: 95, // % success rate
            performanceThreshold: 3000 // ms average response time
        };
    }

    generateScalabilityRecommendations(analysis) {
        const recommendations = [];
        const userScalability = analysis.scalabilityAnalysis.userScalability;
        const envelope = analysis.performanceEnvelope;

        // User scalability recommendations
        if (userScalability.throughputScaling.pattern === 'DEGRADING') {
            recommendations.push({
                category: 'User Scalability',
                priority: 'CRITICAL',
                issue: 'Throughput degrades significantly with increased user load',
                impact: 'System cannot handle growth in user base',
                solutions: [
                    'Implement horizontal scaling with load balancers',
                    'Optimize application for concurrent access',
                    'Consider microservices architecture',
                    'Implement connection pooling and caching',
                    'Review database scaling strategies'
                ]
            });
        }

        if (userScalability.maxEffectiveUsers < 50) {
            recommendations.push({
                category: 'Capacity Planning',
                priority: 'HIGH',
                issue: `Low maximum effective user capacity: ${userScalability.maxEffectiveUsers} users`,
                impact: 'Limited ability to serve concurrent users',
                solutions: [
                    'Scale infrastructure resources (CPU, memory)',
                    'Implement auto-scaling policies',
                    'Optimize resource-intensive operations',
                    'Consider CDN for static content delivery',
                    'Implement request queuing and rate limiting'
                ]
            });
        }

        // Network resilience recommendations
        const networkResilience = analysis.scalabilityAnalysis.networkScalability.networkResilience;
        if (networkResilience === 'POOR') {
            recommendations.push({
                category: 'Network Resilience',
                priority: 'HIGH',
                issue: 'Poor performance under adverse network conditions',
                impact: 'Users on slow/mobile networks experience degraded service',
                solutions: [
                    'Implement adaptive bitrate and content optimization',
                    'Add progressive loading and lazy loading',
                    'Optimize for mobile and slow connections',
                    'Implement offline-first strategies with service workers',
                    'Consider edge computing and regional deployments'
                ]
            });
        }

        // Combined scenario recommendations
        const combinedIndex = analysis.scalabilityAnalysis.combinedScenarios.combinedScalabilityIndex;
        if (combinedIndex < 60) {
            recommendations.push({
                category: 'Multi-dimensional Scalability',
                priority: 'CRITICAL',
                issue: `Poor performance under combined stress scenarios: ${combinedIndex.toFixed(2)}/100`,
                impact: 'System fails under realistic production conditions',
                solutions: [
                    'Implement comprehensive performance optimization',
                    'Design for worst-case scenario tolerance',
                    'Add circuit breakers and graceful degradation',
                    'Implement advanced caching strategies',
                    'Consider distributed system architecture'
                ]
            });
        }

        // Scaling laws recommendations
        if (analysis.scalingLaws.available && analysis.scalingLaws.degenerationPoint) {
            recommendations.push({
                category: 'Scaling Limits',
                priority: 'MEDIUM',
                issue: `Performance degeneration begins at ${analysis.scalingLaws.degenerationPoint} users`,
                impact: 'Predictable performance degradation point identified',
                solutions: [
                    'Plan capacity scaling before reaching degeneration point',
                    'Implement monitoring at 70% of degeneration threshold',
                    'Design auto-scaling triggers based on scaling laws',
                    'Regular testing at increasing load levels',
                    'Consider architectural changes for higher scalability'
                ]
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                category: 'Scalability Assessment',
                priority: 'LOW',
                issue: 'System demonstrates good scalability characteristics',
                impact: 'Strong foundation for growth and increasing load',
                solutions: [
                    'Continue regular scalability testing with increased loads',
                    'Monitor production metrics to validate test results',
                    'Plan proactive scaling for anticipated growth',
                    'Document scalability benchmarks and limits',
                    'Consider testing with even higher loads periodically'
                ]
            });
        }

        return recommendations;
    }

    calculateScalabilityScore(analysis) {
        let score = 100;
        
        // User scalability scoring
        const userScaling = analysis.scalabilityAnalysis.userScalability;
        if (userScaling.throughputScaling.pattern === 'DEGRADING') score -= 30;
        else if (userScaling.throughputScaling.pattern === 'POOR') score -= 20;
        else if (userScaling.throughputScaling.pattern === 'SUB_LINEAR') score -= 10;
        
        if (userScaling.maxEffectiveUsers < 25) score -= 25;
        else if (userScaling.maxEffectiveUsers < 50) score -= 15;
        else if (userScaling.maxEffectiveUsers < 100) score -= 5;
        
        // Network resilience scoring
        const networkResilience = analysis.scalabilityAnalysis.networkScalability.networkResilience;
        if (networkResilience === 'POOR') score -= 20;
        else if (networkResilience === 'FAIR') score -= 10;
        else if (networkResilience === 'GOOD') score -= 5;
        
        // Combined scenarios scoring
        const combinedIndex = analysis.scalabilityAnalysis.combinedScenarios.combinedScalabilityIndex;
        if (combinedIndex < 40) score -= 25;
        else if (combinedIndex < 60) score -= 15;
        else if (combinedIndex < 80) score -= 10;
        
        // Bonus for excellent linearity
        if (userScaling.linearityIndex > 0.9) score += 5;
        
        return Math.max(0, Math.round(score));
    }

    async generateReport(analysis) {
        const report = {
            testSuite: 'Scalability Testing',
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
                if (args[i + 1]) options.userScenarios = args[++i].split(',').map(Number);
                break;
            case '--data':
                if (args[i + 1]) options.dataScenarios = args[++i].split(',');
                break;
            case '--network':
                if (args[i + 1]) options.networkScenarios = args[++i].split(',');
                break;
            case '--duration':
                if (args[i + 1]) options.testDuration = parseInt(args[++i]);
                break;
            case '--output':
                if (args[i + 1]) options.reportPath = args[++i];
                break;
        }
    }

    const scalabilityTester = new ScalabilityTester(options);
    scalabilityTester.runScalabilityTest().catch(console.error);
}

module.exports = ScalabilityTester;