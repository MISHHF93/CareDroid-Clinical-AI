import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const task = process.argv[2];

if (!task) {
  console.error('Usage: node scripts/run-android-gradle.mjs <gradle-task>');
  process.exit(1);
}

const gradleExecutable = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const androidDir = join(process.cwd(), 'android');
const result = spawnSync(gradleExecutable, [task], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
