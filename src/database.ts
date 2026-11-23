import * as SQLite from 'expo-sqlite';
import type { Person, Route } from './model';

export type Preferences = { consumption:number; gasPrice:number; minFare:number; maxFare:number; dark:boolean };
let dbPromise: Promise<SQLite.SQLiteDatabase> | undefined;
async function database() {
  if (!dbPromise) dbPromise = (async()=>{
    const db=await SQLite.openDatabaseAsync('caronas.db');
    await db.execAsync('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);');
    const row=await db.getFirstAsync<{version:number}>('SELECT MAX(version) AS version FROM schema_migrations');
    if((row?.version??0)<1) await db.withTransactionAsync(async()=>{
      await db.execAsync('CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL); CREATE TABLE IF NOT EXISTS routes (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE, km REAL NOT NULL CHECK(km > 0 AND km <= 40)); CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), consumption REAL NOT NULL, gas_price REAL NOT NULL, min_fare REAL NOT NULL, max_fare REAL NOT NULL, dark INTEGER NOT NULL);');
      await db.runAsync('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)',new Date().toISOString());
      await db.runAsync('INSERT OR IGNORE INTO settings VALUES(1,12,6.1,1,3,0)');
    });
    return db;
  })();
  return dbPromise;
}
export async function loadData(){const db=await database();const people=await db.getAllAsync<Person>('SELECT id, name FROM people ORDER BY name COLLATE NOCASE');let routes=await db.getAllAsync<Route>('SELECT name, km FROM routes ORDER BY name COLLATE NOCASE');if(!routes.length){for(const [name,km] of [['UFLA',12],['Centro',7]] as const)await db.runAsync('INSERT OR IGNORE INTO routes(id,name,km) VALUES(?,?,?)',name.toLowerCase(),name,km);routes=await db.getAllAsync<Route>('SELECT name, km FROM routes ORDER BY name COLLATE NOCASE')}const settings=await db.getFirstAsync<{consumption:number;gasPrice:number;minFare:number;maxFare:number;dark:number}>('SELECT consumption,gas_price as gasPrice,min_fare as minFare,max_fare as maxFare,dark FROM settings WHERE id=1');return {people,routes,settings:{consumption:settings?.consumption??12,gasPrice:settings?.gasPrice??6.1,minFare:settings?.minFare??1,maxFare:settings?.maxFare??3,dark:!!settings?.dark}}}
export async function savePerson(p:Person){if(!p.name.trim())throw Error('Nome inválido');const db=await database();await db.runAsync('INSERT INTO people(id,name) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',String(p.id),p.name.trim())}
export async function deletePerson(id:string){const db=await database();await db.runAsync('DELETE FROM people WHERE id=?',id)}
export async function saveRoute(r:Route){if(!r.name.trim()||!Number.isFinite(r.km)||r.km<=0||r.km>40)throw Error('Rota inválida');const db=await database();await db.runAsync('INSERT INTO routes(id,name,km) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET km=excluded.km',r.name.toLowerCase(),r.name.trim(),r.km)}
export async function deleteRoute(name:string){const db=await database();await db.runAsync('DELETE FROM routes WHERE name=?',name)}
export async function savePreferences(p:Preferences){if(![p.consumption,p.gasPrice,p.minFare,p.maxFare].every(n=>Number.isFinite(n)&&n>0)||p.minFare>p.maxFare)throw Error('Configuração inválida');const db=await database();await db.runAsync('UPDATE settings SET consumption=?,gas_price=?,min_fare=?,max_fare=?,dark=? WHERE id=1',p.consumption,p.gasPrice,p.minFare,p.maxFare,p.dark?1:0)}
