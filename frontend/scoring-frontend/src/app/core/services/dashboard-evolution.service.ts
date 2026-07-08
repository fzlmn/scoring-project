import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoryCount, DecisionPoint } from '../models/dashboard.model';
import { Periode } from '../../shared/components/ui/time-filter.component';

/**
 * Séries d'évolution par widget : chaque graphique du tableau de bord choisit sa
 * propre période et se rafraîchit indépendamment (endpoints dédiés, scoping par rôle).
 */
@Injectable({ providedIn: 'root' })
export class DashboardEvolutionService {
  private base = 'http://localhost:8080/api/dashboard/evolution';

  constructor(private http: HttpClient) {}

  validations(periode: Periode): Observable<DecisionPoint[]> {
    return this.http.get<DecisionPoint[]>(`${this.base}/validations`, { params: new HttpParams().set('periode', periode) });
  }

  scores(periode: Periode): Observable<CategoryCount[]> {
    return this.http.get<CategoryCount[]>(`${this.base}/scores`, { params: new HttpParams().set('periode', periode) });
  }

  alertes(periode: Periode): Observable<CategoryCount[]> {
    return this.http.get<CategoryCount[]>(`${this.base}/alertes`, { params: new HttpParams().set('periode', periode) });
  }

  clients(periode: Periode): Observable<CategoryCount[]> {
    return this.http.get<CategoryCount[]>(`${this.base}/clients`, { params: new HttpParams().set('periode', periode) });
  }
}
