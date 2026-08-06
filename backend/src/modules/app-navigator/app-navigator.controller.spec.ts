import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppNavigatorController } from './app-navigator.controller';
import type { AppNavigatorService } from './app-navigator.service';

describe('AppNavigatorController', () => {
  let controller: AppNavigatorController;
  let service: {
    getHealth: jest.Mock;
    getCatalog: jest.Mock;
    query: jest.Mock;
  };

  beforeEach(() => {
    service = {
      getHealth: jest.fn(() => ({ ok: true, documents: 42, catalogCommit: 'abc123', groqConfigured: false })),
      getCatalog: jest.fn(() => ({ generatedAt: '2026-08-06T00:00:00.000Z', records: [] })),
      query: jest.fn(async () => ({ query: 'x', answer: 'y', source: 'catalog', providerError: null, destinations: [] })),
    };
    controller = new AppNavigatorController(service as unknown as AppNavigatorService);
  });

  it('health() returns the service result directly', () => {
    expect(controller.health()).toEqual(service.getHealth());
  });

  it('catalog() returns the service result directly', () => {
    expect(controller.catalog()).toEqual(service.getCatalog());
  });

  it('query() forwards the DTO query string to the service', async () => {
    const result = await controller.query({ query: 'where do I manage ambulances?' });
    expect(service.query).toHaveBeenCalledWith('where do I manage ambulances?');
    expect(result).toEqual(await service.query.mock.results[0].value);
  });
});

describe('AppNavigatorController — auth', () => {
  it('requires JWT auth on the controller (no PHI, so no AuthorizationGuard needed)', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AppNavigatorController) || [];
    expect(guards.length).toBe(1);
    expect(typeof guards[0]).toBe('function');
  });

  it('query is rate-limited via ThrottlerGuard', () => {
    const handler = AppNavigatorController.prototype.query;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
    expect(guards).toContain(ThrottlerGuard);
  });
});
