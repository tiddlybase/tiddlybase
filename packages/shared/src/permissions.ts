import { ADMIN_INSTANCE_NAME } from "./constants";
import type { PermissionedDataSource, InstanceSpec, UserId } from "./instance-spec-schema"

export const instanceSpecPath = (instanceName: string) => `tiddlybase-instances/${encodeURIComponent(ADMIN_INSTANCE_NAME)}/collections/instances/tiddlers/${encodeURIComponent(instanceName)}`

export const makeInstanceUserPermissionsUpdate = (
  resourceType: PermissionedDataSource,
  userId: UserId,
  collectionName: string,
  role: number): InstanceSpec => ({
    "user-permissions": {
      [userId]: {
        [resourceType]: {
          [collectionName]: role
        }
      }
    }
  });

export const makeInstanceUnauthenticatedPermissionsUpdate = (
  resourceType: PermissionedDataSource,
  collectionName: string,
  role: number): Partial<InstanceSpec> => ({
    "unauthenticated-permissions": {
        [resourceType]: {
          [collectionName]: role
        }
    }
  });
