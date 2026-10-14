export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}
export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput extends LoginInput {
  displayName: string;
}
