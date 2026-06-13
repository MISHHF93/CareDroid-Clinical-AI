// Compatibility wrapper. The canonical AI client, model, and transport live in
// src/lib/ai/client.ts so browser imports never receive provider credentials.
export * from '../../src/lib/ai/client';
export { default } from '../../src/lib/ai/client';
