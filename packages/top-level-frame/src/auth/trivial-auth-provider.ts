import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";
import { AuthProvider, OnLoginHandler, OnLogoutHandler } from "./auth-provider";

export class TrivialAuthProvider implements AuthProvider {
  user: TiddlyBaseUser;
  constructor(user:TiddlyBaseUser) {
    this.user = user;
  }
  onLogin (loginHandler: OnLoginHandler) {
    // immediately invoke onLogin handler
    loginHandler(this. user, {});
  }
  onLogout (_logoutHandler: OnLogoutHandler) {
    // the onlogout handler is never called
  }
  getCurrentUser () {
    return this.user;
  }

}
