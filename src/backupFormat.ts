import type { AppData, Pricing } from "./model";

const version = 1;

export function encodeBackup(data: AppData): string {
  return JSON.stringify({ format: "caronas", version, data });
}

function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error("Arquivo de backup inválido ou corrompido.");
}

function record(value: unknown): Record<string, unknown> {
  requireValid(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function list(value: unknown): unknown[] {
  requireValid(Array.isArray(value));
  return value;
}

function text(value: unknown): string {
  requireValid(typeof value === "string" && value.trim().length > 0);
  return value;
}

function numeric(value: unknown, min: number, max = Infinity): number {
  requireValid(
    typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max,
  );
  return value;
}

function integer(
  value: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): number {
  const result = numeric(value, min, max);
  requireValid(Number.isSafeInteger(result));
  return result;
}

function pricing(value: unknown): Pricing {
  const row = record(value);
  const consumption = numeric(row.consumption, Number.MIN_VALUE);
  const gasPrice = numeric(row.gasPrice, Number.MIN_VALUE);
  const minFare = numeric(row.minFare, Number.MIN_VALUE);
  const maxFare = numeric(row.maxFare, minFare);
  return { consumption, gasPrice, minFare, maxFare };
}

function unique(values: (string | number)[]) {
  requireValid(new Set(values).size === values.length);
}

export function decodeBackup(content: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Arquivo de backup inválido ou corrompido.");
  }
  const file = record(parsed);
  requireValid(file.format === "caronas");
  if (file.version !== version)
    throw new Error("Versão de backup incompatível.");
  const data = record(file.data);
  const people = list(data.people).map((value) => {
    const row = record(value);
    requireValid(typeof row.archived === "boolean");
    return {
      id: integer(row.id, 1),
      name: text(row.name),
      archived: row.archived,
    };
  });
  unique(people.map((p) => p.id));
  const balances = new Map(people.map((p) => [p.id, 0]));
  const rides = list(data.rides).map((value) => {
    const row = record(value);
    const passengers = list(row.passengers).map((id) => integer(id, 1));
    unique(passengers);
    const fareCents = integer(row.fareCents, 0);
    for (const id of passengers) {
      const balance = balances.get(id);
      requireValid(
        balance !== undefined && Number.isSafeInteger(balance + fareCents),
      );
      balances.set(id, balance + fareCents);
    }
    return {
      id: integer(row.id, 1),
      date: integer(row.date, 0, 8.64e15),
      route: text(row.route),
      km: numeric(row.km, 1, 40),
      passengers,
      fuelCostCents: integer(row.fuelCostCents, 0),
      fareCents,
      pricing: pricing(row.pricing),
    };
  });
  unique(rides.map((r) => r.id));
  const payments = list(data.payments).map((value) => {
    const row = record(value);
    const personId = integer(row.personId, 1);
    const amountCents = integer(row.amountCents, 1);
    const balance = balances.get(personId);
    requireValid(balance !== undefined && balance >= amountCents);
    balances.set(personId, balance - amountCents);
    return {
      id: integer(row.id, 1),
      personId,
      date: integer(row.date, 0, 8.64e15),
      amountCents,
    };
  });
  unique(payments.map((p) => p.id));
  const routes = list(data.routes).map((value) => {
    const row = record(value);
    return {
      name: text(row.name).trim(),
      km: numeric(row.km, Number.MIN_VALUE, 40),
    };
  });
  unique(routes.map((r) => r.name.toLowerCase()));
  const settings = record(data.settings);
  requireValid(typeof settings.dark === "boolean");
  return {
    people,
    rides,
    payments,
    routes,
    settings: { ...pricing(settings), dark: settings.dark },
  };
}
