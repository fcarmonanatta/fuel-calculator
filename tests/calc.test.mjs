// Tests de la lógica de cálculo. Correr con: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const src = /<script id="calc">([\s\S]*?)<\/script>/.exec(html)[1];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + ';Object.assign(globalThis,{parseN,toUSG,calcWaiver,calcTankering,csvCell,searchAirports});', ctx);
const { parseN, toUSG, calcWaiver, calcTankering, csvCell, searchAirports } = ctx;
const AIRPORTS = JSON.parse(/<script type="application\/json" id="airports-data">([\s\S]*?)<\/script>/.exec(html)[1]);
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('parseN acepta formatos con coma y punto', () => {
  assert.equal(parseN('1500'), 1500);
  assert.equal(parseN('6,7'), 6.7);
  assert.equal(parseN('1.500,5'), 1500.5);
  assert.equal(parseN('1,500.5'), 1500.5);
  assert.equal(parseN('$ 5.20'), 5.2);
  assert.ok(Number.isNaN(parseN('')));
  assert.ok(Number.isNaN(parseN('abc')));
});

test('toUSG convierte con la densidad elegida', () => {
  close(toUSG(670, 'LBS', 6.7), 100);
  close(toUSG(600, 'LBS', 6.0), 100);
  close(toUSG(378.5411784, 'LTS'), 100);
  assert.equal(toUSG(-5, 'USG'), 0);
});

test('waiver: punto de equilibrio y zonas', () => {
  // fee 300, mínimo 200 USG, precio 6 → fee = 50 USG → equilibrio 150 USG
  const base = { fee: 300, min: 200, price: 6 };
  close(calcWaiver(base).be, 150);
  const y = calcWaiver({ ...base, need: 100 });
  assert.equal(y.zone, 'yellow');
  close(y.costJusto, 900); close(y.costMin, 1200); close(y.saving, 300);
  const r = calcWaiver({ ...base, need: 180 });
  assert.equal(r.zone, 'red'); assert.equal(r.action, 'load-min');
  close(r.costJusto, 1380); close(r.costMin, 1200); close(r.saving, 180);
  const g = calcWaiver({ ...base, need: 250 });
  assert.equal(g.zone, 'green'); close(g.costJusto, 1500);
  assert.equal(calcWaiver({ fee: 300, min: 200, price: 0 }).valid, false);
  // fee mayor que el mínimo entero → equilibrio 0, siempre conviene el mínimo
  assert.equal(calcWaiver({ fee: 5000, min: 200, price: 6 }).be, 0);
});

test('tankering sin acarreo: extra × diferencia de precio', () => {
  const r = calcTankering({
    legs: [
      { icao: 'SAEZ', needUSG: 500, loadUSG: 800, price: 4 },
      { icao: 'SCEL', needUSG: 400, loadUSG: 100, price: 7 },
    ], carry: false,
  });
  close(r.steps[0].extra, 300);
  close(r.total, 900);
  assert.ok(r.ready);
});

test('tankering con acarreo: lo quemado se valúa al precio de destino', () => {
  const r = calcTankering({
    legs: [
      { icao: 'A', needUSG: 500, loadUSG: 800, price: 4, hours: 2 },
      { icao: 'B', needUSG: 400, loadUSG: 100, price: 7 },
    ], carry: true, ratePct: 3,
  });
  const s = r.steps[0];
  close(s.burnUSG, 18);          // 300 × 3% × 2 h
  close(s.carryCost, 126);       // 18 × 7
  close(s.saving, 282 * 7 - 300 * 4);
  close(s.beOriginPrice, 7 * 0.94);
});

test('tankering en 3 tramos suma ambos ahorros y detecta pérdida', () => {
  const r = calcTankering({
    legs: [
      { icao: 'A', needUSG: 100, loadUSG: 200, price: 5 },
      { icao: 'B', needUSG: 100, loadUSG: 150, price: 6 },
      { icao: 'C', needUSG: 100, loadUSG: 100, price: 4 },
    ], carry: false,
  });
  close(r.steps[0].saving, 100);
  close(r.steps[1].saving, -100);
  close(r.total, 0);
  close(r.extraTotal, 150);
});

test('csvCell escapa separadores y comillas', () => {
  assert.equal(csvCell('SAEZ → SCEL'), 'SAEZ → SCEL');
  assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('di "hola"'), '"di ""hola"""');
});

test('waiver aprovechando el extra: el galón extra cuesta p − pNext', () => {
  // fee 300, mínimo 200, precio 6, próxima carga a 5 → cada galón extra cuesta 1 → equilibrio 0
  const base = { fee: 300, min: 200, price: 6, nextPrice: 5 };
  assert.equal(calcWaiver(base).be, 0);
  const r = calcWaiver({ ...base, need: 50 });
  assert.equal(r.zone, 'red');
  close(r.costJusto, 600); close(r.credit, 750); close(r.costMin, 450); close(r.saving, 150);
  // próxima carga a 3 → galón extra cuesta 3 → equilibrio 200 − 100 = 100
  close(calcWaiver({ ...base, nextPrice: 3 }).be, 100);
  assert.equal(calcWaiver({ ...base, nextPrice: 3, need: 80 }).zone, 'yellow');
  // más barato acá que en la próxima → siempre el mínimo
  assert.equal(calcWaiver({ ...base, nextPrice: 7 }).be, 0);
  // sin nextPrice se comporta como antes
  close(calcWaiver({ fee: 300, min: 200, price: 6, nextPrice: 0 }).be, 150);
});

test('base de aeropuertos embebida', () => {
  assert.ok(AIRPORTS.length > 5000);
  const saez = AIRPORTS.find(a => a[0] === 'SAEZ');
  assert.equal(saez[1], 'EZE');
  assert.ok(AIRPORTS.find(a => a[0] === 'SADF'), 'incluye aeropuertos chicos/medianos de Sudamérica');
});

test('searchAirports: por OACI, IATA, ciudad y sin tildes', () => {
  const top = (q) => searchAirports(AIRPORTS, q)[0]?.[0];
  assert.equal(top('SCEL'), 'SCEL');
  assert.equal(top('saez'), 'SAEZ');
  assert.equal(top('EZE'), 'SAEZ');
  assert.equal(top('aeroparque'), 'SABE');
  assert.equal(top('sao paulo'), 'SBGR');
  assert.equal(top('São Paulo'), 'SBGR');
  assert.ok(searchAirports(AIRPORTS, 'SA').length === 8);
  assert.equal(searchAirports(AIRPORTS, '   ').length, 0);
  assert.equal(top('santiago'), 'SCEL');
  assert.equal(top('san fernando'), 'SADF');
  assert.equal(top('miami'), 'KMIA');
});
