import type { Ride } from "./model";

function decimal(value: number): [bigint, bigint] {
  const [mantissa, exponent = "0"] = String(value).split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const scale = fraction.length - Number(exponent);
  const ten = BigInt(10);
  const digits = BigInt(whole + fraction);
  return scale < 0
    ? [digits * ten ** BigInt(-scale), BigInt(1)]
    : [digits, ten ** BigInt(scale)];
}

function roundCents(numerator: bigint, denominator: bigint) {
  const two = BigInt(2);
  const cents = Number(
    (numerator * BigInt(200) + denominator) / (two * denominator),
  );
  if (!Number.isSafeInteger(cents)) throw new Error("Valor fora do intervalo");
  return cents;
}

export function calculateRide(
  distance: number,
  consumption: number,
  gasPrice: number,
  passengers: number,
  minFare: number,
  maxFare: number,
) {
  if (
    ![distance, consumption, gasPrice, minFare, maxFare].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    !Number.isSafeInteger(passengers) ||
    passengers < 0 ||
    maxFare < minFare
  ) {
    throw new Error("Dados inválidos para calcular a carona");
  }
  const [km, kmScale] = decimal(distance);
  const [efficiency, efficiencyScale] = decimal(consumption);
  const [price, priceScale] = decimal(gasPrice);
  const numerator = km * efficiencyScale * price;
  const denominator = kmScale * efficiency * priceScale;
  const fuelCostCents = roundCents(numerator, denominator);
  const fareCents = passengers
    ? Math.min(
        roundCents(...decimal(maxFare)),
        Math.max(
          roundCents(...decimal(minFare)),
          roundCents(numerator, denominator * (BigInt(passengers) + BigInt(1))),
        ),
      )
    : 0;
  const totalCents = fareCents * passengers;
  if (!Number.isSafeInteger(totalCents))
    throw new Error("Total fora do intervalo");
  return { fuelCostCents, fareCents, totalCents };
}

export function getBalances(rides: Ride[]) {
  const balances = new Map<number, number>();
  for (const ride of rides) {
    for (const id of ride.passengers)
      balances.set(id, (balances.get(id) ?? 0) + ride.fareCents);
  }
  return balances;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const money = (cents: number) => brl.format(cents / 100);
