export interface UserData {
  email: string;
  password: string;
  role: UserRole;
  username: string;
}
export type UserRole = "ADMIN" | "USER";
