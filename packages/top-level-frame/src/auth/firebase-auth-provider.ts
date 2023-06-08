import { AuthProvider, OnLoginHandler, OnLogoutHandler } from "./auth-provider";
import { FirebaseApp } from '@firebase/app'
import { getAuth, Auth, User } from '@firebase/auth'
import { TiddlyBaseUser } from "packages/shared/src/users";

export const convertUser = (firebaseUser: User): TiddlyBaseUser => ({
  emailVerified: firebaseUser.emailVerified,
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
  providerId: firebaseUser.providerId,
  uid: firebaseUser.uid
})

export class FirebaseAuthProvider implements AuthProvider {
  auth: Auth;
  loginHanders: OnLoginHandler[] = [];
  logoutHandlers: OnLogoutHandler[] = [];

  constructor(app: FirebaseApp) {
    this.auth = getAuth(app);
  }

  onLogin(loginHandler: OnLoginHandler) {
    this.loginHanders.push(loginHandler);
  };

  onLogout(logoutHandler: OnLogoutHandler) {
    this.logoutHandlers.push(logoutHandler);
  }

  init() {
    this.auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        this.loginHanders.forEach(h => h(convertUser(user)));
      } else {
        this.logoutHandlers.forEach(h => h());
      }
    });
  }

  getCurrentUser() {
    const user = this.auth.currentUser;
    return user ? convertUser(user) : undefined;
  }


}
