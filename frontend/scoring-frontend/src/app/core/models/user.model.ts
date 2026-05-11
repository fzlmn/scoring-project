export interface User {
  id?: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'CHARGE_CLIENTELE' | 'ANALYSTE' | 'SUPERVISEUR' | 'ADMINISTRATEUR';
  password?: string;
  actif: boolean;
  dateCreation?: string;
  dateModification?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'CHARGE_CLIENTELE' | 'ANALYSTE' | 'SUPERVISEUR' | 'ADMINISTRATEUR';
}

export interface LoginResponse extends AuthResponse {
  token: string;
}

export interface CreatedUserResponse extends User {
  generatedPassword?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
