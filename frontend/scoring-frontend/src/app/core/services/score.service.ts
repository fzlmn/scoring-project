import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Score, ScoreSummary } from '../models/score.model';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private apiUrl = 'http://localhost:8080/api/scores';

  constructor(private http: HttpClient) {}

  getScoresEnAttente(): Observable<Score[]> {
    return this.http.get<Score[]>(`${this.apiUrl}/en-attente`);
  }

  getScoresParClient(clientId: string): Observable<Score[]> {
    return this.http.get<Score[]>(`${this.apiUrl}/client/${clientId}`);
  }

  validerScore(scoreId: string, statut: 'VALIDE' | 'REJETE'): Observable<Score> {
    return this.http.patch<Score>(`${this.apiUrl}/${scoreId}/valider`, { statut });
  }

  getScoreSummary(): Observable<ScoreSummary> {
    return this.http.get<ScoreSummary>(`${this.apiUrl}/summary`);
  }
}
