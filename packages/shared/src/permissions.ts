import { ADMIN_INSTANCE_NAME } from "./constants";
import type { PermissionedDataSource, InstanceSpec, UserId } from "./instance-spec-schema"

export const instanceSpecPath = (instanceName:string) => `tiddlybase-instances/${ADMIN_INSTANCE_NAME}/collections/instances/tiddlers/${instanceName}`

export const makeInstancePermissionsUpdate = (
  instanceSpec:InstanceSpec,
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
