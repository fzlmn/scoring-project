import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alerte, AlerteSummary } from '../models/alerte.model';

@Injectable({ providedIn: 'root' })
export class AlerteService {
  private apiUrl = 'http://localhost:8080/api/alertes';

  constructor(private http: HttpClient) {}

  getAlertes(): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(this.apiUrl);
  }

  getAlertesNonLues(): Observable<Alerte[]> {
    return this.http.get<Alerte[]>(`${this.apiUrl}/non-lues`);
  }

  updateStatut(alerteId: string, statut: 'LUE' | 'TRAITEE'): Observable<Alerte> {
    return this.http.patch<Alerte>(`${this.apiUrl}/${alerteId}/statut`, { statut });
  }

  getAlerteSummary(): Observable<AlerteSummary> {
    return this.http.get<AlerteSummary>(`${this.apiUrl}/summary`);
  }
}
