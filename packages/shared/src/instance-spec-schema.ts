export type UserId = string;

// CollectionPermissions: collection_name -> numeric_role (within [1,3])
export type CollectionPermissions = Record<string, number>;

export type InstanceUserPermissions = {
  files: CollectionPermissions
  collections: CollectionPermissions
}

export type InstanceResourceType = keyof InstanceUserPermissions;

export type InstanceSpec = {
  permissions: Record<UserId, Partial<InstanceUserPermissions>>;
}
