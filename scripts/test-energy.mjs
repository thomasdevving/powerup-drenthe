import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

// Compileer de gedeelde TypeScript-kern zonder een extra testruntime.
const dir = mkdtempSync(path.join(tmpdir(), 'powerup-energy-'));
try {
  execFileSync(process.execPath, ['node_modules/typescript/lib/tsc.js', 'src/energy/model.ts', 'src/energy/profiles.ts',
    '--module', 'commonjs', '--target', 'es2020', '--outDir', dir, '--skipLibCheck', '--esModuleInterop']);
  const require = createRequire(import.meta.url);
  const {simulateEnergy, compareScenarios} = require(path.join(dir, 'model.js'));
  const {DEFAULT_SETTINGS: settings, DEFAULT_THERMAL, DT} = require(path.join(dir, 'profiles.js'));
  const equal = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
  let count = 0;
  for (const season of ['winter', 'zomer']) for (const capKw of [0, 500, 800, 1300])
    for (const batteryKwh of [0, 1600]) for (const cop of [2, 3, 6]) {
      const s = {...settings, season, capKw, batteryKwh, thermal: {...DEFAULT_THERMAL, cop}};
      const days = compareScenarios(s);
      for (const day of days) {
        count++;
        assert.equal(day.steps.length, 96);
        assert.ok(day.kpi.balanceError < 1e-6);
        assert.ok(day.steps.every(x => x.grid <= capKw + 1e-7 && x.grid >= 0));
        equal(day.kpi.heatDemandKwh, days[0].kpi.heatDemandKwh);
        equal(day.kpi.coldDemandKwh, days[0].kpi.coldDemandKwh);
        equal(day.kpi.usefulHeatKwh + day.kpi.backupHeatKwh, day.kpi.heatDemandKwh);
        for (let j = 0; j < 8; j++) for (const category of ['machines', 'laden', 'licht'])
          equal(day.steps.reduce((n, x) => n + x.perCompany[j].cats[category] * DT, 0),
            days[0].steps.reduce((n, x) => n + x.perCompany[j].cats[category] * DT, 0));
        // Onafhankelijke dagbalans, inclusief begin/eindvoorraad en opslagverliezen.
        const integral = key => day.steps.reduce((n, x) => n + x[key] * DT, 0);
        equal(integral('grid') + integral('solar') + integral('wind') + integral('shortfall'),
          integral('demand') + integral('curtailed') + day.kpi.batteryEndKwh + day.steps.reduce((n, x) => n + x.batteryLoss, 0));
        equal(integral('heatPumpHeat') + integral('backupHeat'),
          integral('heatDemand') + day.kpi.bufferEndKwh + day.steps.reduce((n, x) => n + x.bufferLoss, 0));
        equal(integral('coldProduced'), integral('coldDemand') + day.steps.at(-1).coldStoreKwh + day.steps.reduce((n, x) => n + x.coldStoreLoss, 0));
        assert.ok(!day.steps.some(x => x.charge > 1e-6 && x.discharge > 1e-6));
      }
    }
  const off = {...settings, thermal: {...DEFAULT_THERMAL, enabled: false}};
  assert.deepEqual(simulateEnergy(off, 'C').steps, simulateEnergy(off, 'B').steps);
  const c = simulateEnergy(settings, 'C');
  assert.ok(c.kpi.usefulHeatKwh > 0);
  assert.ok(c.steps.some(x => x.bufferCharge > 0) && c.steps.some(x => x.bufferDischarge > 0));
  assert.ok(c.steps.some(x => x.coldCharge > 0) && c.steps.some(x => x.coldDischarge > 0));
  const noSource = simulateEnergy({...settings, thermal: {...DEFAULT_THERMAL, recovery: 0}}, 'C');
  equal(noSource.kpi.usefulHeatKwh, 0);
  const noBuffer = simulateEnergy({...settings, thermal: {...DEFAULT_THERMAL, bufferKwh: 0}}, 'C');
  assert.ok(noBuffer.steps.every(x => x.bufferKwh === 0));
  // Een slechte COP mag geen gefingeerd voordeel geven.
  const poor = simulateEnergy({...settings, thermal: {...DEFAULT_THERMAL, cop: 2, bufferKwh: 0}}, 'C');
  assert.ok(poor.electrical.kpi.demandKwh > simulateEnergy(settings, 'B').electrical.kpi.demandKwh);
  for (const bad of [NaN, -1, Infinity]) assert.throws(() => simulateEnergy({...settings, capKw: bad}));
  assert.ok(simulateEnergy({...settings, wind: false}, 'C').steps.every(x => x.wind === 0));
  assert.ok(simulateEnergy({...settings, parkLink: false}, 'C').steps.some((x, i) => x.solar < c.steps[i].solar));
  for (const rule of ['laden', 'spreiden', 'voorkoelen']) {
    const off = simulateEnergy({...settings, rules: {...settings.rules, [rule]: false}}, 'C');
    assert.ok(off.steps.some((x, i) => Math.abs(x.demand - c.steps[i].demand) > 1e-5), `Regel ${rule} doet niets`);
  }
  const extraLoss = simulateEnergy({...settings, thermal: {...DEFAULT_THERMAL, networkLoss: .3}}, 'C');
  assert.notEqual(extraLoss.kpi.recoveredSourceKwh, c.kpi.recoveredSourceKwh);
  console.log(`✓ ${count} scenario runs: dag- en kwartierbalansen, gelijke diensten, netlimiet, opslag, nulbron, toggles en nadelige COP.`);
} finally { rmSync(dir, {recursive: true, force: true}); }
