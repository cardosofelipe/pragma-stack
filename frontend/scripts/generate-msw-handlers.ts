#!/usr/bin/env node
/**
 * MSW Handler Generator
 *
 * Automatically generates MSW request handlers from OpenAPI specification.
 * This keeps mock API in sync with real backend automatically.
 *
 * Usage: node scripts/generate-msw-handlers.ts /tmp/openapi.json
 */

import fs from 'fs';
import path from 'path';

interface OpenAPISpec {
  paths: {
    [path: string]: {
      [method: string]: {
        operationId?: string;
        summary?: string;
        responses: {
          [status: string]: {
            description: string;
            content?: {
              'application/json'?: {
                schema?: unknown;
              };
            };
          };
        };
        parameters?: Array<{
          name: string;
          in: string;
          required?: boolean;
          schema?: { type: string };
        }>;
        requestBody?: {
          content?: {
            'application/json'?: {
              schema?: unknown;
            };
          };
        };
      };
    };
  };
}

function parseOpenAPISpec(specPath: string): OpenAPISpec {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  return spec;
}

function getMethodName(method: string): string {
  const methodMap: Record<string, string> = {
    get: 'get',
    post: 'post',
    put: 'put',
    patch: 'patch',
    delete: 'delete',
  };
  return methodMap[method.toLowerCase()] || method;
}

function convertPathToMSWPattern(path: string): string {
  // Convert OpenAPI path params {id} to MSW params :id
  return path.replace(/\{([^}]+)\}/g, ':$1');
}

function shouldSkipEndpoint(path: string, method: string): boolean {
  // Skip health check and root endpoints
  if (path === '/' || path === '/health') return true;

  // Skip OAuth endpoints (handled by regular login)
  if (path.includes('/oauth')) return true;

  return false;
}

function getHandlerCategory(path: string): 'auth' | 'users' | 'admin' | 'organizations' {
  if (path.startsWith('/api/v1/auth')) return 'auth';
  if (path.startsWith('/api/v1/admin')) return 'admin';
  if (path.startsWith('/api/v1/organizations')) return 'organizations';
  return 'users';
}

function generateMockResponse(path: string, method: string, operation: any): string {
  const category = getHandlerCategory(path);

  // Auth endpoints
  if (category === 'auth') {
    if (path.includes('/login') && method === 'post') {
      return `
    const body = (await request.json()) as any;
    const user = validateCredentials(body.email, body.password);

    if (!user) {
      return HttpResponse.json(
        { detail: 'Incorrect email or password' },
        { status: 401 }
      );
    }

    const accessToken = \`demo-access-\${user.id}-\${Date.now()}\`;
    const refreshToken = \`demo-refresh-\${user.id}-\${Date.now()}\`;

    setCurrentUser(user);

    return HttpResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'bearer',
      expires_in: 900,
    });`;
    }

    if (path.includes('/register') && method === 'post') {
      return `
    const body = (await request.json()) as any;

    const newUser = {
      id: \`new-user-\${Date.now()}\`,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name || null,
      phone_number: body.phone_number || null,
      is_active: true,
      is_superuser: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null,
      organization_count: 0,
    };

    setCurrentUser(newUser);

    return HttpResponse.json({
      user: newUser,
      access_token: \`demo-access-\${Date.now()}\`,
      refresh_token: \`demo-refresh-\${Date.now()}\`,
      token_type: 'bearer',
      expires_in: 900,
    });`;
    }

    if (path.includes('/refresh') && method === 'post') {
      return `
    return HttpResponse.json({
      access_token: \`demo-access-refreshed-\${Date.now()}\`,
      refresh_token: \`demo-refresh-refreshed-\${Date.now()}\`,
      token_type: 'bearer',
      expires_in: 900,
    });`;
    }

    // Generic auth success
    return `
    return HttpResponse.json({
      success: true,
      message: 'Operation successful',
    });`;
  }

  // User endpoints
  if (category === 'users') {
    if (path === '/api/v1/users/me' && method === 'get') {
      return `
    if (!currentUser) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }
    return HttpResponse.json(currentUser);`;
    }

    if (path === '/api/v1/users/me' && method === 'patch') {
      return `
    if (!currentUser) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }
    const body = (await request.json()) as any;
    updateCurrentUser(body);
    return HttpResponse.json(currentUser);`;
    }

    if (path === '/api/v1/organizations/me' && method === 'get') {
      return `
    if (!currentUser) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }
    const orgs = getUserOrganizations(currentUser.id);
    return HttpResponse.json(orgs);`;
    }

    if (path === '/api/v1/sessions' && method === 'get') {
      return `
    if (!currentUser) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 });
    }
    return HttpResponse.json({ sessions: [] });`;
    }
  }

  // Admin endpoints
  if (category === 'admin') {
    const authCheck = `
    if (!currentUser?.is_superuser) {
      return HttpResponse.json({ detail: 'Admin access required' }, { status: 403 });
    }`;

    if (path === '/api/v1/admin/stats' && method === 'get') {
      return `${authCheck}
    return HttpResponse.json(adminStats);`;
    }

    if (path === '/api/v1/admin/users' && method === 'get') {
      return `${authCheck}
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '50');

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedUsers = sampleUsers.slice(start, end);

    return HttpResponse.json({
      data: paginatedUsers,
      pagination: {
        total: sampleUsers.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(sampleUsers.length / pageSize),
        has_next: end < sampleUsers.length,
        has_prev: page > 1,
      },
    });`;
    }

    if (path === '/api/v1/admin/organizations' && method === 'get') {
      return `${authCheck}
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '50');

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedOrgs = sampleOrganizations.slice(start, end);

    return HttpResponse.json({
      data: paginatedOrgs,
      pagination: {
        total: sampleOrganizations.length,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(sampleOrganizations.length / pageSize),
        has_next: end < sampleOrganizations.length,
        has_prev: page > 1,
      },
    });`;
    }
  }

  // Generic success response
  return `
    return HttpResponse.json({
      success: true,
      message: 'Operation successful'
    });`;
}

function generateHandlers(spec: OpenAPISpec): string {
  const handlers: string[] = [];
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  for (const [pathPattern, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        continue;
      }

      if (shouldSkipEndpoint(pathPattern, method)) {
        continue;
      }

      const mswPath = convertPathToMSWPattern(pathPattern);
      const httpMethod = getMethodName(method);
      const summary = operation.summary || `${method.toUpperCase()} ${pathPattern}`;
      const mockResponse = generateMockResponse(pathPattern, method, operation);

      const handler = `
  /**
   * ${summary}
   */
  http.${httpMethod}(\`\${API_BASE_URL}${mswPath}\`, async ({ request, params }) => {
    await delay(NETWORK_DELAY);
    ${mockResponse}
  }),`;

      handlers.push(handler);
    }
  }

  return handlers.join('\n');
}

function generateHandlerFile(spec: OpenAPISpec): string {
  const handlersCode = generateHandlers(spec);

  return `/**
 * Auto-generated MSW Handlers
 *
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 *
 * This file is automatically generated from the OpenAPI specification.
 * To regenerate: npm run generate:api
 *
 * For custom handler behavior, use src/mocks/handlers/overrides.ts
 *
 * Generated: ${new Date().toISOString()}
 */

import { http, HttpResponse, delay } from 'msw';
import {
  validateCredentials,
  setCurrentUser,
  updateCurrentUser,
  currentUser,
  sampleUsers,
} from '../data/users';
import {
  sampleOrganizations,
  getUserOrganizations,
  getOrganizationMembersList,
} from '../data/organizations';
import { adminStats } from '../data/stats';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const NETWORK_DELAY = 300; // ms - simulate realistic network delay

/**
 * Auto-generated request handlers
 * Covers all endpoints defined in OpenAPI spec
 */
export const generatedHandlers = [${handlersCode}
];
`;
}

// Main execution
function main() {
  const specPath = process.argv[2] || '/tmp/openapi.json';

  if (!fs.existsSync(specPath)) {
    console.error(`❌ OpenAPI spec not found at: ${specPath}`);
    console.error('   Make sure backend is running and OpenAPI spec is available');
    process.exit(1);
  }

  console.log('📖 Reading OpenAPI specification...');
  const spec = parseOpenAPISpec(specPath);

  console.log('🔨 Generating MSW handlers...');
  const handlerCode = generateHandlerFile(spec);

  const outputPath = path.join(__dirname, '../src/mocks/handlers/generated.ts');
  fs.writeFileSync(outputPath, handlerCode);

  console.log(`✅ Generated MSW handlers: ${outputPath}`);
  console.log(`📊 Generated ${Object.keys(spec.paths).length} endpoint handlers`);
}

main();
