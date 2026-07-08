import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private apiUrl = 'http://localhost:8080/api/clients';

  constructor(private http: HttpClient) {}

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl);
  }

  getClientById(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  createClient(client: Partial<Client>): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  updateClient(id: string, client: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, client);
  }

  recalculerScore(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/recalculer-score`, {});
  }

  exportClient(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${id}/export`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  /** Export Excel de la liste des clients (respecte les filtres nom/CIN affichés). */
  exportClients(searchNom = '', searchCin = ''): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (searchNom) params = params.set('searchNom', searchNom);
    if (searchCin) params = params.set('searchCin', searchCin);
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }
}
