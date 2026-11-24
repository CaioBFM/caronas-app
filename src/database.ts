import * as SQLite from "expo-sqlite";
import {
  defaultRoutes,
  type AppData,
  type Person,
  type Route,
  type Ride,
  type RideDraft,
  type Pricing,
  type Payment,
} from "./model.ts";
import { decodeBackup, encodeBackup } from "./backupFormat.ts";

export type Preferences = AppData["settings"];
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
          for (const route of defaultRoutes) await insertRoute(db, route);
        });
      await migrateRides(db);
      await repairLegacyRides(db);
      await migratePayments(db);
      await migrateDeletedPeople(db);
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
async function repairLegacyRides(db: SQLite.SQLiteDatabase) {
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(rides)",
  );
  if (columns.some((column) => column.name === "pricing")) return;

  // An earlier v2 schema used text IDs and did not store calculation settings.
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      CREATE TABLE rides_repaired (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER NOT NULL,
        route TEXT NOT NULL,
        distance REAL NOT NULL CHECK(distance > 0),
        fuel_cost_cents INTEGER NOT NULL CHECK(fuel_cost_cents >= 0),
        fare_cents INTEGER NOT NULL CHECK(fare_cents >= 0),
        pricing TEXT NOT NULL
      );
      INSERT INTO rides_repaired
        SELECT CAST(id AS INTEGER), date, route, distance, fuel_cost_cents, fare_cents,
          (SELECT json_object('consumption', consumption, 'gasPrice', gas_price,
            'minFare', min_fare, 'maxFare', max_fare) FROM settings WHERE id=1)
        FROM rides;
      CREATE TABLE ride_passengers_repaired (
        ride_id INTEGER NOT NULL REFERENCES rides_repaired(id) ON DELETE CASCADE,
        person_id TEXT NOT NULL,
        PRIMARY KEY (ride_id, person_id)
      );
      INSERT INTO ride_passengers_repaired
        SELECT CAST(ride_id AS INTEGER), person_id FROM ride_passengers;
      DROP TABLE ride_passengers;
      DROP TABLE rides;
      ALTER TABLE rides_repaired RENAME TO rides;
      ALTER TABLE ride_passengers_repaired RENAME TO ride_passengers;
      CREATE INDEX ride_passengers_person ON ride_passengers(person_id);
    `);
    await tx.runAsync(
      "INSERT INTO schema_migrations(version, applied_at) VALUES(3, ?)",
      new Date().toISOString(),
    );
  });
}
async function migratePayments(db: SQLite.SQLiteDatabase) {
  const migration = await db.getFirstAsync(
    "SELECT version FROM schema_migrations WHERE version=4",
  );
  if (migration) return;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(`
      ALTER TABLE people ADD COLUMN archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1));
      CREATE TABLE payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id TEXT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
        date INTEGER NOT NULL,
        amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents) = 'integer' AND amount_cents > 0)
      );
      CREATE INDEX payments_person ON payments(person_id);
      CREATE VIEW person_balances AS
        SELECT p.id,
          COALESCE((SELECT SUM(r.fare_cents) FROM ride_passengers rp
            JOIN rides r ON r.id=rp.ride_id WHERE rp.person_id=p.id), 0) -
          COALESCE((SELECT SUM(amount_cents) FROM payments WHERE person_id=p.id), 0)
          AS balance
        FROM people p;
    `);
    await tx.runAsync(
      "INSERT INTO schema_migrations(version, applied_at) VALUES(4, ?)",
      new Date().toISOString(),
    );
  });
}

async function migrateDeletedPeople(db: SQLite.SQLiteDatabase) {
  if (
    await db.getFirstAsync(
      "SELECT version FROM schema_migrations WHERE version=5",
    )
  )
    return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync("ALTER TABLE people RENAME COLUMN archived TO deleted");
    await tx.runAsync(
      "INSERT INTO schema_migrations(version, applied_at) VALUES(5, ?)",
      new Date().toISOString(),
    );
  });
}

async function checkRideBalances(tx: SQLite.SQLiteDatabase) {
  if (
    await tx.getFirstAsync(
      "SELECT id FROM person_balances WHERE balance < 0 LIMIT 1",
    )
  )
    throw new Error(
      "A alteração deixaria uma pessoa com mais pagamentos do que cobranças.",
    );
}

export async function loadData() {
  return readData(await database());
}

async function readData(db: SQLite.SQLiteDatabase): Promise<AppData> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    deleted: number;
  }>("SELECT id, name, deleted FROM people ORDER BY name COLLATE NOCASE");
  const people = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    deleted: !!row.deleted,
  }));
  const routes = await db.getAllAsync<Route>(
    "SELECT name, km FROM routes ORDER BY name COLLATE NOCASE",
  );
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
  const payments = await db.getAllAsync<Payment>(`
    SELECT id, CAST(person_id AS INTEGER) AS personId, date, amount_cents AS amountCents
    FROM payments ORDER BY date DESC, id DESC
  `);
  return {
    people,
    routes,
    rides,
    payments,
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
    personId: string | null;
  }>(`
    SELECT r.id, r.date, r.route, r.distance AS km, r.fuel_cost_cents AS fuelCostCents,
      r.fare_cents AS fareCents, r.pricing, p.person_id AS personId
    FROM rides r LEFT JOIN ride_passengers p ON p.ride_id = r.id
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
    if (personId !== null) ride.passengers.push(Number(personId));
  }
  return [...rides.values()];
}

export async function saveRide(
  ride: RideDraft,
  existingId?: number,
): Promise<Ride> {
  if (
    !ride.route.trim() ||
    !Number.isSafeInteger(ride.date) ||
    ride.date < 0 ||
    ride.date > 8.64e15 ||
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
    let previousPassengers: { person_id: string }[] = [];
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
      previousPassengers = await tx.getAllAsync<{ person_id: string }>(
        "SELECT person_id FROM ride_passengers WHERE ride_id=?",
        id,
      );
      await tx.runAsync("DELETE FROM ride_passengers WHERE ride_id=?", id);
    }
    for (const personId of ride.passengers) {
      const result = await tx.runAsync(
        "INSERT INTO ride_passengers(ride_id, person_id) SELECT ?, id FROM people WHERE id=? AND (deleted=0 OR ?)",
        id,
        String(personId),
        previousPassengers.some((p) => p.person_id === String(personId))
          ? 1
          : 0,
      );
      if (!result.changes) throw new Error("Passageiro indisponível");
    }
    if (existingId !== undefined) await checkRideBalances(tx);
  });
  return { ...ride, id };
}

export async function deleteRide(id: number) {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync("DELETE FROM ride_passengers WHERE ride_id=?", id);
    await tx.runAsync("DELETE FROM rides WHERE id=?", id);
    await checkRideBalances(tx);
  });
}
export async function savePerson(p: Person) {
  if (!Number.isSafeInteger(p.id) || !p.name.trim())
    throw Error("Pessoa inválida");
  const db = await database();
  const result = await db.runAsync(
    "INSERT INTO people(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name WHERE people.deleted=0",
    String(p.id),
    p.name.trim(),
  );
  if (!result.changes) throw new Error("Pessoa excluída.");
}

export async function deletePerson(id: number) {
  const db = await database();
  const result = await db.runAsync(
    "UPDATE people SET deleted=1 WHERE id=? AND deleted=0 AND id IN (SELECT id FROM person_balances WHERE balance=0)",
    String(id),
  );
  if (!result.changes)
    throw new Error("Só é possível excluir pessoas sem dívidas pendentes.");
}

export async function savePayment(
  personId: number,
  amountCents: number,
  existing?: Payment,
): Promise<Payment> {
  if (
    !Number.isSafeInteger(personId) ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0
  )
    throw new Error("Informe um valor válido maior que zero.");
  const db = await database();
  const date = existing?.date ?? Date.now();
  const result = existing
    ? await db.runAsync(
        `UPDATE payments SET amount_cents=? WHERE id=? AND person_id=?
        AND ? <= amount_cents + (SELECT balance FROM person_balances WHERE id=payments.person_id)`,
        amountCents,
        existing.id,
        String(personId),
        amountCents,
      )
    : await db.runAsync(
        `INSERT INTO payments(person_id, date, amount_cents)
        SELECT id, ?, ? FROM person_balances WHERE id=? AND balance >= ?`,
        date,
        amountCents,
        String(personId),
        amountCents,
      );
  if (!result.changes)
    throw new Error("Pagamento indisponível ou superior ao saldo devedor.");
  return {
    id: existing?.id ?? result.lastInsertRowId,
    personId,
    date,
    amountCents,
  };
}

export async function deletePayment(id: number) {
  const db = await database();
  const result = await db.runAsync("DELETE FROM payments WHERE id=?", id);
  if (!result.changes) throw new Error("Pagamento não encontrado.");
}

export async function saveRoute(r: Route) {
  if (
    !r.name.trim() ||
    r.name.trim().toLowerCase() === "outro destino" ||
    !Number.isFinite(r.km) ||
    r.km <= 0 ||
    r.km > 40
  )
    throw Error("Rota inválida");
  await insertRoute(await database(), r);
}
async function insertRoute(db: SQLite.SQLiteDatabase, route: Route) {
  const name = route.name.trim();
  await db.runAsync(
    "INSERT INTO routes(id,name,km) VALUES(?,?,?)",
    name.toLowerCase(),
    name,
    route.km,
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
  await writePreferences(await database(), p);
}

async function writePreferences(db: SQLite.SQLiteDatabase, p: Preferences) {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings(id,consumption,gas_price,min_fare,max_fare,dark) VALUES(1,?,?,?,?,?)",
    p.consumption,
    p.gasPrice,
    p.minFare,
    p.maxFare,
    p.dark ? 1 : 0,
  );
}

export async function exportBackup() {
  const db = await database();
  let content = "";
  await db.withExclusiveTransactionAsync(async (tx) => {
    content = encodeBackup(await readData(tx));
  });
  return content;
}

export async function restoreBackup(content: string): Promise<AppData> {
  const data = decodeBackup(content);
  const db = await database();
  let restored = data;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.execAsync(
      "DELETE FROM payments; DELETE FROM ride_passengers; DELETE FROM rides; DELETE FROM people; DELETE FROM routes;",
    );
    for (const p of data.people)
      await tx.runAsync(
        "INSERT INTO people(id,name,deleted) VALUES(?,?,?)",
        String(p.id),
        p.name,
        p.deleted ? 1 : 0,
      );
    for (const ride of data.rides) {
      await tx.runAsync(
        "INSERT INTO rides(id,date,route,distance,fuel_cost_cents,fare_cents,pricing) VALUES(?,?,?,?,?,?,?)",
        ride.id,
        ride.date,
        ride.route,
        ride.km,
        ride.fuelCostCents,
        ride.fareCents,
        JSON.stringify(ride.pricing),
      );
      for (const id of ride.passengers)
        await tx.runAsync(
          "INSERT INTO ride_passengers(ride_id,person_id) VALUES(?,?)",
          ride.id,
          String(id),
        );
    }
    for (const payment of data.payments)
      await tx.runAsync(
        "INSERT INTO payments(id,person_id,date,amount_cents) VALUES(?,?,?,?)",
        payment.id,
        String(payment.personId),
        payment.date,
        payment.amountCents,
      );
    for (const route of data.routes) await insertRoute(tx, route);
    await writePreferences(tx, data.settings);
    await checkRideBalances(tx);
    restored = await readData(tx);
  });
  return restored;
}
