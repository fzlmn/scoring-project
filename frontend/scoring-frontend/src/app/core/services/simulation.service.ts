import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Simulation } from '../models/simulation.model';

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private apiUrl = 'http://localhost:8080/api/simulations';

  constructor(private http: HttpClient) {}

  createSimulation(simulation: Simulation): Observable<Simulation> {
    return this.http.post<Simulation>(this.apiUrl, simulation);
  }

  getSimulations(): Observable<Simulation[]> {
    return this.http.get<Simulation[]>(this.apiUrl);
  }

  getSimulationsByClient(clientId: string): Observable<Simulation[]> {
    return this.http.get<Simulation[]>(`${this.apiUrl}?clientId=${clientId}`);
  }
}
