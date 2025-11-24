/**
 * MSW Handlers Index
 *
 * Combines auto-generated handlers with custom overrides.
 *
 * Architecture:
 * - generated.ts: Auto-generated from OpenAPI spec (DO NOT EDIT)
 * - overrides.ts: Custom handler logic (EDIT AS NEEDED)
 *
 * Overrides take precedence over generated handlers.
 */

import { generatedHandlers } from './generated';
import { overrideHandlers } from './overrides';

/**
 * All request handlers for MSW
 *
 * Order matters: overrides come first to take precedence
 */
export const handlers = [...overrideHandlers, ...generatedHandlers];
