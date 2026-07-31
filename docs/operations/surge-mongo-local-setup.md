# Running SurgeCapacityService against a real MongoDB

`SurgeCapacityService` (`backend/src/services/surge-capacity.service.ts`) is real,
Mongoose-backed mass-casualty/disaster-surge logic exposed via `SurgeController`
(`backend/src/modules/surge/`, always mounted at `/api/emergency/surge/*`). It
requires a live MongoDB connection to do anything beyond return a clean `503`.

**No MongoDB is provisioned in this repo by default** — confirmed by inspecting
`docker-compose.yml`/`docker-compose.app.yml` (no `mongo` service in either) and
every `.env*` file (no `MONGODB_URI` documented anywhere before Cycle 243). This
doc is the honest, reproducible path to getting one, for whoever picks this up
next in an environment that isn't sandboxed the way this one is (see the note at
the bottom).

## 1. Run the test suite against an ephemeral, real MongoDB

This is the fastest, fully-reproducible path — `mongodb-memory-server` (added as
a devDependency in Cycle 245) downloads and spawns a real MongoDB binary
in-process for the test run. No Docker, no manual setup, no persistent state.

```bash
cd backend
npm run test:mongo
```

This runs `src/services/surge-capacity.service.mongo-spec.ts` (11 cases covering
`activateSurgeMode`, `batchEMSIntake`, `assessResourceBottlenecks`,
`deactivateSurgeMode`, and `getCurrentSurgeStatus`) against genuine MongoDB
behavior — real collection inserts, `$set` updates, and sort-by-date queries, not
a mock of Mongoose's API.

**This is deliberately excluded from the default `npm test` run** — the
`.mongo-spec.ts` suffix and the dedicated `test/jest-mongo.json` config exist so
an environment that can't run it (see below) doesn't silently break every other
test suite's "full run green" status. Run it explicitly via `test:mongo`.

## 2. Live-boot the real API surface against a real MongoDB

To manually exercise `/api/emergency/surge/*` end-to-end (not just the service
layer), you need a running `mongod` the backend can connect to.

**Start a local MongoDB via Docker** (the repo's own `docker-compose.yml` has no
`mongo` service, so run one standalone rather than editing the shared compose
file for a single-developer verification step):

```bash
docker run -d --name caredroid-surge-mongo -p 27017:27017 mongo:7
```

**Configure the backend** (`backend/.env` or exported env vars):

```bash
ENABLE_MONGOOSE_EMERGENCY_OS=true
MONGODB_URI=mongodb://localhost:27017/caredroid
```

**Boot the backend** and confirm the Mongoose runtime actually connected — look
for `Mongoose CareDroid routes mounted under /api/* (...)` in the startup log
(see `registerEmergencyMongooseRuntime()`, `backend/src/main.ts:45-94` — this
only runs, and only logs that line, when both env vars above are set):

```bash
npm run build && npm run start:prod
```

**Exercise the real routes** (needs a real JWT with `ACTIVATE_SURGE_MODE` —
PHYSICIAN or ADMIN role; a dev-session bootstrap works the same way described in
`docs/SENTINEL_ENGINEERING_REPORT.md`'s verification section):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/dev-session | jq -r .accessToken)

curl -s -X POST http://localhost:3000/api/emergency/surge/activate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "type": "mci",
    "estimatedPatientCount": 10,
    "resourceStatus": {
      "traumaBedsAvailable": 6, "traumaBedsTotal": 10,
      "surgeonsAvailable": 4, "surgeonsTotal": 5,
      "anaesthetistsAvailable": 2, "anaesthetistsTotal": 3,
      "bloodUnitsAvailable": 18, "bloodUnitsTotal": 20,
      "ventilatorsAvailable": 5, "ventilatorsTotal": 6
    }
  }'

curl -s http://localhost:3000/api/emergency/surge/status -H "Authorization: Bearer $TOKEN"
```

A successful `activate` call returns a real `surgeEvent` with a `surge_...` id;
`status` should then report `active:true` with the same event.

**Tear down** when done:

```bash
docker stop caredroid-surge-mongo && docker rm caredroid-surge-mongo
```

## A note on why this doc exists instead of a completed verification

This runbook was written during Cycle 246 of the ongoing quality program
(`SCORECARD.md`) specifically because the sandbox that built it **cannot**
execute either path above: `mongodb-memory-server`'s downloaded `mongod` binary
is blocked by that environment's Application Control policy (confirmed three
independent ways — see `surge-capacity.service.mongo-spec.ts`'s header comment
for the full evidence trail), and Docker isn't installed there either. Neither
limitation is expected to apply in a normal CI runner or developer machine —
this doc's steps should work as written there. If you run them and something
here is wrong, that's real, actionable signal this sandbox couldn't produce;
please correct this doc rather than route around it silently.
