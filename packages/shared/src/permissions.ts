import { INSTANCE_CONFIGURATION_TIDDLER_NAME, ADMIN_COLLECTION_NAME } from "./constants";
import type { PermissionedStorage, InstanceSpec, UserId, InstanceConfiguration } from "./instance-spec-schema"

export const instanceConfigurationPath = (instance: string) => `tiddlybase-instances/${encodeURIComponent(instance)}/collections/${encodeURIComponent(ADMIN_COLLECTION_NAME)}/tiddlers/${encodeURIComponent(INSTANCE_CONFIGURATION_TIDDLER_NAME)}`
export const instanceConfigurationTitle = `${ADMIN_COLLECTION_NAME}/${INSTANCE_CONFIGURATION_TIDDLER_NAME}`

export const makeInstanceUserPermissionsUpdate = (
  resourceType: PermissionedStorage,
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
  resourceType: PermissionedStorage,
  collectionName: string,
  role: number): Partial<InstanceSpec> => ({
    "unauthenticated-permissions": {
      [resourceType]: {
        [collectionName]: role
      }
    }
  });

export const makeInstanceConfiguration = (
  userId: UserId,
): InstanceConfiguration => ({
  roles: {
    // hardcoded for now, should be customizable in the future
    "role-definitions": {
      // Role for an unauthenticated visitor to the tiddlybase instance.
      // They should be able to view the public firestore collection
      // private tiddlers cannot be stored on the backend since they
      // are not logged in.
      "unauthenticated-visitor": {
        "firestore": {
          public: {
            read: true,
            write: false
          }
        },
        // they should be able to read uploaded files
        // TODO: in the future -similar to tiddlers- there should be
        // public and internal files, the latter for developers only.
        "firebase-storage": {
          files: {
            read: true,
            write: false
          }
        }
      },
      // Role for an authenticated visitor to the tiddlybase instance.
      // They should be able to view the public firestore collection
      // private tiddlers can be stored on the backend using their user id
      "authenticated-visitor": {
        "firestore": {
          public: {
            read: true,
            write: false
          },
          "user:{{userId}}": {
            read: true,
            write: true
          },
        },
        "firebase-storage": {
          files: {
            read: true,
            // TODO: we may want to allow signed-in visitors to upload files in the future
            write: false
          }
        }
      },
      // Role for a developer of the tiddlybase instance.
      // They should be able to read and write the public firestore collection,
      // as well as the internal collection.
      // private tiddlers can be stored on the backend using their user id.
      "developer": {
        "firestore": {
          public: {
            read: true,
            write: true
          },
          internal: {
            read: true,
            write: true
          },
          "user:{{userId}}": {
            read: true,
            write: true
          },
          // developers may read the admin collection but not write to it
          admin: {
            read: true,
            write: false
          },
        },
        "firebase-storage": {
          files: {
            read: true,
            write: true
          }
        }
      },
      // Role for an admin of the tiddlybase instance.
      // In addition to developer permissions, admins can also
      // add users to the tiddlybase instance and change user roles
      "admin": {
        "firestore": {
          public: {
            read: true,
            write: true
          },
          internal: {
            read: true,
            write: true
          },
          "user:{{userId}}": {
            read: true,
            write: true
          },
          admin: {
            read: true,
            write: true
          },
        },
        "firebase-storage": {
          files: {
            read: true,
            write: true
          }
        }
      }
    },
    "user-roles": {},
    "authenticated-role": "authenticated-visitor",
    "unauthenticated-role": "unauthenticated-visitor"
  },
  "users-with-access": [userId]
});
