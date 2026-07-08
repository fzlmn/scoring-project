import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Periode } from '../../shared/components/ui/time-filter.component';

/**
 * Holds the dashboard time-granularity selection and persists it (localStorage)
 * so the chosen filter is preserved while navigating between pages.
 * Designed so a future backend `periode` parameter can drive the same value.
 */
@Injectable({ providedIn: 'root' })
export class DashboardPeriodService {
  private readonly key = 'dashboard.periode';
  private readonly subject: BehaviorSubject<Periode>;
  readonly periode$;

  constructor() {
    const stored = (localStorage.getItem(this.key) as Periode) || 'jour';
    this.subject = new BehaviorSubject<Periode>(stored);
    this.periode$ = this.subject.asObservable();
  }

  get current(): Periode {
    return this.subject.value;
  }

  set(p: Periode): void {
    localStorage.setItem(this.key, p);
    this.subject.next(p);
  }
}
