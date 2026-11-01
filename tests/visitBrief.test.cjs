const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { createVisitBrief } = require('../lib/visitBrief.ts');
const t = (key) => key;
const now = new Date(2026, 0, 2, 12).getTime();
const med = { name:'Vitamin D', strength:'1000 IU', form:'Capsule', times:['08:00'], sample:false };
const vault = { meds: [med, { ...med, name: 'Demo drug', sample:true }], vitals: [
  { metric:'hr', value:70, at:now - 1000, context:'Resting', sample:false },
  { metric:'hr', value:80, at:now - 5000, sample:false },
  { metric:'bp', value:120, value2:80, at:now - 1000, sample:true },
  { metric:'spo2', value:98, at:now + 1000, sample:false },
] };
const brief = createVisitBrief(vault, t, { includeVitals:true, includeMeds:true, notes:'Ask about sleep', generatedAt:now });
assert.match(brief, /Vitamin D/); assert.match(brief, /hr: 70 bpm/); assert.match(brief, /Ask about sleep/);
assert.doesNotMatch(brief, /Demo drug|hr: 80|bp:|spo2:/);
const excluded = createVisitBrief(vault, t, { includeVitals:false, includeMeds:false, notes:'', generatedAt:now });
assert.doesNotMatch(excluded, /Vitamin D|hr:|brief_questions/);
const empty = createVisitBrief({ meds:[], vitals:[] }, t, { includeVitals:true, includeMeds:true, notes:'', generatedAt:now });
assert.match(empty, /brief_no_vitals/); assert.match(empty, /brief_no_medicines/);
console.log('Visit brief privacy, sample exclusion, sorting, consent and empty-state tests passed');
