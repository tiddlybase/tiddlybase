import { ADMIN_INSTANCE_NAME } from "./constants";
import type { PermissionedDataSource, InstanceSpec, UserId } from "./instance-spec-schema"
import {merge} from 'lodash';

export const instanceSpecPath = (instanceName:string) => `tiddlybase-instances/${ADMIN_INSTANCE_NAME}/collections/instances/tiddlers/${instanceName}`

export const addInstancePermissions = (
  instanceSpec:InstanceSpec,
  resourceType: PermissionedDataSource,
  userId: UserId,
  collectionName: string,
  role:number):InstanceSpec => merge(instanceSpec, {
    permissions: {
      [userId]: {
        [resourceType]: {
          [collectionName]: role
        }
      }
    }
  });
