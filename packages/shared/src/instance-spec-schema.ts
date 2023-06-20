import type { DataSourceSpec } from "./tiddlybase-config-schema";

export type UserId = string;

// CollectionPermissions: collection_name -> numeric_role (within [1,3])
export type CollectionPermissions = Record<string, number>;

// These persistence providers support storing ACLs in firebase
export const PERMISSIONED_DATA_SOURCES:Readonly<Array<DataSourceSpec['type']>> = ['firebase-storage', 'firestore'] as const;
export type PermissionedDataSource = typeof PERMISSIONED_DATA_SOURCES[number]

export type InstanceUserPermissions = Partial<Record<PermissionedDataSource, CollectionPermissions>>;

export type InstanceSpec = {
  permissions: Record<UserId, Partial<InstanceUserPermissions>>;
}
