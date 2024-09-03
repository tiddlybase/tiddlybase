import type { TiddlerStorageSpec } from "./tiddlybase-config-schema";
import type {} from "@tiddlybase/tw5-types/src/index";

export type UserId = string;
// These persistence providers support storing ACLs in firebase
export const PERMISSIONED_DATA_STORAGE:Readonly<Array<TiddlerStorageSpec['type']>> = ['firestore', 'firebase-storage'] as const;
export type PermissionedStorage = typeof PERMISSIONED_DATA_STORAGE[number];

// START soon-to-be-deprecated role id based types
// CollectionPermissions: collection_name -> numeric_role (within [1,3])
export type CollectionPermissions = Record<string, number>;
export type InstanceUserPermissions = Partial<Record<PermissionedStorage, CollectionPermissions>>;
export type InstanceSpec = {
  "user-permissions": Record<UserId, Partial<InstanceUserPermissions>>;
  "unauthenticated-permissions"?: Partial<InstanceUserPermissions>;
}
// END soon-to-be-deprecated role id based types

// Start new role-based access control types
export type CollectionAccessPermissions = Partial<{
  read: boolean,
  write: boolean
}>

// collection name => collection access permissions
export type AccessConfig = Record<string, CollectionAccessPermissions>;

/** storage type => Access config
eg:
```json
{
  "firestore": {
    "shared": {
      "read": true,
      "write": false
    }
  }
}
```
*/
export type AccessByStorageType = Partial<Record<PermissionedStorage, AccessConfig>>;


export type InstanceConfiguration = {
  roles: {
    // role name => access config
    "role-definitions": Record<string, AccessByStorageType>;
    // user id => role name
    "user-roles"?: Record<string, string>;
    "unauthenticated-role"?: string;
    "authenticated-role"?: string;
  }
}
