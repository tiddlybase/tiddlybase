export const USER_ROLES:Record<string, number> = {
  ANONYMOUS: 0,
  USER: 1,
  EDITOR: 2,
  ADMIN: 3
};

export type TiddlyBaseUser = {
  emailVerified?: boolean,
  displayName?: string,
  photoURL?: string,
  providerId?: string,
  userId: string
}

export const substituteUserid = (template: string, userid: string): string => template.replace("$USERID", () => userid);
