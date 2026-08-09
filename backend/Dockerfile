# Build context is the REPOSITORY ROOT, not this directory -- see
# docker-compose.app.yml's and docker-compose.yml's `backend` services
# (context: ., dockerfile: backend/Dockerfile) and
# .github/workflows/ci-cd.yml's `build` job (context: ., file:
# backend/Dockerfile). backend/tsconfig.build.json's `rootDir: ".."` means
# this build genuinely needs the sibling lib/ and src/ directories present
# inside the image -- a context scoped to ./backend alone cannot provide
# them, since Docker COPY can never reach outside its build context no
# matter what path a Dockerfile asks for. See Dockerfile.dockerignore
# (next to this file) for the excludes specific to this build; the repo
# root's own .dockerignore excludes `backend` entirely, which is correct for
# the frontend's root Dockerfile but would break this one.
FROM node:20-alpine AS builder

WORKDIR /app

# Backend has its own package.json/lockfile, distinct from the root
# frontend one -- copied first so dependency installation is cached
# separately from source changes.
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

# Shared files under lib/ and src/ (e.g. src/types/workspaceContracts.ts)
# import root-level frontend dependencies like zod -- real backend
# dependencies too (backend/package.json), but Node's module resolution
# walks up from the IMPORTING file's own directory, not from wherever npm
# ci ran, so backend/node_modules is never on that walk for a file living
# at /app/lib/* or /app/src/*. Symlinking node_modules up to their true
# shared ancestor (/app) makes it resolve the same way it does in the real
# repo, where /app would be the repo root.
RUN ln -s /app/backend/node_modules /app/node_modules

# Backend's own source, plus the shared directories backend code actually
# reaches into via ../-relative imports. Copying all of src/ (not just
# src/types/, which is all tsconfig.build.json's own include list names)
# is deliberate: backend code was found importing from src/config/,
# src/services/, src/utils/, and src/engine/ too, not just src/types/ --
# enumerating each one individually already proved fragile once (a build
# that only copied src/types/ failed on 8 other src/ subdirectories,
# caught by simulating this exact build before trusting it). src/ is ~24MB
# against node_modules' ~1GB, and none of it survives past the builder
# stage into the final image regardless.
COPY backend ./backend
COPY lib ./lib
COPY src ./src

WORKDIR /app/backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm ci --only=production

# tsconfig.build.json's rootDir/outDir already lay this out at
# dist/backend/src/main.js, dist/lib/**, dist/src/types/** -- matching
# backend/package.json's own start:prod script exactly.
COPY --from=builder /app/backend/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application (matches backend/package.json start:prod)
CMD ["node", "dist/backend/src/main.js"]
