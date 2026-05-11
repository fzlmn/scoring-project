import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatedUserResponse, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: User): Observable<CreatedUserResponse> {
    return this.http.post<CreatedUserResponse>(this.apiUrl, user);
  }

  updateUser(id: string, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  activerUser(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/activer`, {});
  }

  desactiverUser(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/desactiver`, {});
  }

  reinitialiserMotDePasse(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/reinitialiser-mot-de-passe`, {});
  }
}
