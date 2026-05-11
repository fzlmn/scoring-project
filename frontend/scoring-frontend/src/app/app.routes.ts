import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/clients/clients-list.component').then(m => m.ClientsListComponent),
      },
      {
        path: 'clients/nouveau',
        canActivate: [roleGuard],
        data: { roles: ['CHARGE_CLIENTELE'] },
        loadComponent: () => import('./features/clients/client-form.component').then(m => m.ClientFormComponent),
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./features/clients/client-detail.component').then(m => m.ClientDetailComponent),
      },
      {
        path: 'scores',
        canActivate: [roleGuard],
        data: { roles: ['SUPERVISEUR'] },
        loadComponent: () => import('./features/scores/scores-validation.component').then(m => m.ScoresValidationComponent),
      },
      {
        path: 'alertes',
        canActivate: [roleGuard],
        data: { roles: ['SUPERVISEUR'] },
        loadComponent: () => import('./features/alertes/alertes.component').then(m => m.AlertesComponent),
      },
      {
        path: 'simulations',
        canActivate: [roleGuard],
        data: { roles: ['SUPERVISEUR'] },
        loadComponent: () => import('./features/simulations/simulations.component').then(m => m.SimulationsComponent),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
      },
      {
        path: 'admin/utilisateurs',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        loadComponent: () => import('./features/admin/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'admin/audit-logs',
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRATEUR'] },
        loadComponent: () => import('./features/admin/audit-logs.component').then(m => m.AuditLogsComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
