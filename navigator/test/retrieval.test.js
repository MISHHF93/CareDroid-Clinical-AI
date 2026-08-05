import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildIndex, fallbackAnswer, groundingPrompt, retrieve } from '../src/retrieval.js';

const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const index = buildIndex(catalog.records);

test('catalog contains canonical CareDroid routes', () => {
  assert.ok(index.length > 20);
  assert.ok(index.every((entry) => entry.path.startsWith('/')));
});

test('ambulance arrival questions resolve to EMS', () => {
  const hits = retrieve(index, 'Where do I manage incoming ambulance arrivals?');
  assert.equal(hits[0].path, '/emergency/ems');
});

test('bed pressure questions retrieve capacity', () => {
  const hits = retrieve(index, 'show bed occupancy and boarding pressure');
  assert.ok(hits.some((hit) => hit.path === '/emergency/capacity'));
});

test('unknown requests never manufacture routes', () => {
  const hits = retrieve(index, 'quantum banana orchestra');
  assert.deepEqual(hits, []);
  assert.match(fallbackAnswer('quantum banana orchestra', hits), /could not map/i);
});

test('LLM prompt contains closed route evidence', () => {
  const hits = retrieve(index, 'open reception');
  const prompt = groundingPrompt('open reception', hits);
  assert.match(prompt, /Never invent a route/);
  assert.match(prompt, /route=\/emergency\/reception/);
});
