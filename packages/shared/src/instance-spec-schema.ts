import type { TiddlerDataSourceSpec } from "./tiddlybase-config-schema";

export type UserId = string;

// CollectionPermissions: collection_name -> numeric_role (within [1,3])
export type CollectionPermissions = Record<string, number>;

// These persistence providers support storing ACLs in firebase
export const PERMISSIONED_DATA_SOURCES:Readonly<Array<TiddlerDataSourceSpec['type']>> = ['firestore', 'firebase-storage'] as const;
export type PermissionedDataSource = typeof PERMISSIONED_DATA_SOURCES[number]

export type InstanceUserPermissions = Partial<Record<PermissionedDataSource, CollectionPermissions>>;

export type InstanceSpec = {
  "user-permissions": Record<UserId, Partial<InstanceUserPermissions>>;
  "unauthenticated-permissions"?: Partial<InstanceUserPermissions>;
}
