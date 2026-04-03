import { useMemo } from 'react';
import { DbConnection } from '../module_bindings';
import { getToken } from './auth';

const SPACETIMEDB_HOST = 'wss://maincloud.spacetimedb.com';
const SPACETIMEDB_MODULE = 'byte-module-ae78j';

/**
 * Creates a DbConnectionBuilder for use in SpacetimeDBProvider.
 */
export function createConnectionBuilder() {
  const token = getToken() ?? undefined;
  const builder = DbConnection.builder()
    .withUri(SPACETIMEDB_HOST)
    .withDatabaseName(SPACETIMEDB_MODULE);

  if (token) builder.withToken(token);

  builder
    .onConnect(() => {
      console.log('[spacetimedb] Connected');
    })
    .onConnectError((_conn: unknown, err: unknown) => {
      console.error('[spacetimedb] Connection error:', err);
    })
    .onDisconnect(() => {
      console.warn('[spacetimedb] Disconnected');
    });

  return builder;
}

/**
 * Hook that creates a stable (memoized) connection builder.
 * Must only be called once — used in SpacetimeDBProvider.
 */
export function useConnectionBuilder() {
  return useMemo(() => createConnectionBuilder(), []);
}
