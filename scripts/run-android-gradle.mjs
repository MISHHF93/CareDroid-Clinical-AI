import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const task = process.argv[2];

if (!task) {
  console.error('Usage: node scripts/run-android-gradle.mjs <gradle-task>');
  process.exit(1);
}

const gradleExecutable = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const androidDir = join(process.cwd(), 'android');
const env = { ...process.env };

if (process.platform === 'win32' && !env.ANDROID_HOME && env.LOCALAPPDATA) {
  const defaultSdkPath = join(env.LOCALAPPDATA, 'Android', 'Sdk');
  if (existsSync(defaultSdkPath)) {
    env.ANDROID_HOME = defaultSdkPath;
    env.ANDROID_SDK_ROOT = defaultSdkPath;
  }
}

const result = spawnSync(gradleExecutable, [task], {
  cwd: androidDir,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
