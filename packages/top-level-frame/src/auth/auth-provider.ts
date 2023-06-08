import { TiddlyBaseUser } from "@tiddlybase/shared/src/users";

export type OnLoginHandler = (user:TiddlyBaseUser) => void;
export type OnLogoutHandler = () => void;

export interface AuthProvider {

  init?: () => void;
  onLogin: (loginHandler: OnLoginHandler)=>void;
  onLogout: (logoutHandler:OnLogoutHandler)=>void;
  getCurrentUser: () => TiddlyBaseUser | undefined;
}
