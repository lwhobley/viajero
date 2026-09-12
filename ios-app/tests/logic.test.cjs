const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScript(relativePath, stubs = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const localRequire = (request) => request in stubs ? stubs[request] : require(request);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

const progressModule = loadTypeScript('lib/progress.ts', { './db': { getDatabase: async () => { throw new Error('database not used in unit tests'); } } });
const courseModule = loadTypeScript('constants/course.ts');

test('a repeated action cannot complete multiple lesson steps', () => {
  const first = progressModule.markStudyStep(progressModule.initialProgress, 'day-1', 1, 'scene', new Date(2026, 8, 12, 12));
  const repeated = progressModule.markStudyStep(first, 'day-1', 1, 'scene', new Date(2026, 8, 12, 13));
  assert.equal(repeated.completedTasks['day-1'], 1);
  assert.deepEqual(repeated.completedSteps['day-1'], ['scene']);
});

test('streak advances once on consecutive local calendar days', () => {
  const dayOne = progressModule.markStudyStep(progressModule.initialProgress, 'day-1', 1, 'scene', new Date(2026, 8, 12, 23, 30));
  const sameDay = progressModule.markStudyStep(dayOne, 'day-1', 1, 'phrases', new Date(2026, 8, 12, 23, 45));
  const dayTwo = progressModule.markStudyStep(sameDay, 'day-2', 2, 'scene', new Date(2026, 8, 13, 0, 15));
  assert.equal(dayOne.streak, 1);
  assert.equal(sameDay.streak, 1);
  assert.equal(dayTwo.streak, 2);
});

test('course supplies four relevant phrases per day and at least 100 unique targets', () => {
  const { course, phrases } = courseModule;
  assert.equal(course.length, 90);
  assert.equal(phrases.length, 360);
  assert.ok(new Set(phrases.map((phrase) => phrase.spanish)).size >= 100);
  const hotelDay = course.find((day) => day.unit === 'Hotels');
  const hotelPhrases = phrases.filter((phrase) => phrase.day === hotelDay.day);
  assert.equal(hotelPhrases.length, 4);
  assert.ok(hotelPhrases.every((phrase) => phrase.category === 'Hotels'));
});
