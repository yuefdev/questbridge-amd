import { cpus, platform, release } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const origin = 'http://127.0.0.1:4186';
const auth = process.env.DEMO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.DEMO_ACCESS_TOKEN}` } : {};
const examples = [
  { name: 'forest', text: '§6The Clockwork Forest§r\nCollect %s copper gears and speak to {guide}. Read $(l:quests/forest)the field journal$() before opening the gate.' },
  { name: 'forge', text: '§bA Forge for Everyone§r\nCraft %1$s with {helper}. {@pagebreak}Keep the $(item)copper hammer$() in your inventory; visit https://example.org/quest-notes for the next step.' },
];
const before = await (await fetch(`${origin}/api/status`, { headers: auth })).json();
if (!before.configured) throw new Error('Live inference is not configured.');
const records = [];

async function run(example, language, repeat = false) {
  const started = performance.now();
  const response = await fetch(`${origin}/api/translate`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: example.text, language }), signal: AbortSignal.timeout(100000),
  });
  const output = await response.json();
  records.push({ example: example.name, source: example.text, language, repeat, status: response.status, requestMs: Math.round(performance.now() - started), output });
}
for (const example of examples) {
  await run(example, 'tr');
  await run(example, 'de');
}
await run(examples[1], 'de', true);
const after = await (await fetch(`${origin}/api/status`, { headers: auth })).json();
const evidence = {
  recordedAt: new Date().toISOString(),
  workstation: { processor: cpus()[0]?.model, platform: platform(), release: release() },
  model: before.model,
  methodology: 'Two original quest texts, Turkish and German, sequential non-streaming live model requests; repeat forge/German input to inspect cache. No mocks in this recording. HTTP 200 proves format acceptance only, not translation correctness.',
  qualityScope: 'Syntax-preservation checks only. Translation fluency and correctness require human review. Single-run timings, not a comparative hardware benchmark.',
  before, records, after,
};
const filename = `run-${evidence.recordedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`;
await writeFile(new URL(`./evidence/${filename}`, import.meta.url), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ evidenceFile: `evidence/${filename}`, processor: evidence.workstation.processor, model: evidence.model, accepted: records.filter(r => r.status === 200).length, rejected: records.filter(r => r.status !== 200).length, repeatCacheHit: records.at(-1).output.cacheHit === true, metrics: after.metrics }, null, 2));
if (records.some(r => r.status !== 200) || records.at(-1).output.cacheHit !== true) process.exitCode = 1;
