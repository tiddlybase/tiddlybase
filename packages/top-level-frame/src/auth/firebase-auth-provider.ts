import { AuthDetails, AuthProvider, OnLoginHandler, OnLogoutHandler } from "./auth-provider";
import { FirebaseApp } from '@firebase/app'
import { getAuth, Auth, User } from '@firebase/auth'
import { TiddlyBaseUser } from "packages/shared/src/users";
import { Lazy } from "@tiddlybase/shared/src/lazy";


export const convertUser = (firebaseUser: User): TiddlyBaseUser => ({
  emailVerified: firebaseUser.emailVerified,
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
  providerId: firebaseUser.providerId,
  userId: firebaseUser.uid
})

export const getAuthDetails = (user: User): AuthDetails => {
  const lastLoginTimestamp:string|undefined = (user as any)?.reloadUserInfo?.lastLoginAt
  const authDetails:AuthDetails = {};
  if (lastLoginTimestamp) {
    authDetails.lastLogin = new Date(parseInt(lastLoginTimestamp, 10));
  }
  return authDetails;
}

export class FirebaseAuthProvider implements AuthProvider {
  auth: Auth;
  loginHanders: OnLoginHandler[] = [];
  logoutHandlers: OnLogoutHandler[] = [];

  constructor(lazyFirebaseApp: Lazy<FirebaseApp>) {
    this.auth = getAuth(lazyFirebaseApp());
    this.init();
  }

  onLogin(loginHandler: OnLoginHandler) {
    this.loginHanders.push(loginHandler);
  };

  onLogout(logoutHandler: OnLogoutHandler) {
    this.logoutHandlers.push(logoutHandler);
  }

  invokeLoginHanders(user: TiddlyBaseUser, authDetails: AuthDetails) {
    this.loginHanders.forEach(h => h(user, authDetails));
  }

  invokeLogoutHandlers() {
    this.logoutHandlers.forEach(h => h());
  }

  init() {
    this.auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        this.invokeLoginHanders(convertUser(user), getAuthDetails(user));
      } else {
        this.invokeLogoutHandlers();
      }
    });
  }

  getCurrentUser() {
    const user = this.auth.currentUser;
    return user ? convertUser(user) : undefined;
  }

  async signOut () {
    this.auth.signOut();
  }

}
