#!/usr/bin/env node
/**
 * CareDroid contrast audit — renders real pages and measures text contrast.
 *
 * Why a browser and not a CSS lint: the failures this repo actually gets are
 * cascade failures. A component authored for a dark surface gets rendered on a
 * light one and its colours are individually fine in the file they live in —
 * the public waiting-room display had 19 elements at 1.01:1 that way, with the
 * deterioration warning ("If your symptoms worsen…") invisible on an unattended
 * wall screen. Nothing static catches that; you have to render it.
 *
 * ALPHA COMPOSITING IS THE WHOLE TRICK. A first version of this read
 * `getComputedStyle(el).backgroundColor` and treated `rgba(194, 65, 12, 0.2)`
 * as opaque, which reported the sidebar's due-count badge at 1.37:1. Composited
 * over the surface behind it the badge is 5.28:1 — perfectly fine. An audit that
 * cries wolf gets switched off, so backgrounds are composited down the ancestor
 * chain until an opaque layer is found.
 *
 * Usage:
 *   npm run audit:contrast              # needs the dev server on :3000
 *   npm run audit:contrast -- --json    # machine-readable
 *
 * Exits non-zero if any text falls below 3:1 (the WCAG large-text floor —
 * below it nothing is readable at any size).
 */
import { chromium } from '@playwright/test';

const BASE = process.env.CONTRAST_BASE_URL || 'http://localhost:3000';
const JSON_OUT = process.argv.includes('--json');
const MIN_RATIO = 3;

/** [path, seeded role or null for public routes] */
const ROUTES = [
  ['/display/whiteboard', null],
  ['/emergency/whiteboard?display=readonly', 'read_only_viewer'],
  ['/emergency/whiteboard', 'physician'],
  ['/emergency/reception', 'physician'],
  ['/emergency/queues', 'nurse'],
  ['/emergency/ems', 'physician'],
  ['/emergency/capacity', 'physician'],
  ['/emergency/analytics', 'physician'],
  ['/emergency/alerts', 'physician'],
  ['/emergency/settings', 'admin'],
  ['/emergency/help', 'physician'],
  ['/trackmind', 'executive-leadership'],
  ['/trackmind-maturity', 'executive-leadership'],
  ['/platform-intelligence', 'executive-leadership'],
  ['/governance-registry', 'admin'],
];

const SCAN = (minRatio) => {
  const parse = (c) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    return m
      ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
      : null;
  };
  const over = (fg, bg) => ({
    r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
    a: 1,
  });
  const lum = (c) => {
    const v = [c.r, c.g, c.b].map((x) => {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) =>
    +((Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)).toFixed(2);

  /** Composite every translucent layer from the element up to an opaque one. */
  const effectiveBackground = (el) => {
    const layers = [];
    let node = el;
    while (node) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a === 1) break;
      }
      node = node.parentElement;
    }
    if (!layers.length) return { r: 255, g: 255, b: 255, a: 1 };
    let base = layers[layers.length - 1];
    if (base.a < 1) base = over(base, { r: 255, g: 255, b: 255, a: 1 });
    for (let i = layers.length - 2; i >= 0; i -= 1) base = over(layers[i], base);
    return base;
  };

  const findings = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!el.textContent || !el.textContent.trim()) continue;
    if (el.children.length) continue; // leaf text nodes only
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    const fg = parse(s.color);
    if (!fg) continue;
    const bg = effectiveBackground(el);
    const composedFg = fg.a < 1 ? over(fg, bg) : fg;
    const cr = ratio(composedFg, bg);
    if (cr < minRatio) {
      findings.push({
        selector: (el.className || '').toString().slice(0, 60) || el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 40),
        color: s.color,
        background: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
        ratio: cr,
      });
    }
  }
  const seen = new Set();
  return findings
    .filter((f) => {
      const k = f.selector + f.color + f.background;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.ratio - b.ratio);
};

const browser = await chromium.launch();
const report = [];
let failures = 0;

for (const [route, role] of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();
  if (role) {
    await page.addInitScript((r) => {
      localStorage.setItem('caredroid_access_token', 'contrast-audit');
      localStorage.setItem(
        'caredroid_user_profile',
        JSON.stringify({
          id: 'contrast-audit',
          email: 'audit@caredroid.local',
          name: 'Contrast Audit',
          role: r,
          fullName: 'Contrast Audit',
          isEmailVerified: true,
          twoFactorEnabled: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          authMode: 'explicit-dev-bypass',
          isDevAuthBypass: true,
        }),
      );
    }, role);
  }
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(9000);
    const found = await page.evaluate(SCAN, MIN_RATIO);
    failures += found.length;
    report.push({ route, role, findings: found });
    if (!JSON_OUT) {
      console.log(`${route.padEnd(44)} ${String(found.length).padStart(3)} below ${MIN_RATIO}:1`);
      for (const f of found.slice(0, 5)) {
        console.log(`      ${String(f.ratio).padStart(5)}  ${f.color} on ${f.background}  ${f.selector}`);
        console.log(`             ${JSON.stringify(f.text)}`);
      }
    }
  } catch (error) {
    const message = String(error.message).split('\n')[0].slice(0, 80);
    report.push({ route, role, error: message });
    if (!JSON_OUT) console.log(`${route.padEnd(44)} ERROR ${message}`);
  }
  await context.close();
}
await browser.close();

if (JSON_OUT) {
  console.log(JSON.stringify({ minRatio: MIN_RATIO, failures, report }, null, 2));
} else {
  console.log(`\n${failures} text element(s) below ${MIN_RATIO}:1 across ${ROUTES.length} routes.`);
  if (failures) {
    console.log('\nEach one is text nobody can read. Fix the colour at its source —');
    console.log('a component authored for the wrong surface, usually — not with an override.');
  }
}

process.exit(failures ? 1 : 0);
