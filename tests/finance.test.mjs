import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateRide, getBalances } from "../src/finance.ts";

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
