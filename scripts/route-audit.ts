import fs from 'fs';
import path from 'path';

const ALLOWED_ROUTES = [
  '/api/patients',
  '/api/whiteboard',
  '/api/journey',
  '/api/queues',
  '/api/ems',
  '/api/reassessment',
  '/api/capacity',
  '/api/copilot',
  '/api/intake',
  '/api/emergency/intake',
  '/api/auth',
  '/api/settings',
  '/api/settings/features',
];

const FORBIDDEN_PATTERNS = [
  '/api/icu',
  '/api/lab',
  '/api/research',
  '/api/education',
  '/api/fleet',
  '/api/iot',
  '/api/telemetry',
  '/api/digital-twin',
  '/api/governance',
  '/api/command-center',
];

function routeFromFile(file: string): string {
  const routeName = file.replace(/\.routes\.(ts|js)$/, '');
  if (routeName === 'smart-intake') return '/api/emergency/intake';
  return `/api/${routeName}`;
}

async function auditRoutes() {
  const routesDir = path.join(process.cwd(), 'backend', 'src', 'api');

  if (!fs.existsSync(routesDir)) {
    console.log('Routes directory not found - skipping audit');
    return;
  }

  const routeFiles = fs.readdirSync(routesDir).filter((file) => /\.routes\.(ts|js)$/.test(file));

  console.log('=== Route Audit ===\n');

  for (const file of routeFiles) {
    const fullRoute = routeFromFile(file);

    if (ALLOWED_ROUTES.includes(fullRoute)) {
      console.log(`ALLOWED: ${fullRoute} (${file})`);
      continue;
    }

    const isForbidden = FORBIDDEN_PATTERNS.some((pattern) => fullRoute.includes(pattern));
    if (isForbidden) {
      console.log(`FORBIDDEN - REMOVE: ${fullRoute} (${file})`);
    } else {
      console.log(`UNKNOWN: ${fullRoute} (${file}) - review if needed for Emergency OS`);
    }
  }

  console.log('\n=== Required Emergency Routes ===');
  ALLOWED_ROUTES.forEach((route) => {
    console.log(`  - ${route}`);
  });
}

auditRoutes().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
