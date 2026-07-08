import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page, Score, ScoreListItem, ScoreQuery, ScoreSummary } from '../models/score.model';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private apiUrl = 'http://localhost:8080/api/scores';

  constructor(private http: HttpClient) {}

  /** Historique paginé des scores (filtres optionnels ; périmètre géré côté serveur selon le rôle). */
  getScores(query: ScoreQuery = {}): Observable<Page<ScoreListItem>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 100));
    if (query.statut) params = params.set('statut', query.statut);
    if (query.niveauRisque) params = params.set('niveauRisque', query.niveauRisque);
    if (query.clientId != null && query.clientId !== '') params = params.set('clientId', String(query.clientId));
    if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
    if (query.dateTo) params = params.set('dateTo', query.dateTo);
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<Page<ScoreListItem>>(this.apiUrl, { params });
  }

  /** Détail complet d'un score (narration + explications SHAP). */
  getScore(id: number | string): Observable<Score> {
    return this.http.get<Score>(`${this.apiUrl}/${id}`);
  }

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
