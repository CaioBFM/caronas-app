import type { Payment, Ride } from "./model";

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

export function getBalances(rides: Ride[], payments: Payment[] = []) {
  const balances = new Map<number, number>();
  for (const ride of rides) {
    for (const id of ride.passengers)
      balances.set(id, (balances.get(id) ?? 0) + ride.fareCents);
  }
  for (const { personId, amountCents } of payments)
    balances.set(personId, (balances.get(personId) ?? 0) - amountCents);
  return balances;
}

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const money = (cents: number) => brl.format(cents / 100);

export function parsePaymentAmount(input: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = Number(match[1] + (match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function monthOf(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getStatistics(
  rides: Ride[],
  payments: Payment[],
  month?: string,
) {
  const includes = (date: number) => !month || monthOf(date) === month;
  const available = new Map<number, number>();
  const byPerson = new Map<
    number,
    {
      count: number;
      charged: number;
      received: number;
      pending: number;
    }
  >();
  function person(id: number) {
    let values = byPerson.get(id);
    if (!values) {
      values = { count: 0, charged: 0, received: 0, pending: 0 };
      byPerson.set(id, values);
    }
    return values;
  }

  let received = 0,
    pending = 0,
    fuelCost = 0,
    count = 0,
    km = 0;
  for (const payment of payments) {
    const { personId, amountCents, date } = payment;
    available.set(personId, (available.get(personId) ?? 0) + amountCents);
    if (includes(date)) {
      received += amountCents;
      person(personId).received += amountCents;
    }
  }
  // Payments settle each person's oldest charges first, across months.
  for (const ride of [...rides].sort(
    (a, b) => a.date - b.date || a.id - b.id,
  )) {
    const selected = includes(ride.date);
    if (selected) {
      fuelCost += ride.fuelCostCents;
      km += ride.km;
      count++;
    }
    for (const id of ride.passengers) {
      const credit = available.get(id) ?? 0;
      const paid = Math.min(credit, ride.fareCents);
      available.set(id, credit - paid);
      if (selected) {
        const values = person(id);
        values.count++;
        values.charged += ride.fareCents;
        values.pending += ride.fareCents - paid;
        pending += ride.fareCents - paid;
      }
    }
  }
  return {
    received,
    pending,
    fuelCost,
    difference: fuelCost - received,
    count,
    km,
    byPerson,
  };
}
