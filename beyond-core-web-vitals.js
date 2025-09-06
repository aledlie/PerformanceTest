#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');

class BeyondCoreWebVitalsTest {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.reportPath = options.reportPath || './beyond-core-web-vitals-report.json';
        this.iterations = options.iterations || 5;
        this.results = [];
    }

    async runTests() {
        console.log('🔍 Starting Beyond Core Web Vitals Testing');
        console.log(`Testing URL: ${this.testUrl}`);
        console.log(`Iterations: ${this.iterations}`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        try {
            for (let i = 0; i < this.iterations; i++) {
                console.log(`\n📊 Running test iteration ${i + 1}/${this.iterations}`);
                const result = await this.measureExtendedMetrics(browser, i + 1);
                this.results.push(result);
            }

            const analysis = this.analyzeResults();
            await this.generateReport(analysis);
            
            console.log('\n✅ Beyond Core Web Vitals testing completed');
            console.log(`📄 Report saved to: ${this.reportPath}`);
            
            return analysis;
        } finally {
            await browser.close();
        }
    }

    async measureExtendedMetrics(browser, iteration) {
        const page = await browser.newPage();
        
        await page.setCacheEnabled(false);
        await page.setViewport({ width: 1200, height: 800 });

        const metrics = {
            iteration,
            timestamp: new Date().toISOString(),
            ttfb: null,
            fcp: null,
            tti: null,
            tbt: null,
            si: null,
            performanceDetails: null,
            resourceMetrics: null,
            errors: []
        };

        try {
            // Start performance measurement
            const startTime = Date.now();
            
            // Navigate and measure TTFB
            const response = await page.goto(this.testUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            if (!response.ok()) {
                throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
            }

            // Measure server response time (TTFB approximation)
            const responseTime = Date.now() - startTime;
            metrics.ttfb = responseTime;

            // Wait for full page load
            await page.waitForLoadState('networkidle');

            // Get comprehensive performance metrics
            const performanceData = await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                const resources = performance.getEntriesByType('resource');
                
                // Calculate TTFB from Navigation API
                const ttfbFromNav = navigation.responseStart - navigation.requestStart;
                
                // Get FCP
                const fcpEntry = paint.find(p => p.name === 'first-contentful-paint');
                const fcp = fcpEntry ? fcpEntry.startTime : null;
                
                // Calculate TTI approximation
                const domInteractive = navigation.domInteractive;
                const loadEventEnd = navigation.loadEventEnd;
                const tti = loadEventEnd || domInteractive;
                
                // Calculate Total Blocking Time approximation
                const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
                const tbt = Math.max(0, domContentLoaded - 50); // Simplified TBT calculation
                
                // Speed Index approximation (simplified)
                const si = fcp + (tti - fcp) * 0.3;
                
                // Resource analysis
                const resourceSummary = {
                    totalRequests: resources.length,
                    totalBytes: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
                    imageRequests: resources.filter(r => r.initiatorType === 'img').length,
                    scriptRequests: resources.filter(r => r.initiatorType === 'script').length,
                    stylesheetRequests: resources.filter(r => r.initiatorType === 'css').length,
                    avgResourceTime: resources.length > 0 ? 
                        resources.reduce((sum, r) => sum + r.duration, 0) / resources.length : 0
                };
                
                return {
                    ttfb: ttfbFromNav,
                    fcp,
                    tti,
                    tbt,
                    si,
                    performanceDetails: {
                        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                        domInteractive: navigation.domInteractive - navigation.fetchStart,
                        domComplete: navigation.domComplete - navigation.fetchStart,
                        redirectTime: navigation.redirectEnd - navigation.redirectStart,
                        dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
                        connectTime: navigation.connectEnd - navigation.connectStart,
                        requestTime: navigation.responseEnd - navigation.requestStart,
                        responseTime: navigation.responseEnd - navigation.responseStart,
                        domParsingTime: navigation.domInteractive - navigation.responseEnd,
                        resourceLoadTime: navigation.loadEventStart - navigation.domContentLoadedEventEnd
                    },
                    resourceSummary
                };
            });

            // Update metrics with more accurate measurements
            metrics.ttfb = Math.min(metrics.ttfb, performanceData.ttfb || metrics.ttfb);
            metrics.fcp = performanceData.fcp;
            metrics.tti = performanceData.tti;
            metrics.tbt = performanceData.tbt;
            metrics.si = performanceData.si;
            metrics.performanceDetails = performanceData.performanceDetails;
            metrics.resourceMetrics = performanceData.resourceSummary;

        } catch (error) {
            metrics.errors.push(error.message);
            console.error(`Error in iteration ${iteration}:`, error.message);
        } finally {
            await page.close();
        }

        return metrics;
    }

    analyzeResults() {
        const validResults = this.results.filter(r => r.ttfb !== null);
        
        if (validResults.length === 0) {
            return {
                status: 'FAILED',
                error: 'No valid measurements collected',
                results: this.results
            };
        }

        const ttfbValues = validResults.map(r => r.ttfb).filter(v => v !== null);
        const fcpValues = validResults.map(r => r.fcp).filter(v => v !== null);
        const ttiValues = validResults.map(r => r.tti).filter(v => v !== null);
        const tbtValues = validResults.map(r => r.tbt).filter(v => v !== null);
        const siValues = validResults.map(r => r.si).filter(v => v !== null);

        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            testConfig: {
                url: this.testUrl,
                iterations: this.iterations,
                validMeasurements: validResults.length
            },
            extendedMetrics: {
                ttfb: this.analyzeMetric(ttfbValues, 'TTFB', [200, 500], 'ms'),
                fcp: this.analyzeMetric(fcpValues, 'FCP', [1800, 3000], 'ms'),
                tti: this.analyzeMetric(ttiValues, 'TTI', [3800, 7300], 'ms'),
                tbt: this.analyzeMetric(tbtValues, 'TBT', [200, 600], 'ms'),
                si: this.analyzeMetric(siValues, 'SI', [3400, 5800], 'ms')
            },
            performanceInsights: this.generatePerformanceInsights(validResults),
            overallScore: 0,
            recommendations: [],
            rawData: this.results
        };

        // Calculate overall score
        const scores = Object.values(analysis.extendedMetrics).map(m => m.score);
        analysis.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis.extendedMetrics);

        return analysis;
    }

    analyzeMetric(values, name, thresholds, unit = 'ms') {
        if (values.length === 0) {
            return {
                name,
                unit,
                average: null,
                median: null,
                p75: null,
                min: null,
                max: null,
                score: 0,
                rating: 'POOR',
                passingThreshold: thresholds[0],
                needsImprovementThreshold: thresholds[1]
            };
        }

        values.sort((a, b) => a - b);
        const average = values.reduce((a, b) => a + b) / values.length;
        const median = values[Math.floor(values.length / 2)];
        const p75 = values[Math.floor(values.length * 0.75)];
        
        const testValue = median; // Use median for consistency
        let rating, score;
        
        if (testValue <= thresholds[0]) {
            rating = 'GOOD';
            score = 100 - (testValue / thresholds[0]) * 10;
        } else if (testValue <= thresholds[1]) {
            rating = 'NEEDS_IMPROVEMENT';
            score = 90 - ((testValue - thresholds[0]) / (thresholds[1] - thresholds[0])) * 40;
        } else {
            rating = 'POOR';
            score = Math.max(0, 50 - (testValue / thresholds[1] - 1) * 50);
        }

        return {
            name,
            unit,
            average: Math.round(average * 100) / 100,
            median: Math.round(median * 100) / 100,
            p75: Math.round(p75 * 100) / 100,
            min: Math.round(values[0] * 100) / 100,
            max: Math.round(values[values.length - 1] * 100) / 100,
            score: Math.round(score),
            rating,
            passingThreshold: thresholds[0],
            needsImprovementThreshold: thresholds[1],
            sampleSize: values.length
        };
    }

    generatePerformanceInsights(results) {
        const avgResourceMetrics = this.calculateAverageResourceMetrics(results);
        const avgPerformanceDetails = this.calculateAveragePerformanceDetails(results);

        return {
            resourceAnalysis: {
                ...avgResourceMetrics,
                insights: [
                    avgResourceMetrics.totalRequests > 100 ? 
                        'High number of requests - consider resource bundling' : 
                        'Request count is reasonable',
                    avgResourceMetrics.totalBytes > 5000000 ? 
                        'Large page size - optimize images and assets' : 
                        'Page size is within acceptable limits',
                    avgResourceMetrics.imageRequests / avgResourceMetrics.totalRequests > 0.3 ? 
                        'High proportion of image requests - implement lazy loading' : 
                        'Image request ratio is reasonable'
                ]
            },
            networkAnalysis: {
                ...avgPerformanceDetails,
                bottlenecks: [
                    avgPerformanceDetails.dnsTime > 100 ? 'DNS resolution is slow' : null,
                    avgPerformanceDetails.connectTime > 300 ? 'Connection establishment is slow' : null,
                    avgPerformanceDetails.responseTime > 500 ? 'Server response is slow' : null,
                    avgPerformanceDetails.domParsingTime > 1000 ? 'DOM parsing is slow' : null
                ].filter(Boolean)
            }
        };
    }

    calculateAverageResourceMetrics(results) {
        const resourceMetrics = results.map(r => r.resourceMetrics).filter(Boolean);
        if (resourceMetrics.length === 0) return {};

        return {
            totalRequests: Math.round(resourceMetrics.reduce((sum, r) => sum + r.totalRequests, 0) / resourceMetrics.length),
            totalBytes: Math.round(resourceMetrics.reduce((sum, r) => sum + r.totalBytes, 0) / resourceMetrics.length),
            imageRequests: Math.round(resourceMetrics.reduce((sum, r) => sum + r.imageRequests, 0) / resourceMetrics.length),
            scriptRequests: Math.round(resourceMetrics.reduce((sum, r) => sum + r.scriptRequests, 0) / resourceMetrics.length),
            stylesheetRequests: Math.round(resourceMetrics.reduce((sum, r) => sum + r.stylesheetRequests, 0) / resourceMetrics.length),
            avgResourceTime: Math.round((resourceMetrics.reduce((sum, r) => sum + r.avgResourceTime, 0) / resourceMetrics.length) * 100) / 100
        };
    }

    calculateAveragePerformanceDetails(results) {
        const performanceDetails = results.map(r => r.performanceDetails).filter(Boolean);
        if (performanceDetails.length === 0) return {};

        const keys = Object.keys(performanceDetails[0]);
        const averaged = {};

        keys.forEach(key => {
            averaged[key] = Math.round(
                (performanceDetails.reduce((sum, p) => sum + (p[key] || 0), 0) / performanceDetails.length) * 100
            ) / 100;
        });

        return averaged;
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.ttfb.rating !== 'GOOD') {
            recommendations.push({
                metric: 'TTFB',
                priority: 'HIGH',
                issue: `Time to First Byte is ${metrics.ttfb.median}ms (${metrics.ttfb.rating})`,
                solutions: [
                    'Optimize server-side processing and database queries',
                    'Implement proper caching strategies (Redis, Memcached)',
                    'Use a Content Delivery Network (CDN)',
                    'Optimize DNS resolution with faster DNS providers',
                    'Consider server-side rendering optimization'
                ]
            });
        }

        if (metrics.fcp.rating !== 'GOOD') {
            recommendations.push({
                metric: 'FCP',
                priority: 'HIGH',
                issue: `First Contentful Paint is ${metrics.fcp.median}ms (${metrics.fcp.rating})`,
                solutions: [
                    'Prioritize above-the-fold content loading',
                    'Inline critical CSS and defer non-critical CSS',
                    'Optimize web font loading with font-display: swap',
                    'Minimize render-blocking resources',
                    'Use resource hints (preload, prefetch, preconnect)'
                ]
            });
        }

        if (metrics.tti.rating !== 'GOOD') {
            recommendations.push({
                metric: 'TTI',
                priority: 'MEDIUM',
                issue: `Time to Interactive is ${metrics.tti.median}ms (${metrics.tti.rating})`,
                solutions: [
                    'Minimize main thread work with code splitting',
                    'Remove unused JavaScript code',
                    'Implement efficient event listeners',
                    'Use web workers for heavy computations',
                    'Optimize third-party script loading'
                ]
            });
        }

        if (metrics.tbt.rating !== 'GOOD') {
            recommendations.push({
                metric: 'TBT',
                priority: 'MEDIUM',
                issue: `Total Blocking Time is ${metrics.tbt.median}ms (${metrics.tbt.rating})`,
                solutions: [
                    'Break up long-running tasks into smaller chunks',
                    'Use setTimeout or requestIdleCallback for non-critical work',
                    'Optimize JavaScript execution and parsing',
                    'Implement progressive enhancement',
                    'Consider using a service worker for background processing'
                ]
            });
        }

        if (metrics.si.rating !== 'GOOD') {
            recommendations.push({
                metric: 'Speed Index',
                priority: 'MEDIUM',
                issue: `Speed Index is ${metrics.si.median}ms (${metrics.si.rating})`,
                solutions: [
                    'Optimize the critical rendering path',
                    'Implement progressive image loading',
                    'Use skeleton screens or loading placeholders',
                    'Prioritize visible content loading',
                    'Minimize layout shifts during loading'
                ]
            });
        }

        return recommendations;
    }

    async generateReport(analysis) {
        const report = {
            testSuite: 'Beyond Core Web Vitals',
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
        if (args[i] === '--url' && args[i + 1]) {
            options.url = args[i + 1];
            i++;
        } else if (args[i] === '--iterations' && args[i + 1]) {
            options.iterations = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--output' && args[i + 1]) {
            options.reportPath = args[i + 1];
            i++;
        }
    }

    const tester = new BeyondCoreWebVitalsTest(options);
    tester.runTests().catch(console.error);
}

module.exports = BeyondCoreWebVitalsTest;