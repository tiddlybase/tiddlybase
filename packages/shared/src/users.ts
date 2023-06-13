export const USER_ROLES:Record<string, number> = {
  ANONYMOUS: 0,
  USER: 1,
  ADMIN: 2
};

export type TiddlyBaseUser = {
  emailVerified?: boolean,
  displayName?: string,
  photoURL?: string,
  providerId?: string,
  userId: string
}
