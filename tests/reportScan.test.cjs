const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (m, filename) => m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { parseReportReading } = require('../lib/reportScan.ts');
assert.deepEqual(parseReportReading('{"metric":"bp","value":120,"value2":80,"unit":"mmHg"}'), { metric:'bp', value:'120', value2:'80' });
assert.deepEqual(parseReportReading('```json\n{"metric":"glucose","value":110,"unit":"mg/dL"}\n```'), { metric:'glucose', value:'110' });
for (const data of [
  '{"metric":"glucose","value":6,"unit":"mmol/L"}',
  '{"metric":"bp","value":100,"value2":110,"unit":"mmHg"}',
  '{"metric":"spo2","value":101,"unit":"%"}',
  '{"metric":"hr","value":"72","unit":"bpm"}',
  '{"metric":"diagnosis","value":70,"unit":"bpm"}',
  'I think the reading is 120', '{}', 'null', '[]',
]) assert.equal(parseReportReading(data), null, data);
console.log('Report extraction accepts supported units and rejects uncertain or unsafe AI output');
