import { AppDataSource } from '../src/data-source';

/**
 * MB-I4 dev-DB hygiene: performance-test runs create real `patients` rows
 * (id/mrn prefixed `perf-`/`PERF-`, e.g. perf-walkin-chest-pain-1-mrycwz5i /
 * PERF-444992) that are never cleaned up afterward. Confirmed 2026-08-12:
 * 51 such rows sitting in the dev SQLite DB since a 2026-07-24 load-test
 * run, all still in an active `Triage`/`Waiting` state, so every
 * wait-time/queue-length calculation across the Whiteboard, Triage queue,
 * and Charge Nurse strip that reads live patient state was including
 * patients "waiting" for 400-500+ hours -- the "407h waits" this backlog
 * item is named for.
 *
 * Scope is deliberately narrow: only rows whose id AND mrn both carry the
 * unambiguous `perf`/`PERF` fixture-naming convention are touched. A
 * broader same-timeframe batch of real-shaped `patient-<timestamp>-...` ids
 * from the same load-test window was found alongside these but is NOT
 * unambiguously fixture data by naming alone (that id shape is also used by
 * genuinely-created patients), so it is left untouched here -- see MB-I4's
 * backlog entry.
 *
 * The `olderThanHours` guard exists so this is safe to run at any time,
 * including while a performance test is actively in progress: it only ever
 * removes perf-* rows old enough that no live test run still depends on
 * them, defaulting to 6 hours (well past any single load-test run's
 * duration in this repo's existing perf scripts).
 */
const DEFAULT_OLDER_THAN_HOURS = 6;

async function main() {
  const olderThanHours = Number(process.env.PURGE_OLDER_THAN_HOURS) || DEFAULT_OLDER_THAN_HOURS;
  const dryRun = process.argv.includes('--dry-run');
  const cutoffIso = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

  await AppDataSource.initialize();
  try {
    const stale: Array<{ id: string; mrn: string; arrivalTime: string }> = await AppDataSource.query(
      `SELECT id, mrn, arrivalTime FROM patients
       WHERE id LIKE 'perf-%' AND mrn LIKE 'PERF-%' AND arrivalTime < ?`,
      [cutoffIso],
    );

    if (stale.length === 0) {
      console.log(`No stale perf-* fixture patients older than ${olderThanHours}h found.`);
      return;
    }

    console.log(`Found ${stale.length} stale perf-* fixture patient(s) older than ${olderThanHours}h:`);
    for (const row of stale) {
      console.log(`  ${row.id} (${row.mrn}), arrived ${row.arrivalTime}`);
    }

    if (dryRun) {
      console.log('Dry run -- no rows deleted. Re-run without --dry-run to delete.');
      return;
    }

    const ids = stale.map((row) => row.id);
    const placeholders = ids.map(() => '?').join(',');
    await AppDataSource.query(`DELETE FROM patients WHERE id IN (${placeholders})`, ids);
    console.log(`Deleted ${ids.length} stale perf-* fixture patient(s).`);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  console.error('purge-stale-fixture-patients failed:', error);
  process.exitCode = 1;
});
