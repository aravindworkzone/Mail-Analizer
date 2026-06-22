import 'dotenv/config';
import readline from 'node:readline';
import cron from 'node-cron';
import { runDailyJob } from './job.js';
import { log } from './util/logger.js';

const schedule = process.env.CRON_SCHEDULE || '0 8 * * *';

if (!cron.validate(schedule)) {
  console.error(`Invalid CRON_SCHEDULE: "${schedule}"`);
  process.exit(1);
}

// Single-flight guard so a manual trigger can't overlap a scheduled run.
let running = false;
async function run(source) {
  if (running) {
    log(`Trigger from ${source} ignored — a run is already in progress.`);
    return;
  }
  running = true;
  log(`Run triggered (${source}).`);
  try {
    await runDailyJob();
  } catch (err) {
    log('Daily run failed: ' + (err.stack || err.message));
  } finally {
    running = false;
  }
}

log(`Mail Analyzer started. Schedule: "${schedule}" (TZ: ${process.env.TZ || 'system'}).`);
log('Manual trigger: type "run" (or "daily email") and press Enter. Type "quit" to exit.');

// Scheduled trigger.
cron.schedule(schedule, () => run('schedule'));

// Manual trigger via terminal input.
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const cmd = line.trim().toLowerCase();
  if (cmd === '' || cmd === 'run' || cmd === 'daily' || cmd === 'daily email') {
    run('manual');
  } else if (cmd === 'quit' || cmd === 'exit') {
    rl.close();
    process.exit(0);
  } else {
    log(`Unknown command "${line.trim()}". Type "run" to trigger now, "quit" to exit.`);
  }
});

if (process.env.RUN_ON_START === 'true') {
  log('RUN_ON_START=true — running once now.');
  run('startup');
}
