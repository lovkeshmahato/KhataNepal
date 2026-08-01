import { openDB, type IDBPDatabase } from "idb";
import type { CreateSaleInput } from "@khatanepal/types";

const DB_NAME = "khatanepal-offline";
const STORE = "pending-sales";

interface QueuedSale {
  id: string;
  payload: CreateSaleInput;
  createdAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineSale(payload: CreateSaleInput): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  if (db) await db.put(STORE, { id, payload, createdAt: Date.now() } satisfies QueuedSale);
  return id;
}

export async function getQueuedSales(): Promise<QueuedSale[]> {
  const db = await getDb();
  if (!db) return [];
  return db.getAll(STORE);
}

export async function removeQueuedSale(id: string): Promise<void> {
  const db = await getDb();
  if (db) await db.delete(STORE, id);
}

export async function queuedSaleCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  return db.count(STORE);
}

/**
 * Flushes any sales recorded while offline. Called on reconnect (see
 * `useOfflineSync`). Each queued sale is POSTed sequentially — sequential
 * (not parallel) so stock/register-session state stays consistent if two
 * queued sales touch the same product.
 */
export async function flushOfflineQueue(submit: (payload: CreateSaleInput) => Promise<unknown>): Promise<number> {
  const queued = await getQueuedSales();
  let synced = 0;
  for (const sale of queued) {
    try {
      await submit(sale.payload);
      await removeQueuedSale(sale.id);
      synced++;
    } catch {
      break; // stop on first failure; remaining sales stay queued for the next attempt
    }
  }
  return synced;
}
