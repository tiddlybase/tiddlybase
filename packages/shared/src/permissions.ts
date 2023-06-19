import { ADMIN_INSTANCE_NAME } from "./constants";
import type { InstanceResourceType, InstanceSpec, UserId } from "./instance-spec-schema"
import {merge} from 'lodash';

export const instanceSpecPath = (instanceName:string) => `tiddlybase-instances/${ADMIN_INSTANCE_NAME}/collections/instances/tiddlers/${instanceName}`

export const addInstancePermissions = (
  instanceSpec:InstanceSpec,
  resourceType: InstanceResourceType,
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
