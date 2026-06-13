import { Router } from 'express';

interface PlaceholderRouteOptions {
  path: string;
  version: 'v1';
  description: string;
}

export function createPlaceholderRoute({ path, version, description }: PlaceholderRouteOptions) {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({
      path,
      version,
      description,
      status: 'available-unimplemented',
      message: `${description} is registered for discovery, but a dedicated Express implementation is not available yet.`,
    });
  });

  router.get('/health', (_req, res) => {
    res.json({
      path,
      version,
      status: 'available-unimplemented',
    });
  });

  return router;
}
