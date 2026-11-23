import * as SQLite from "expo-sqlite";
import type { Person, Route, Ride, RideDraft, Pricing } from "./model";

export type Preferences = {
  consumption: number;
  gasPrice: number;
  minFare: number;
  maxFare: number;
  dark: boolean;
};
let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
async function database() {
  if (!dbPromise)
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("caronas.db");
      await db.execAsync(
        "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);",
      );
      const row = await db.getFirstAsync<{ version: number }>(
        "SELECT MAX(version) AS version FROM schema_migrations",
      );
      if ((row?.version ?? 0) < 1)
        await db.withTransactionAsync(async () => {
          await db.execAsync(
            "CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL); CREATE TABLE IF NOT EXISTS routes (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, km REAL NOT NULL CHECK(km > 0 AND km <= 40)); CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), consumption REAL NOT NULL, gas_price REAL NOT NULL, min_fare REAL NOT NULL, max_fare REAL NOT NULL, dark INTEGER NOT NULL);",
          );
          await db.runAsync(
            "INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)",
            new Date().toISOString(),
          );
          await db.runAsync(
            "INSERT OR IGNORE INTO settings VALUES(1,12,6.1,1,3,0)",
          );
        });
      await migrateRides(db);
      return db;
    })().catch((error) => {
      dbPromise = undefined;
      throw error;
    });
  return dbPromise;
}
async function migrateRides(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ version: number | null }>(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );
  if ((row?.version ?? 0) >= 2) return;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      CREATE TABLE IF NOT EXISTS rides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER NOT NULL,
        route TEXT NOT NULL,
        distance REAL NOT NULL CHECK(distance BETWEEN 1 AND 40),
        fuel_cost_cents INTEGER NOT NULL CHECK(fuel_cost_cents >= 0),
        fare_cents INTEGER NOT NULL CHECK(fare_cents >= 0),
        pricing TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ride_passengers (
        ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
        person_id TEXT NOT NULL,
        PRIMARY KEY (ride_id, person_id)
      );
      CREATE INDEX IF NOT EXISTS ride_passengers_person ON ride_passengers(person_id);
    `);
    await tx.runAsync(
      "INSERT INTO schema_migrations(version, applied_at) VALUES(2, ?)",
      new Date().toISOString(),
    );
  });
}
export async function loadData() {
  const db = await database();
  const rows = await db.getAllAsync<{ id: string; name: string }>(
    "SELECT id, name FROM people ORDER BY name COLLATE NOCASE",
  );
  const people = rows.map((row) => ({ id: Number(row.id), name: row.name }));
  let routes = await db.getAllAsync<Route>(
    "SELECT name, km FROM routes ORDER BY name COLLATE NOCASE",
  );
  if (!routes.length) {
    for (const [name, km] of [
      ["UFLA", 12],
      ["Centro", 7],
    ] as const)
      await db.runAsync(
        "INSERT OR IGNORE INTO routes(id,name,km) VALUES(?,?,?)",
        name.toLowerCase(),
        name,
        km,
      );
    routes = await db.getAllAsync<Route>(
      "SELECT name, km FROM routes ORDER BY name COLLATE NOCASE",
    );
  }
  const settings = await db.getFirstAsync<{
    consumption: number;
    gasPrice: number;
    minFare: number;
    maxFare: number;
    dark: number;
  }>(
    "SELECT consumption,gas_price as gasPrice,min_fare as minFare,max_fare as maxFare,dark FROM settings WHERE id=1",
  );
  const rides = await loadRides(db);
  return {
    people,
    routes,
    rides,
    settings: {
      consumption: settings?.consumption ?? 12,
      gasPrice: settings?.gasPrice ?? 6.1,
      minFare: settings?.minFare ?? 1,
      maxFare: settings?.maxFare ?? 3,
      dark: !!settings?.dark,
    },
  };
}
async function loadRides(db: SQLite.SQLiteDatabase): Promise<Ride[]> {
  const rows = await db.getAllAsync<{
    id: number;
    date: number;
    route: string;
    km: number;
    fuelCostCents: number;
    fareCents: number;
    pricing: string;
    personId: string;
  }>(`
    SELECT r.id, r.date, r.route, r.distance AS km, r.fuel_cost_cents AS fuelCostCents,
      r.fare_cents AS fareCents, r.pricing, p.person_id AS personId
    FROM rides r JOIN ride_passengers p ON p.ride_id = r.id
    ORDER BY r.date DESC, r.id DESC, p.person_id
  `);
  const rides = new Map<number, Ride>();
  for (const { pricing, personId, ...row } of rows) {
    let ride = rides.get(row.id);
    if (!ride) {
      ride = {
        ...row,
        pricing: JSON.parse(pricing) as Pricing,
        passengers: [],
      };
      rides.set(row.id, ride);
    }
    ride.passengers.push(Number(personId));
  }
  return [...rides.values()];
}

export async function saveRide(
  ride: RideDraft,
  existingId?: number,
): Promise<Ride> {
  if (
    !ride.route.trim() ||
    !Number.isFinite(ride.km) ||
    ride.km < 1 ||
    ride.km > 40 ||
    !ride.passengers.length ||
    new Set(ride.passengers).size !== ride.passengers.length ||
    !ride.passengers.every(Number.isSafeInteger) ||
    ![ride.fuelCostCents, ride.fareCents].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  ) {
    throw new Error("Carona inválida");
  }
  const db = await database();
  let id = existingId ?? 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    const fields = [
      ride.route,
      ride.km,
      ride.fuelCostCents,
      ride.fareCents,
      JSON.stringify(ride.pricing),
    ];
    if (existingId === undefined) {
      const result = await tx.runAsync(
        "INSERT INTO rides(route, distance, fuel_cost_cents, fare_cents, pricing, date) VALUES (?, ?, ?, ?, ?, ?)",
        [...fields, ride.date],
      );
      id = result.lastInsertRowId;
    } else {
      const result = await tx.runAsync(
        "UPDATE rides SET route=?, distance=?, fuel_cost_cents=?, fare_cents=?, pricing=? WHERE id=?",
        [...fields, id],
      );
      if (!result.changes) throw new Error("Carona não encontrada");
      await tx.runAsync("DELETE FROM ride_passengers WHERE ride_id=?", id);
    }
    for (const personId of ride.passengers) {
      const result = await tx.runAsync(
        "INSERT INTO ride_passengers(ride_id, person_id) SELECT ?, id FROM people WHERE id=?",
        id,
        String(personId),
      );
      if (!result.changes) throw new Error("Passageiro não encontrado");
    }
  });
  return { ...ride, id };
}

export async function deleteRide(id: number) {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM ride_passengers WHERE ride_id=?", id);
    await tx.runAsync("DELETE FROM rides WHERE id=?", id);
  });
}
export async function savePerson(p: Person) {
  if (!Number.isSafeInteger(p.id) || !p.name.trim())
    throw Error("Pessoa inválida");
  const db = await database();
  await db.runAsync(
    "INSERT INTO people(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name",
    p.id,
    p.name.trim(),
  );
}
export async function deletePerson(id: number) {
  const db = await database();
  const result = await db.runAsync(
    "DELETE FROM people WHERE id=? AND NOT EXISTS (SELECT 1 FROM ride_passengers WHERE person_id=?)",
    String(id),
    String(id),
  );
  if (!result.changes) throw new Error("Pessoa vinculada a uma carona");
}
export async function saveRoute(r: Route) {
  if (!r.name.trim() || !Number.isFinite(r.km) || r.km <= 0 || r.km > 40)
    throw Error("Rota inválida");
  const db = await database();
  await db.runAsync(
    "INSERT INTO routes(id,name,km) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET km=excluded.km",
    r.name.toLowerCase(),
    r.name.trim(),
    r.km,
  );
}
export async function deleteRoute(name: string) {
  const db = await database();
  await db.runAsync("DELETE FROM routes WHERE name=?", name);
}
export async function savePreferences(p: Preferences) {
  if (
    ![p.consumption, p.gasPrice, p.minFare, p.maxFare].every(
      (n) => Number.isFinite(n) && n > 0,
    ) ||
    p.minFare > p.maxFare
  )
    throw Error("Configuração inválida");
  const db = await database();
  await db.runAsync(
    "UPDATE settings SET consumption=?,gas_price=?,min_fare=?,max_fare=?,dark=? WHERE id=1",
    p.consumption,
    p.gasPrice,
    p.minFare,
    p.maxFare,
    p.dark ? 1 : 0,
  );
}
