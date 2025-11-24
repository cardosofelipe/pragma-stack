#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:8000}"
API_URL="$API_BASE_URL/api/v1/openapi.json"
OUTPUT_DIR="./src/lib/api/generated"

echo -e "${YELLOW}🔧 API Client Generation${NC}"
echo -e "${YELLOW}========================${NC}"
echo ""
echo -e "API URL: ${GREEN}$API_URL${NC}"
echo -e "Output Directory: ${GREEN}$OUTPUT_DIR${NC}"
echo ""

# Check if backend is running
echo -e "${YELLOW}📡 Checking backend availability...${NC}"
if curl -s -f "$API_BASE_URL/health" > /dev/null 2>&1 || curl -s -f "$API_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is reachable${NC}"
else
    echo -e "${RED}✗ Backend is not reachable at $API_BASE_URL${NC}"
    echo -e "${YELLOW}ℹ Make sure the backend is running:${NC}"
    echo -e "  cd ../backend && uvicorn app.main:app --reload"
    exit 1
fi

# Fetch OpenAPI spec
echo -e "${YELLOW}📥 Fetching OpenAPI specification...${NC}"
if ! curl -s -f "$API_URL" -o /tmp/openapi.json; then
    echo -e "${RED}✗ Failed to fetch OpenAPI spec from $API_URL${NC}"
    exit 1
fi
echo -e "${GREEN}✓ OpenAPI spec fetched successfully${NC}"

# Create output directory
echo -e "${YELLOW}📁 Creating output directory...${NC}"
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}✓ Output directory ready${NC}"

# Generate TypeScript client
echo -e "${YELLOW}⚙️  Generating TypeScript API client...${NC}"
if npx @hey-api/openapi-ts \
    --input /tmp/openapi.json \
    --output "$OUTPUT_DIR" \
    --client @hey-api/client-axios; then
    echo -e "${GREEN}✓ API client generated successfully${NC}"
else
    echo -e "${RED}✗ Failed to generate API client${NC}"
    exit 1
fi

# Add eslint-disable to all generated .ts files
echo -e "${YELLOW}🔧 Adding eslint-disable to generated files...${NC}"
for file in "$OUTPUT_DIR"/**/*.ts "$OUTPUT_DIR"/*.ts; do
    if [ -f "$file" ] && ! grep -q "^/\* eslint-disable \*/$" "$file"; then
        # Get first line
        first_line=$(head -n 1 "$file")
        # Add eslint-disable after the auto-generated comment
        if [[ "$first_line" == "// This file is auto-generated"* ]]; then
            sed -i '1 a /* eslint-disable */' "$file"
        else
            sed -i '1 i /* eslint-disable */' "$file"
        fi
    fi
done
echo -e "${GREEN}✓ ESLint disabled for generated files${NC}"

# Generate MSW handlers from OpenAPI spec
echo -e "${YELLOW}🎭 Generating MSW handlers...${NC}"
if npx tsx scripts/generate-msw-handlers.ts /tmp/openapi.json; then
    echo -e "${GREEN}✓ MSW handlers generated successfully${NC}"
else
    echo -e "${YELLOW}⚠ MSW handler generation failed (non-critical)${NC}"
fi

# Clean up
rm /tmp/openapi.json

echo ""
echo -e "${GREEN}✅ API client generation complete!${NC}"
echo -e "${YELLOW}📝 Generated files:${NC}"
echo -e "  - $OUTPUT_DIR/index.ts"
echo -e "  - $OUTPUT_DIR/schemas/"
echo -e "  - $OUTPUT_DIR/services/"
echo -e "  - src/mocks/handlers/generated.ts (MSW handlers)"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "  Import in your code:"
echo -e "  ${GREEN}import { ApiClient } from '@/lib/api/generated';${NC}"
echo ""
echo -e "${YELLOW}🎭 Demo Mode:${NC}"
echo -e "  MSW handlers are automatically synced with your API"
echo -e "  Test demo mode: ${GREEN}NEXT_PUBLIC_DEMO_MODE=true npm run dev${NC}"
echo ""
