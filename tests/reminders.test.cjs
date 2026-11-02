const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
let scheduled = new Map();
let granted = true;
let channelConfig;
let channelState = { importance: 6, sound: 'custom' };
const notifications = {
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async (id, config) => { channelConfig = { id, ...config }; },
  getNotificationChannelAsync: async () => channelState,
  getPermissionsAsync: async () => ({ granted }),
  requestPermissionsAsync: async () => ({ granted }),
  getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
  cancelScheduledNotificationAsync: async id => { scheduled.delete(id); },
  scheduleNotificationAsync: async item => { scheduled.set(item.identifier, item); return item.identifier; },
  AndroidImportance: { HIGH: 6, NONE: 2 }, AndroidAudioUsage: { ALARM: 4 }, AndroidAudioContentType: { SONIFICATION: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval' },
};
const originalLoad = Module._load;
Module._load = function(request, ...args) {
  if (request === 'react-native') return { Platform: { OS: 'android' } };
  if (request === 'expo-notifications') return notifications;
  return originalLoad.call(this, request, ...args);
};
const { syncMedicationReminders, enableMedicationReminders, syncBedtimeReminder, enableBedtimeReminder } = require('../lib/reminders.ts');
Module._load = originalLoad;
const med = (id, times, sample = false) => ({ id, times, sample });
(async () => {
  scheduled.set('aura-medication:old:08:00', { identifier: 'aura-medication:old:08:00' });
  await syncMedicationReminders([med('a', ['08:00', '20:30', 'invalid']), med('sample', ['09:00'], true)]);
  assert.deepEqual([...scheduled.keys()].sort(), ['aura-medication:v2:a:08:00', 'aura-medication:v2:a:20:30']);
  assert.equal(channelConfig.sound, 'medication_alarm.wav');
  assert.equal(channelConfig.audioAttributes.usage, 4);
  assert.equal(scheduled.get('aura-medication:v2:a:20:30').trigger.hour, 20);
  await Promise.all([syncMedicationReminders([med('a', ['08:00'])]), syncMedicationReminders([med('a', ['09:10'])])]);
  assert.deepEqual([...scheduled.keys()], ['aura-medication:v2:a:09:10']);
  await syncMedicationReminders([]);
  assert.equal(scheduled.size, 0);
  granted = false;
  await assert.rejects(enableMedicationReminders([med('a', ['08:00'])]), /blocked/i);
  granted = true;
  channelState = { importance: 2, sound: null };
  await assert.rejects(enableBedtimeReminder('22:15'), /muted or blocked/i);
  channelState = { importance: 6, sound: 'custom' };
  await syncMedicationReminders([med('a', ['08:00'])]);
  await enableBedtimeReminder('22:15');
  assert.equal(scheduled.get('aura-bedtime:22:15').trigger.hour, 22);
  await syncBedtimeReminder('21:00');
  assert.ok(!scheduled.has('aura-bedtime:22:15'));
  assert.ok(scheduled.has('aura-bedtime:21:00'));
  await syncBedtimeReminder('');
  assert.ok(!scheduled.has('aura-bedtime:21:00'));
  await assert.rejects(enableBedtimeReminder('25:00'), /valid time/);
  console.log('Medication reminder migration, edits, deletes, permissions, queue and bedtime alarm passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
