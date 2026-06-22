import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const stateFile = path.join(dataDir, 'state.json');

// Epoch ms of the last successful run, or null on first run.
export function getLastRun() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastRun ?? null;
  } catch {
    return null;
  }
}

export function setLastRun(ts) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ lastRun: ts }, null, 2));
}
