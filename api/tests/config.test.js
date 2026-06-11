const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConfig, redactConfig, effectiveConfig } = require('../config-store');
const { ratio } = require('../contrast');

test('contrast ratio math', () => {
  assert.ok(Math.abs(ratio('#FFFFFF', '#000000') - 21) < 0.01);
  assert.ok(Math.abs(ratio('#000000', '#FFFFFF') - 21) < 0.01);
  assert.ok(Math.abs(ratio('#777777', '#777777') - 1) < 0.01);
  assert.equal(ratio('not-a-colour', '#000000'), null);
  // the shipped default light pair must clear AAA
  assert.ok(ratio('#1B1B20', '#FFFFFF') >= 7);
  assert.ok(ratio('#1A4480', '#F4F4F1') >= 7);
});

test('valid config passes', () => {
  const result = validateConfig({
    schema_version: 1,
    branding: { org_name: 'Acme Board' },
    theme: { light: { bg: '#FFFFFF', surface: '#F4F4F1', text: '#1B1B20', link: '#1A4480', focus: '#1A4480' } },
    points: { enabled: true, values: { session_host: 50 }, ranks: [{ min: 0, label: 'Member' }, { min: 100, label: 'Regular' }] },
    skills: [{ category: 'Analysis', tools: ['5 whys'] }],
    admins: ['admin@example.org'],
  });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('low-contrast theme is rejected with a named pair', () => {
  const result = validateConfig({
    theme: { light: { bg: '#FFFFFF', text: '#999999' } },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('"text" on "bg"') && e.includes('7:1')));
});

test('weak focus contrast is rejected at 3:1', () => {
  const result = validateConfig({
    theme: { light: { bg: '#FFFFFF', focus: '#DDDDDD' } },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('focus')));
});

test('bad shapes are rejected', () => {
  assert.equal(validateConfig(null).ok, false);
  assert.equal(validateConfig({ bogus_key: 1 }).ok, false);
  assert.equal(validateConfig({ points: { values: { session_host: -5 } } }).ok, false);
  assert.equal(validateConfig({ points: { ranks: [{ min: 100, label: 'A' }, { min: 50, label: 'B' }] } }).ok, false);
  assert.equal(validateConfig({ skills: [{ category: 'X' }] }).ok, false);
  assert.equal(validateConfig({ admins: ['ok@example.org', 42] }).ok, false);
});

test('emptying admins is blocked unless env bootstrap admins exist', () => {
  const prev = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = '';
  assert.equal(validateConfig({ admins: [] }).ok, false);
  process.env.ADMIN_EMAILS = 'boot@example.org';
  assert.equal(validateConfig({ admins: [] }).ok, true);
  process.env.ADMIN_EMAILS = prev || '';
});

test('redactConfig strips the admin list', () => {
  const doc = redactConfig({ branding: { org_name: 'X' }, admins: ['a@example.org'] });
  assert.equal(doc.admins, undefined);
  assert.equal(doc.branding.org_name, 'X');
});

test('effectiveConfig supplies points defaults', () => {
  const cfg = effectiveConfig(null);
  assert.equal(cfg.points.values.session_attend, 25);
  assert.equal(cfg.points.enabled, true);
  const overridden = effectiveConfig({ points: { values: { session_attend: 5 } } });
  assert.equal(overridden.points.values.session_attend, 5);
  assert.equal(overridden.points.values.session_host, 75);
});
