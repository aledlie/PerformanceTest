#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CoreWebVitalsTest {
    constructor(options = {}) {
        this.testUrl = options.url || 'https://inspiredmovementaustin.com';
        this.reportPath = options.reportPath || './core-web-vitals-report.json';
        this.iterations = options.iterations || 5;
        this.results = [];
    }

    async runTests() {
        console.log('🎯 Starting Core Web Vitals Testing');
        console.log(`Testing URL: ${this.testUrl}`);
        console.log(`Iterations: ${this.iterations}`);
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        try {
            for (let i = 0; i < this.iterations; i++) {
                console.log(`\n📊 Running test iteration ${i + 1}/${this.iterations}`);
                const result = await this.measureWebVitals(browser, i + 1);
                this.results.push(result);
            }

            const analysis = this.analyzeResults();
            await this.generateReport(analysis);
            
            console.log('\n✅ Core Web Vitals testing completed');
            console.log(`📄 Report saved to: ${this.reportPath}`);
            
            return analysis;
        } finally {
            await browser.close();
        }
    }

    async measureWebVitals(browser, iteration) {
        const page = await browser.newPage();
        
        await page.setCacheEnabled(false);
        await page.setViewport({ width: 1200, height: 800 });

        const metrics = {
            iteration,
            timestamp: new Date().toISOString(),
            lcp: null,
            fid: null,
            cls: null,
            performanceMetrics: null,
            errors: []
        };

        try {
            // Inject Web Vitals library
            await page.evaluateOnNewDocument(() => {
                window.webVitalsData = {};
                
                // Mock web-vitals library functions
                window.getCLS = (callback) => {
                    const observer = new PerformanceObserver((entryList) => {
                        let clsValue = 0;
                        const entries = entryList.getEntries();
                        
                        entries.forEach((entry) => {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        });
                        
                        window.webVitalsData.cls = clsValue;
                        callback({ value: clsValue, name: 'CLS' });
                    });
                    
                    if ('LayoutShift' in window) {
                        observer.observe({ entryTypes: ['layout-shift'] });
                    }
                };

                window.getLCP = (callback) => {
                    const observer = new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        
                        window.webVitalsData.lcp = lastEntry.startTime;
                        callback({ value: lastEntry.startTime, name: 'LCP' });
                    });
                    
                    observer.observe({ entryTypes: ['largest-contentful-paint'] });
                };

                window.getFID = (callback) => {
                    const observer = new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        entries.forEach((entry) => {
                            window.webVitalsData.fid = entry.processingStart - entry.startTime;
                            callback({ value: entry.processingStart - entry.startTime, name: 'FID' });
                        });
                    });
                    
                    observer.observe({ entryTypes: ['first-input'] });
                };

                // Initialize measurements
                document.addEventListener('DOMContentLoaded', () => {
                    window.getCLS((metric) => console.log('CLS:', metric.value));
                    window.getLCP((metric) => console.log('LCP:', metric.value));
                    window.getFID((metric) => console.log('FID:', metric.value));
                });
            });

            // Navigate to the page
            const response = await page.goto(this.testUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            if (!response.ok()) {
                throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
            }

            // Wait for page to fully load and measure
            await page.waitForTimeout(5000);

            // Get Core Web Vitals data
            const webVitalsData = await page.evaluate(() => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(window.webVitalsData || {});
                    }, 2000);
                });
            });

            // Get performance metrics
            const performanceMetrics = await page.evaluate(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                const paint = performance.getEntriesByType('paint');
                
                return {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,
                    timeToInteractive: navigation.domInteractive - navigation.fetchStart,
                    totalBytes: navigation.transferSize || 0,
                    domNodes: document.querySelectorAll('*').length
                };
            });

            metrics.lcp = webVitalsData.lcp || performanceMetrics.firstContentfulPaint || null;
            metrics.fid = webVitalsData.fid || null;
            metrics.cls = webVitalsData.cls || null;
            metrics.performanceMetrics = performanceMetrics;

        } catch (error) {
            metrics.errors.push(error.message);
            console.error(`Error in iteration ${iteration}:`, error.message);
        } finally {
            await page.close();
        }

        return metrics;
    }

    analyzeResults() {
        const validResults = this.results.filter(r => r.lcp !== null);
        
        if (validResults.length === 0) {
            return {
                status: 'FAILED',
                error: 'No valid measurements collected',
                results: this.results
            };
        }

        const lcpValues = validResults.map(r => r.lcp).filter(v => v !== null);
        const fidValues = validResults.map(r => r.fid).filter(v => v !== null);
        const clsValues = validResults.map(r => r.cls).filter(v => v !== null);

        const analysis = {
            status: 'SUCCESS',
            timestamp: new Date().toISOString(),
            testConfig: {
                url: this.testUrl,
                iterations: this.iterations,
                validMeasurements: validResults.length
            },
            coreWebVitals: {
                lcp: this.analyzeMetric(lcpValues, 'LCP', [2500, 4000]),
                fid: this.analyzeMetric(fidValues, 'FID', [100, 300]),
                cls: this.analyzeMetric(clsValues, 'CLS', [0.1, 0.25])
            },
            overallScore: 0,
            recommendations: [],
            rawData: this.results
        };

        // Calculate overall score
        const scores = Object.values(analysis.coreWebVitals).map(m => m.score);
        analysis.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis.coreWebVitals);

        return analysis;
    }

    analyzeMetric(values, name, thresholds) {
        if (values.length === 0) {
            return {
                name,
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
        
        // Use 75th percentile for rating (Google's standard)
        const testValue = p75;
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

    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.lcp.rating !== 'GOOD') {
            recommendations.push({
                metric: 'LCP',
                priority: 'HIGH',
                issue: `Largest Contentful Paint is ${metrics.lcp.p75}ms (${metrics.lcp.rating})`,
                solutions: [
                    'Optimize images with WebP format and proper sizing',
                    'Implement resource prioritization with rel="preload"',
                    'Use a CDN to reduce server response times',
                    'Minimize render-blocking CSS and JavaScript',
                    'Consider server-side rendering for critical content'
                ]
            });
        }

        if (metrics.fid.rating !== 'GOOD' && metrics.fid.average !== null) {
            recommendations.push({
                metric: 'FID',
                priority: 'HIGH',
                issue: `First Input Delay is ${metrics.fid.p75}ms (${metrics.fid.rating})`,
                solutions: [
                    'Break up long-running JavaScript tasks',
                    'Use web workers for heavy computations',
                    'Implement code splitting and lazy loading',
                    'Optimize third-party scripts',
                    'Use requestIdleCallback for non-critical work'
                ]
            });
        }

        if (metrics.cls.rating !== 'GOOD') {
            recommendations.push({
                metric: 'CLS',
                priority: 'MEDIUM',
                issue: `Cumulative Layout Shift is ${metrics.cls.p75} (${metrics.cls.rating})`,
                solutions: [
                    'Set explicit dimensions for images and videos',
                    'Reserve space for dynamic content and ads',
                    'Use font-display: swap for web fonts',
                    'Avoid inserting content above existing content',
                    'Use transform animations instead of layout-changing properties'
                ]
            });
        }

        return recommendations;
    }

    async generateReport(analysis) {
        const report = {
            testSuite: 'Core Web Vitals',
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

    const tester = new CoreWebVitalsTest(options);
    tester.runTests().catch(console.error);
}

module.exports = CoreWebVitalsTest;