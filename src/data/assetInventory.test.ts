import { describe, expect, it } from 'vitest';
import { CANONICAL_APP_ROUTE_TREE, ROUTE_RECORDS } from '../config/routes.config';
import { LEGACY_DASHBOARD_REDIRECTS } from '../config/edOperatingSurface.config';
import { QUICK_COMMAND_DESTINATION_ITEMS } from '../config/navigation.config';
import {
  buildAssetInventoryProjection,
  buildNavigationMountProjection,
  buildRouteOwnershipProjection,
  CANONICAL_WORKSPACE_IDS,
  SAAS_PRODUCTS,
} from './assetInventory';
import { getUserFacingToolInventory } from './toolInventory';

describe('mounted SaaS asset inventory projection', () => {
  const assets = buildAssetInventoryProjection();
  const byId = new Map(assets.map((asset) => [asset.id, asset]));

  it('mounts every user-facing tool as an asset with SaaS layer metadata', () => {
    const userFacingIds = getUserFacingToolInventory().map((tool) => tool.id);

    expect(assets.length).toBe(userFacingIds.length);
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);

    for (const id of userFacingIds) {
      const asset = byId.get(id);
      expect(asset, id).toBeTruthy();
      if (!asset) throw new Error(`expected asset ${id} to be mounted`);
      expect(asset.productIds.length, `${id} productIds`).toBeGreaterThan(0);
      expect(asset.packIds.length, `${id} packIds`).toBeGreaterThan(0);
      expect(asset.workspaceIds.length, `${id} workspaceIds`).toBeGreaterThan(0);
      expect(asset.roleIds.length, `${id} roleIds`).toBeGreaterThan(0);
      expect(asset.layers.asset, `${id} layer asset`).toBe(id);
      expect(asset.layers.products.length, `${id} layer products`).toBeGreaterThan(0);
      expect(asset.governance.validationStatus, `${id} governance validation`).toBeTruthy();
      expect(asset.execution.supportStatus, `${id} execution support`).toMatch(
        /backend-backed|local-deterministic|ai-assisted|demo-only|unsupported/
      );
      expect(asset.evidence.backendStatus, `${id} evidence backend`).toBe(asset.execution.supportStatus);
    }
  });

  it('places representative capabilities in the expected SaaS layer chain', () => {
    expect(byId.get('qsofa')).toMatchObject({
      packIds: expect.arrayContaining(['emergency-medicine']),
      productIds: expect.arrayContaining(['product-emergency-department']),
    });
    expect(byId.get('hospital-map')).toMatchObject({
      packIds: expect.arrayContaining(['hospital-operations', 'digital-twin-pack']),
      productIds: expect.arrayContaining(['product-hospital-operations']),
    });
    expect(assets.some((asset) => asset.packIds.includes('medical-iot-pack'))).toBe(true);
    expect(assets.some((asset) => asset.productIds.includes('product-medical-iot'))).toBe(true);
    expect(byId.get('simulation-suite')).toMatchObject({
      packIds: expect.arrayContaining(['simulation-training-pack']),
      productIds: expect.arrayContaining(['product-simulation-training']),
    });
    expect(byId.get('clinical-audit')).toMatchObject({
      packIds: expect.arrayContaining(['governance-compliance-pack']),
      productIds: expect.arrayContaining(['product-governance']),
    });
  });

  it('keeps route ownership explicit for assets and system/admin purposes', () => {
    const ownership = buildRouteOwnershipProjection({ assets });
    const unowned = ownership.filter((route) => route.ownerType === 'unowned');

    expect(ownership).toHaveLength(ROUTE_RECORDS.length);
    expect(unowned).toEqual([]);
    expect(ownership.find((route) => route.path === '/hospital-map')?.ownerType).not.toBe(
      'unowned'
    );
    expect(ownership.find((route) => route.path === '/products')?.ownerType).toMatch(
      /system|documented-system/
    );
  });

  it('keeps quick command destinations scoped to the active CareDroid route surface', () => {
    const mountedNav = buildNavigationMountProjection();
    const commandPaths = new Set(QUICK_COMMAND_DESTINATION_ITEMS.map((item) => item.path));
    const knownRoutePaths = new Set([
      ...ROUTE_RECORDS.map((route) => route.path),
      ...CANONICAL_APP_ROUTE_TREE.map((route) => route.path),
      ...Object.keys(LEGACY_DASHBOARD_REDIRECTS),
    ]);

    // Most quick commands stay within the emergency workflow surface, but a few
    // (audit, AI command center, admin) intentionally point at top-level platform
    // routes — require every destination to be a real, mounted route, or a
    // documented legacy redirect, either way.
    expect(
      [...commandPaths].every((path) => path.startsWith('/emergency/') || knownRoutePaths.has(path))
    ).toBe(true);
    expect(commandPaths.size).toBe(QUICK_COMMAND_DESTINATION_ITEMS.length);
    expect(new Set(mountedNav.map((item) => `${item.section}:${item.id}`)).size).toBe(
      mountedNav.length
    );
  });

  it('declares the expected product and workspace taxonomy', () => {
    expect(SAAS_PRODUCTS.map((product) => product.id)).toEqual(
      expect.arrayContaining([
        'product-emergency-department',
        'product-hospital-operations',
        'product-medical-iot',
        'product-simulation-training',
        'product-governance',
        'product-research',
      ])
    );
    expect(CANONICAL_WORKSPACE_IDS).toEqual(
      expect.arrayContaining([
        'emergency',
        'icu',
        'laboratory',
        'operations',
        'fleet',
        'medical-iot',
        'education',
        'governance',
      ])
    );
  });
});
