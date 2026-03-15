import { getDb } from '../lib/db';

/**
 * Returns the singleton SQLite database instance.
 * The DB layer uses a lazy-initialized module-level singleton via getDb(),
 * so this hook simply surfaces that instance for use in React Query hooks.
 */
export const useDatabase = () => getDb();
