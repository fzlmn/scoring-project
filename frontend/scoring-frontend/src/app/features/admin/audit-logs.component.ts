import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../shared/components/sidebar.component';
import { TopbarComponent } from '../../shared/components/topbar.component';
import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog } from '../../core/models/audit-log.model';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  template: `
    <div class="layout">
      <app-sidebar></app-sidebar>
      <div class="main-content">
        <app-topbar></app-topbar>
        <div class="content">
          <h2>Audit Logs</h2>

          <div class="table-container">
            <table class="audit-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Ressource</th>
                  <th>Ressource ID</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let log of auditLogs">
                  <td>{{ log.dateCreation | date:'short' }}</td>
                  <td>{{ log.userId }}</td>
                  <td><span class="badge" [ngClass]="'action-' + log.action">{{ log.action }}</span></td>
                  <td>{{ log.ressource }}</td>
                  <td><code>{{ log.ressourceId }}</code></td>
                  <td class="details">
                    <details>
                      <summary>Voir</summary>
                      <div class="changes">
                        <div *ngIf="log.ancienneValeur" class="change-row">
                          <strong>Avant :</strong>
                          <pre>{{ log.ancienneValeur | json }}</pre>
                        </div>
                        <div *ngIf="log.nouvelleValeur" class="change-row">
                          <strong>Après :</strong>
                          <pre>{{ log.nouvelleValeur | json }}</pre>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="auditLogs.length === 0" class="empty-state">
            Aucun log d'audit trouvé
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
      background: #F5F5F7;
    }

    .main-content {
      flex: 1;
      margin-left: 280px;
    }

    .content {
      padding: 30px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1A1A2E;
      margin: 0 0 30px 0;
      font-family: 'Sora', sans-serif;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
      overflow-x: auto;
    }

    .audit-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
    }

    thead {
      background: #F5F5F7;
    }

    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #1A1A2E;
      border-bottom: 1px solid #E5E5EA;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #E5E5EA;
      color: #666;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }

    .action-CREATE {
      background: #E3F5EE;
      color: #2D9C6A;
    }

    .action-UPDATE {
      background: #E3F0FF;
      color: #1A6FD4;
    }

    .action-DELETE {
      background: #FCE3E3;
      color: #D94040;
    }

    code {
      background: #F5F5F7;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 11px;
    }

    .details {
      max-width: 200px;
    }

    details {
      cursor: pointer;
    }

    summary {
      color: #1A6FD4;
      font-weight: 600;
      outline: none;
    }

    summary:hover {
      text-decoration: underline;
    }

    .changes {
      margin-top: 10px;
      background: #F5F5F7;
      padding: 10px;
      border-radius: 4px;
    }

    .change-row {
      margin-bottom: 10px;
    }

    .change-row:last-child {
      margin-bottom: 0;
    }

    strong {
      display: block;
      font-size: 11px;
      margin-bottom: 5px;
      color: #1A1A2E;
    }

    pre {
      margin: 0;
      background: white;
      padding: 8px;
      border-radius: 3px;
      font-size: 10px;
      overflow-x: auto;
      border: 1px solid #E5E5EA;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #888;
      font-family: 'DM Sans', sans-serif;
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  auditLogs: AuditLog[] = [];

  constructor(private auditLogService: AuditLogService) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.auditLogService.getAuditLogs().subscribe({
      next: (data) => {
        this.auditLogs = data;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des audit logs', err);
      },
    });
  }
}
