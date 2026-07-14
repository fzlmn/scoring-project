import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Mémorise l'historique de navigation interne à l'application afin de proposer
 * un libellé de retour contextuel (« Retour aux alertes », « Retour au client »…).
 * Angular n'expose pas nativement l'URL précédente : on la reconstruit ici.
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private history: string[] = [];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.history.push(e.urlAfterRedirects);
        if (this.history.length > 30) this.history.shift();
      });
  }

  /** URL de la page précédente (celle vers laquelle « Retour » ramène), ou null. */
  get previousUrl(): string | null {
    return this.history.length > 1 ? this.history[this.history.length - 2] : null;
  }
}
