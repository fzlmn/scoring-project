import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse, User, AuthState } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api';
  private authState = new BehaviorSubject<AuthState>({
    token: localStorage.getItem('token'),
    user: this.getUserFromStorage(),
    isAuthenticated: !!localStorage.getItem('token'),
  });

  authState$ = this.authState.asObservable();

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, request).pipe(
      tap((response) => {
        const user: User = {
          email: response.email,
          nom: response.nom,
          prenom: response.prenom,
          role: response.role,
          actif: true,
        };

        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(user));
        this.authState.next({
          token: response.token,
          user,
          isAuthenticated: true,
        });
      })
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.authState.next({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  }

  getAuthState(): AuthState {
    return this.authState.value;
  }

  isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated;
  }

  getToken(): string | null {
    return this.authState.value.token;
  }

  getUser(): User | null {
    return this.authState.value.user;
  }

  hasRole(role: string): boolean {
    return this.getUser()?.role === role;
  }

  isSuperviseur(): boolean {
    return this.hasRole('SUPERVISEUR');
  }

  /**
   * Seul le superviseur peut exporter des données opérationnelles
   * (listes, tableaux, rapports de tableau de bord).
   */
  canExport(): boolean {
    return this.isSuperviseur();
  }

  private getUserFromStorage(): User | null {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined' || user === 'null') {
      return null;
    }

    try {
      return JSON.parse(user);
    } catch {
      console.warn('Invalid user object in localStorage, resetting auth user.');
      return null;
    }
  }
}
