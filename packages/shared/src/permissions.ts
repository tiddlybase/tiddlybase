import { ADMIN_INSTANCE_NAME } from "./constants";
import type { PermissionedDataSource, InstanceSpec, UserId } from "./instance-spec-schema"

export const instanceSpecPath = (instanceName:string) => `tiddlybase-instances/${encodeURIComponent(ADMIN_INSTANCE_NAME)}/collections/instances/tiddlers/${encodeURIComponent(instanceName)}`

export const makeInstancePermissionsUpdate = (
  resourceType: PermissionedDataSource,
  userId: UserId,
  collectionName: string,
  role:number):InstanceSpec => ({
    permissions: {
      [userId]: {
        [resourceType]: {
          [collectionName]: role
        }
      }
    }
  });
