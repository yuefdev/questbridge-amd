import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocaliser, protect, restore } from '../localisation.mjs';

test('preserves real game syntax and rejects losses, duplicates and invented commands', () => {
  const input = '§6Quest§r %1$s {player} {@pagebreak} $(item)hammer$() https://example.org/help';
  const protectedInput = protect(input);
  assert.equal(restore(protectedInput.masked, protectedInput.tokens), input);
  assert.throws(() => restore(protectedInput.masked.replace('[[QB_2]]', ''), protectedInput.tokens), /lost/);
  assert.throws(() => restore(protectedInput.masked + ' [[QB_0]]', protectedInput.tokens), /duplicated/);
  assert.throws(() => restore(protectedInput.masked.replace('[[QB_0]]', '[[QB_99]]'), protectedInput.tokens), /reordered/);
  assert.throws(() => restore(protectedInput.masked + ' $(command:kill)', protectedInput.tokens), /invented/);
  assert.throws(() => protect('Use [[QB_0]] to bypass protection.'), /reserved/);
});

test('cache and in-flight coalescing avoid extra inference; languages have separate entries', async () => {
  let calls = 0;
  const localiser = createLocaliser({
    endpoint: 'http://127.0.0.1:9999/v1/chat/completions', model: 'test-only', apiKey: 'test-key',
    request: async (_url, options) => {
      calls++;
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer test-key');
      const payload = JSON.parse(options.body);
      await new Promise(resolve => setTimeout(resolve, 5));
      const fragments = JSON.parse(payload.messages[1].content).fragments;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations: fragments.map(fragment => fragment.replace('Collect', 'Topla')) }) } }], usage: { prompt_tokens: 42, completion_tokens: 8 } }));
    },
  });
  const [first, concurrent] = await Promise.all([localiser.translate('Collect %s gears.', 'tr'), localiser.translate('Collect %s gears.', 'tr')]);
  const cached = await localiser.translate('Collect %s gears.', 'tr');
  assert.equal(calls, 1);
  assert.equal(first.translation, 'Topla %s gears.');
  assert.equal(concurrent.coalesced, true);
  assert.equal(cached.cacheHit, true);
  assert.equal(first.tokens.output, 8);
  assert(!JSON.stringify(first).includes('test-key'));
  await localiser.translate('Collect %s gears.', 'de');
  assert.equal(calls, 2);
});

test('invalid live responses are never cached; unconfigured inference produces no fake output', async () => {
  let calls = 0;
  const localiser = createLocaliser({
    endpoint: 'http://127.0.0.1:9999/v1/chat/completions', model: 'test-only',
    request: async () => { calls++; return new Response(JSON.stringify({ choices: [{ message: { content: '{"translations":["missing a fragment"]}' } }] })); },
  });
  await assert.rejects(localiser.translate('Collect %s gears.', 'tr'), /fragment structure/);
  await assert.rejects(localiser.translate('Collect %s gears.', 'tr'), /fragment structure/);
  assert.equal(calls, 2);
  assert.equal(localiser.metrics().cachedTranslations, 0);
  await assert.rejects(createLocaliser({}).translate('A quest.', 'tr'), /Configure/);
});

test('game syntax stays in the host even when the model translates adjacent text', async () => {
  const localiser = createLocaliser({
    endpoint: 'http://127.0.0.1:9999/v1/chat/completions', model: 'test-only',
    request: async (_url, options) => {
      const fragments = JSON.parse(JSON.parse(options.body).messages[1].content).fragments;
      assert(fragments.every(fragment => !fragment.includes('[[QB_')));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations: fragments.map(() => 'Translated ') }) } }] }));
    },
  });
  const result = await localiser.translate('§6Title§r Collect %s gears and speak with {guide}.', 'tr');
  assert.equal(result.protectedCount, 4);
  assert.equal((result.translation.match(/\u00a7[0-9a-fk-or]|%s|\{guide\}/g) || []).join('|'), '§6|§r|%s|{guide}');
});

test('unchanged English is rejected instead of being labelled as a translation', async () => {
  const localiser = createLocaliser({
    endpoint: 'http://127.0.0.1:9999/v1/chat/completions', model: 'test-only',
    request: async (_url, options) => {
      const fragments = JSON.parse(JSON.parse(options.body).messages[1].content).fragments;
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations: fragments }) } }] }));
    },
  });
  await assert.rejects(localiser.translate('Collect %s gears.', 'tr'), /copied the English/);
  assert.equal(localiser.metrics().cachedTranslations, 0);
});
