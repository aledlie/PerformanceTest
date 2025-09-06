#!/bin/bash

# Comprehensive Performance Test Suite Runner
# Industry-standard performance testing including Core Web Vitals, Load, Stress, Soak, and Scalability Testing

echo "🚀 Starting Comprehensive Performance Test Suite"
echo "=============================================="

# Create test directory if it doesn't exist
mkdir -p performance-reports

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required to run the test suite"
    exit 1
fi

# Check for required dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Parse command line arguments
SUITE_TYPE="comprehensive"
TARGET_URL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --quick)
            SUITE_TYPE="quick"
            shift
            ;;
        --comprehensive)
            SUITE_TYPE="comprehensive"
            shift
            ;;
        --endurance)
            SUITE_TYPE="endurance"
            shift
            ;;
        --url)
            TARGET_URL="$2"
            shift 2
            ;;
        --schema-only)
            SUITE_TYPE="schema"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --quick           Run quick performance test suite (~30 minutes)"
            echo "  --comprehensive   Run comprehensive suite without soak testing (~1 hour)"
            echo "  --endurance      Run full endurance suite including soak testing (~3+ hours)"
            echo "  --schema-only    Run only the original Schema.org impact tests"
            echo "  --url <url>      Specify target URL to test"
            echo "  --help           Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run the appropriate test suite
case $SUITE_TYPE in
    "quick")
        echo "📊 Running Quick Performance Test Suite..."
        if [ -n "$TARGET_URL" ]; then
            node master-performance-suite.js --quick --url "$TARGET_URL"
        else
            node master-performance-suite.js --quick
        fi
        ;;
    "comprehensive")
        echo "📊 Running Comprehensive Performance Test Suite..."
        if [ -n "$TARGET_URL" ]; then
            node master-performance-suite.js --comprehensive --url "$TARGET_URL"
        else
            node master-performance-suite.js --comprehensive
        fi
        ;;
    "endurance")
        echo "📊 Running Full Endurance Performance Test Suite..."
        if [ -n "$TARGET_URL" ]; then
            node master-performance-suite.js --endurance --url "$TARGET_URL"
        else
            node master-performance-suite.js --endurance
        fi
        ;;
    "schema")
        echo "📊 Running Schema.org Impact Analysis..."
        node schema-impact-test.js
        ;;
esac

# Check if test completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test suite completed successfully!"
    echo "📄 Results saved to schema-impact-report.json"
    echo ""
    echo "🔍 Quick analysis:"
    
    # Display key metrics if jq is available
    if command -v jq &> /dev/null; then
        echo "Overall Score: $(cat schema-impact-report.json | jq '.summary.overallScore')/100"
        echo "SEO Score: $(cat schema-impact-report.json | jq '.summary.seoScore')/100" 
        echo "LLM Score: $(cat schema-impact-report.json | jq '.summary.llmScore')/100"
        echo "Performance Score: $(cat schema-impact-report.json | jq '.summary.performanceScore')/100"
        echo ""
        echo "💼 Business Impact:"
        echo "Projected Traffic Increase: $(cat schema-impact-report.json | jq -r '.detailedResults.businessImpact.organicTraffic.projectedIncrease')"
        echo "CTR Improvement: $(cat schema-impact-report.json | jq -r '.detailedResults.businessImpact.clickThroughRate.improvement')"
        echo "Voice Search Capture: $(cat schema-impact-report.json | jq -r '.detailedResults.businessImpact.voiceSearchCapture.estimatedCaptureRate')"
        echo "Brand Authority: $(cat schema-impact-report.json | jq -r '.detailedResults.businessImpact.brandAuthority.marketPositioning')"
    else
        echo "Install jq for detailed JSON analysis: brew install jq"
    fi
    
    echo ""
    echo "🎯 To view the complete report:"
    echo "   cat schema-impact-report.json | jq ."
    echo ""
    echo "🔧 To run individual test categories:"
    echo "   node -e \"const t = require('./schema-impact-test.js'); new t().runSEOTests()\""
    
else
    echo "❌ Test suite failed to complete"
    exit 1
fi