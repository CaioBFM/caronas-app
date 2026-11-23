import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

test("migra v1, persiste caronas e reverte gravações parciais", async (t) => {
  const folder = mkdtempSync(join(tmpdir(), "caronas-test-"));
  const file = join(folder, "caronas.db");
  const db = new DatabaseSync(file);
  t.after(() => {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  });
  db.exec(`
    CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    INSERT INTO schema_migrations VALUES (1, '2026-01-01');
    CREATE TABLE people(id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL);
    INSERT INTO people VALUES ('1', 'Pessoa A'), ('2', 'Pessoa B');
    CREATE TABLE routes(id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, km REAL);
    INSERT INTO routes VALUES ('teste', 'Rota teste', 15);
    CREATE TABLE settings(id INTEGER PRIMARY KEY, consumption REAL, gas_price REAL, min_fare REAL, max_fare REAL, dark INTEGER);
    INSERT INTO settings VALUES (1, 10, 6, 1, 3, 1);
  `);
  function transaction(fn) {
    db.exec("BEGIN");
    return Promise.resolve()
      .then(fn)
      .then(
        () => db.exec("COMMIT"),
        (error) => {
          db.exec("ROLLBACK");
          throw error;
        },
      );
  }
  const adapter = {
    execAsync: async (sql) => db.exec(sql),
    getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params),
    getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const { changes, lastInsertRowid } = db
        .prepare(sql)
        .run(...params.flat());
      return { changes, lastInsertRowId: lastInsertRowid };
    },
    withExclusiveTransactionAsync: (fn) => transaction(() => fn(adapter)),
  };
  t.mock.module("expo-sqlite", {
    namedExports: { openDatabaseAsync: async () => adapter },
  });
  const { loadData, saveRide, deleteRide, deletePerson, savePreferences } =
    await import("../src/database.ts");
  const initial = await loadData();
  assert.deepEqual(
    initial.people.map((p) => p.id),
    [1, 2],
  );
  assert.equal(initial.routes[0].name, "Rota teste");
  assert.equal(initial.settings.dark, true);
  assert.deepEqual(initial.rides, []);
  assert.equal(
    db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get()
      .version,
    2,
  );

  const pricing = { consumption: 10, gasPrice: 6, minFare: 1, maxFare: 3 };
  const draft = {
    date: 123,
    route: "Rota teste",
    km: 15,
    passengers: [1, 2],
    fuelCostCents: 900,
    fareCents: 300,
    pricing,
  };
  const ride = await saveRide(draft);
  const reopened = new DatabaseSync(file, { readOnly: true });
  try {
    assert.equal(
      reopened.prepare("SELECT fare_cents FROM rides WHERE id=?").get(ride.id)
        .fare_cents,
      300,
    );
  } finally {
    reopened.close();
  }
  await savePreferences({ ...pricing, gasPrice: 7, dark: false });
  assert.deepEqual((await loadData()).rides, [ride]);
  await assert.rejects(saveRide({ ...draft, passengers: [1, 99] }, ride.id));
  await assert.rejects(saveRide({ ...draft, passengers: [1, 99] }));
  await assert.rejects(saveRide({ ...draft, passengers: [1, 1] }));
  await assert.rejects(deletePerson(1));
  assert.deepEqual((await loadData()).rides, [ride]);

  const edited = await saveRide(
    { ...draft, km: 8, passengers: [1], fuelCostCents: 480, fareCents: 240 },
    ride.id,
  );
  assert.deepEqual((await loadData()).rides, [edited]);
  await deleteRide(ride.id);
  assert.deepEqual((await loadData()).rides, []);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS total FROM ride_passengers").get().total,
    0,
  );
});
