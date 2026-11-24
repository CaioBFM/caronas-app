import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

for (const legacy of [false, true]) {
  test(
    legacy
      ? "recupera o esquema v2 antigo e preserva caronas"
      : "migra v1, persiste caronas e reverte gravações parciais",
    async (t) => {
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
      if (legacy)
        db.exec(`
    INSERT INTO schema_migrations VALUES (2, '2026-01-02');
    CREATE TABLE rides(id TEXT PRIMARY KEY, date INTEGER, route TEXT, distance REAL, fuel_cost_cents INTEGER, fare_cents INTEGER);
    CREATE TABLE ride_passengers(ride_id TEXT REFERENCES rides(id), person_id TEXT, PRIMARY KEY(ride_id, person_id));
    INSERT INTO rides VALUES ('1700000000000', 110, 'Rota antiga', 12, 720, 260);
    INSERT INTO ride_passengers VALUES ('1700000000000', '1');
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
      const {
        loadData,
        saveRide,
        deleteRide,
        archivePerson,
        savePayment,
        deletePayment,
        savePreferences,
        exportBackup,
        restoreBackup,
        saveRoute,
      } = await import(
        legacy ? "../src/database.ts?legacy" : "../src/database.ts"
      );
      const initial = await loadData();
      assert.deepEqual(
        initial.people.map((p) => p.id),
        [1, 2],
      );
      assert.equal(initial.routes[0].name, "Rota teste");
      assert.equal(initial.settings.dark, true);
      await assert.rejects(saveRoute({ name: "Outra rota", km: NaN }));
      await saveRoute({ name: "Rota nova", km: 12 });
      await assert.rejects(saveRoute({ name: "rota nova", km: 22 }));
      assert.equal(
        (await loadData()).routes.find((r) => r.name === "Rota nova").km,
        12,
      );
      if (legacy) {
        assert.deepEqual(
          initial.rides.map(({ id, fareCents, passengers }) => ({
            id,
            fareCents,
            passengers,
          })),
          [{ id: 1700000000000, fareCents: 260, passengers: [1] }],
        );
        await deleteRide(initial.rides[0].id);
      } else assert.deepEqual(initial.rides, []);
      assert.equal(
        db
          .prepare("SELECT MAX(version) AS version FROM schema_migrations")
          .get().version,
        4,
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
          reopened
            .prepare("SELECT fare_cents FROM rides WHERE id=?")
            .get(ride.id).fare_cents,
          300,
        );
      } finally {
        reopened.close();
      }
      await savePreferences({ ...pricing, gasPrice: 7, dark: false });
      assert.deepEqual((await loadData()).rides, [ride]);
      await assert.rejects(
        saveRide({ ...draft, passengers: [1, 99] }, ride.id),
      );
      await assert.rejects(saveRide({ ...draft, passengers: [1, 99] }));
      await assert.rejects(saveRide({ ...draft, passengers: [1, 1] }));
      await assert.rejects(archivePerson(1), /sem dívidas/);
      for (const invalid of [0, -1, 1.5, Infinity, 301])
        await assert.rejects(savePayment(1, invalid));
      const partial = await savePayment(1, 125);
      const total = await savePayment(1, 175);
      await assert.rejects(savePayment(1, 1), /saldo devedor/);
      await assert.rejects(savePayment(1, 126, partial), /saldo devedor/);
      await assert.rejects(deleteRide(ride.id), /mais pagamentos/);
      await assert.rejects(
        saveRide({ ...draft, fareCents: 299 }, ride.id),
        /mais pagamentos/,
      );
      await assert.rejects(
        saveRide({ ...draft, passengers: [2] }, ride.id),
        /mais pagamentos/,
      );

      const corrected = await savePayment(1, 100, partial);
      assert.deepEqual(corrected, { ...partial, amountCents: 100 });
      await deletePayment(total.id);
      const final = await savePayment(1, 200);
      await archivePerson(1);
      assert.equal((await loadData()).people[0].archived, true);
      assert.deepEqual(
        (await loadData()).payments.map((payment) => ({ ...payment })),
        [final, corrected],
      );
      const backup = await exportBackup();
      const original = JSON.parse(backup);
      assert.equal(original.version, 1);
      assert.equal(original.data.people[0].archived, true);
      assert.deepEqual(original.data.payments, [final, corrected]);

      const altered = structuredClone(original);
      altered.data.people[0].name = "Pessoa restaurada";
      altered.data.routes = [];
      altered.data.settings.dark = true;
      const changedBackup = JSON.stringify(altered);
      await assert.rejects(
        restoreBackup(JSON.stringify({ ...original, version: 99 })),
        /incompatível/,
      );
      const invalid = structuredClone(original);
      invalid.data.payments[0].amountCents = 301;
      await assert.rejects(restoreBackup(JSON.stringify(invalid)), /inválido/);
      const duplicate = structuredClone(original);
      duplicate.data.rides.push(duplicate.data.rides[0]);
      await assert.rejects(
        restoreBackup(JSON.stringify(duplicate)),
        /inválido/,
      );
      const missingPerson = structuredClone(original);
      missingPerson.data.rides[0].passengers.push(99);
      await assert.rejects(
        restoreBackup(JSON.stringify(missingPerson)),
        /inválido/,
      );
      assert.equal(await exportBackup(), backup);
      db.exec(`
        CREATE TRIGGER fail_restore BEFORE INSERT ON settings
        BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;
      `);
      await assert.rejects(restoreBackup(changedBackup), /falha simulada/);
      assert.equal(await exportBackup(), backup);
      db.exec("DROP TRIGGER fail_restore");

      const restored = await restoreBackup(changedBackup);
      assert.equal(
        restored.people.find((p) => p.id === 1).name,
        "Pessoa restaurada",
      );
      assert.deepEqual((await loadData()).routes, []);
      assert.equal(restored.settings.dark, true);
      assert.deepEqual(restored.rides, [ride]);
      assert.deepEqual(JSON.parse(await exportBackup()).data.payments, [
        final,
        corrected,
      ]);
      await restoreBackup(backup);
      assert.equal(await exportBackup(), backup);
      await assert.rejects(saveRide(draft), /Passageiro indisponível/);
      const afterRestart = new DatabaseSync(file, { readOnly: true });
      try {
        assert.equal(
          afterRestart
            .prepare("SELECT SUM(amount_cents) AS total FROM payments")
            .get().total,
          300,
        );
        assert.equal(
          afterRestart
            .prepare("SELECT balance FROM person_balances WHERE id='1'")
            .get().balance,
          0,
        );
      } finally {
        afterRestart.close();
      }
      await deletePayment(final.id);
      assert.equal(
        db.prepare("SELECT balance FROM person_balances WHERE id='1'").get()
          .balance,
        200,
      );
      await deletePayment(corrected.id);
      assert.deepEqual((await loadData()).rides, [ride]);

      const edited = await saveRide(
        {
          ...draft,
          km: 8,
          passengers: [1],
          fuelCostCents: 480,
          fareCents: 240,
        },
        ride.id,
      );
      assert.deepEqual((await loadData()).rides, [edited]);
      await deleteRide(ride.id);
      assert.deepEqual((await loadData()).rides, []);
      assert.equal(
        db.prepare("SELECT COUNT(*) AS total FROM ride_passengers").get().total,
        0,
      );
    },
  );
}
