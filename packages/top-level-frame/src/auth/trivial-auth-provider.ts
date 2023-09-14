import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import { AuthProvider, OnLoginHandler, OnLogoutHandler } from "@tiddlybase/shared/src/auth-provider";

export class TrivialAuthProvider implements AuthProvider {
  user?: TiddlyBaseUser;
  constructor(user?:TiddlyBaseUser) {
    this.user = user;
  }
  onLogin (loginHandler: OnLoginHandler) {
    // immediately invoke onLogin handler
    if (this.user) {
      loginHandler(this.user, {});
    }
  }
  onLogout (logoutHandler: OnLogoutHandler) {
    if (!this.user) {
      logoutHandler();
    }
  }
  getCurrentUser () {
    return this.user;
  }

  async signOut () {
    // noop
  }

}
