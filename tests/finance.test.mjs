import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateRide,
  getBalances,
  getStatistics,
  parsePaymentAmount,
} from "../src/finance.ts";

test("divide o custo entre passageiros e motorista", () => {
  assert.deepEqual(calculateRide(12, 12, 6, 2, 1, 3), {
    fuelCostCents: 600,
    fareCents: 200,
    totalCents: 400,
  });
  assert.equal(calculateRide(12, 12, 6, 3, 1, 3).fareCents, 150);
});

test("aplica limites configuráveis e calcula custo sem passageiros", () => {
  assert.equal(calculateRide(1, 12, 6, 3, 1.25, 2.75).fareCents, 125);
  assert.equal(calculateRide(40, 12, 6, 1, 1.25, 2.75).fareCents, 275);
  assert.equal(calculateRide(12, 12, 6, 0, 1, 3).totalCents, 0);
  assert.throws(() => calculateRide(12, 0, 6, 1, 1, 3));
});

test("arredonda cada resultado diretamente, incluindo meio centavo", () => {
  assert.equal(calculateRide(1, 1, 1.005, 1, 1, 3).fuelCostCents, 101);
  assert.equal(calculateRide(1, 1, 2.009, 1, 1, 3).fareCents, 100);
  assert.equal(calculateRide(1, 1, 2.01, 1, 1, 3).fareCents, 101);
});

test("deriva saldos dos valores históricos e acompanha edição e exclusão", () => {
  const first = { passengers: [1, 2], fareCents: 120 };
  const second = { passengers: [2], fareCents: 200 };
  assert.deepEqual(
    getBalances([first, second]),
    new Map([
      [1, 120],
      [2, 320],
    ]),
  );
  assert.deepEqual(
    getBalances([{ ...first, passengers: [1], fareCents: 180 }, second]),
    new Map([
      [1, 180],
      [2, 200],
    ]),
  );
  assert.deepEqual(getBalances([second]), new Map([[2, 200]]));
});

test("interpreta pagamentos em centavos sem arredondar entradas inválidas", () => {
  assert.equal(parsePaymentAmount("3,05"), 305);
  assert.equal(parsePaymentAmount("1.2"), 120);
  for (const input of ["", "0", "-1", "1,001", "1e2", "99999999999999999"])
    assert.equal(parsePaymentAmount(input), null);
});

test("filtra recebimentos pela data e abate as caronas mais antigas primeiro", () => {
  const jan = new Date(2026, 0, 15).getTime();
  const feb = new Date(2026, 1, 15).getTime();
  const rides = [
    {
      id: 2,
      date: feb,
      km: 10,
      fuelCostCents: 500,
      fareCents: 200,
      passengers: [1],
    },
    {
      id: 1,
      date: jan,
      km: 6,
      fuelCostCents: 300,
      fareCents: 100,
      passengers: [1, 2],
    },
  ];
  const payments = [{ personId: 1, amountCents: 150, date: feb }];
  assert.deepEqual(
    getBalances(rides, payments),
    new Map([
      [1, 150],
      [2, 100],
    ]),
  );
  assert.deepEqual(getStatistics(rides, payments, "2026-01"), {
    received: 0,
    pending: 100,
    fuelCost: 300,
    difference: 300,
    count: 1,
    km: 6,
    byPerson: new Map([
      [1, { count: 1, charged: 100, received: 0, pending: 0 }],
      [2, { count: 1, charged: 100, received: 0, pending: 100 }],
    ]),
  });
  assert.deepEqual(getStatistics(rides, payments, "2026-02"), {
    received: 150,
    pending: 150,
    fuelCost: 500,
    difference: 350,
    count: 1,
    km: 10,
    byPerson: new Map([
      [1, { count: 1, charged: 200, received: 150, pending: 150 }],
    ]),
  });
  assert.deepEqual(getStatistics(rides, payments), {
    received: 150,
    pending: 250,
    fuelCost: 800,
    difference: 650,
    count: 2,
    km: 16,
    byPerson: new Map([
      [1, { count: 2, charged: 300, received: 150, pending: 150 }],
      [2, { count: 1, charged: 100, received: 0, pending: 100 }],
    ]),
  });
});
