export interface AuthUser {
  id: string;
  email: string | null;
  role: 'user' | 'admin';
}
