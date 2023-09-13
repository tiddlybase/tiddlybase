import { TiddlyBaseUser } from "./users";

export interface AuthDetails {
  lastLogin?: Date
}

export type OnLoginHandler = (user:TiddlyBaseUser, authDetails: AuthDetails) => void;
export type OnLogoutHandler = () => void;


export interface AuthProvider {

  onLogin: (loginHandler: OnLoginHandler)=>void;
  onLogout: (logoutHandler:OnLogoutHandler)=>void;
  getCurrentUser: () => TiddlyBaseUser | undefined;
  signOut: () => Promise<void>;
}
