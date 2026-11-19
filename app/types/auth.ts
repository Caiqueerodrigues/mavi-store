export type Role = "admin" | "manager" | "operator" | "viewer";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  active?: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
};

export type UserListItem = Omit<User, "mustChangePassword">;
