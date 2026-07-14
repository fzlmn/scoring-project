import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IconComponent } from '../../shared/components/ui/icon.component';
import { AuthService } from '../../core/services/auth.service';
import { BRANDING } from '../../core/branding';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class="login">
      <!-- ── Panneau de marque ── -->
      <aside class="brand-panel">
        <div class="brand-inner">
          <img class="brand-logo-img" [src]="brand.logoPath" [alt]="brand.fullName" />
          <h1 class="brand-headline">Notation &amp; analyse de crédit</h1>
          <p class="brand-sub">
            Plateforme interne d'évaluation du risque client — scoring assisté par
            intelligence artificielle, validation et pilotage.
          </p>
          <ul class="brand-points">
            <li><app-icon name="bolt" [size]="18"></app-icon> Scoring automatique &amp; explicable</li>
            <li><app-icon name="verified_user" [size]="18"></app-icon> Validation supervisée</li>
            <li><app-icon name="insights" [size]="18"></app-icon> Tableaux de bord par rôle</li>
          </ul>
        </div>
      </aside>

      <!-- ── Formulaire ── -->
      <main class="form-panel">
        <div class="form-card">
          <div class="form-head">
            <h2>Connexion</h2>
            <p>Accédez à votre espace de travail.</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" autocomplete="on">
            <div class="field">
              <label for="email">Email</label>
              <div class="input-wrap">
                <app-icon class="lead" name="mail" [size]="18"></app-icon>
                <input id="email" type="email" formControlName="email" placeholder="prenom.nom@orus.ma" autocomplete="username" />
              </div>
              <span *ngIf="showError('email','required')" class="err">L'email est requis</span>
              <span *ngIf="showError('email','email')" class="err">Format d'email invalide</span>
            </div>

            <div class="field">
              <label for="password">Mot de passe</label>
              <div class="input-wrap">
                <app-icon class="lead" name="lock" [size]="18"></app-icon>
                <input id="password" [type]="showPassword ? 'text' : 'password'" formControlName="password"
                       placeholder="••••••••" autocomplete="current-password" />
                <button type="button" class="toggle" (click)="showPassword = !showPassword"
                        [attr.aria-label]="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                        tabindex="-1">
                  <app-icon [name]="showPassword ? 'visibility_off' : 'visibility'" [size]="18"></app-icon>
                </button>
              </div>
              <span *ngIf="showError('password','required')" class="err">Le mot de passe est requis</span>
            </div>

            <button type="submit" class="btn-login" [disabled]="!loginForm.valid || isLoading">
              <app-icon *ngIf="isLoading" class="spin" name="progress_activity" [size]="18"></app-icon>
              {{ isLoading ? 'Connexion…' : 'Se connecter' }}
            </button>

            <div *ngIf="errorMessage" class="alert-err">
              <app-icon name="error" [size]="18"></app-icon><span>{{ errorMessage }}</span>
            </div>
          </form>

          <p class="foot">© {{ year }} OScore · Usage interne</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .login { display: grid; grid-template-columns: 1.05fr 0.95fr; min-height: 100vh; background: var(--surface); }

    /* Brand panel */
    .brand-panel { position: relative; background: linear-gradient(150deg, #1A1A2E 0%, #23233f 55%, #2b1c30 100%); color: #fff; display: flex; align-items: center; overflow: hidden; }
    .brand-panel::after { content: ''; position: absolute; width: 420px; height: 420px; right: -120px; top: -120px; background: radial-gradient(circle, rgba(232,98,26,0.28), transparent 62%); }
    .brand-inner { position: relative; padding: 64px 60px; max-width: 680px; }
    /* The PNG carries ~11.4% transparent padding on its left; pull it back so the
       visible mark's left edge lines up with the heading/paragraph/bullets below. */
    .brand-logo-img { display: block; width: 100%; height: auto; max-width: 100%; margin-left: -11.4%; }
    .brand-headline { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 30px; line-height: 1.2; margin: 0 0 16px; }
    .brand-sub { font-family: 'DM Sans', sans-serif; font-size: 15px; line-height: 1.65; color: #B9B9CE; margin: 0 0 32px; }
    .brand-points { list-style: none; padding: 0; margin: 0 0 44px; display: flex; flex-direction: column; gap: 14px; }
    .brand-points li { display: flex; align-items: center; gap: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #E4E4F0; }
    .brand-points app-icon { color: var(--sal-orange); }

    /* Form panel */
    .form-panel { display: flex; align-items: center; justify-content: center; padding: 40px; background: var(--bg); }
    .form-card { width: 100%; max-width: 400px; }
    .form-head h2 { font-family: 'Sora', sans-serif; font-weight: 700; font-size: 26px; color: var(--ink-900); margin: 0 0 6px; }
    .form-head p { font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--ink-500); margin: 0 0 30px; }

    .field { margin-bottom: 20px; }
    label { display: block; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: var(--ink-900); margin-bottom: 8px; }
    .input-wrap { display: flex; align-items: center; gap: 10px; padding: 0 12px; background: var(--surface); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); transition: border-color var(--transition), box-shadow var(--transition); }
    .input-wrap:focus-within { border-color: var(--sal-orange); box-shadow: 0 0 0 3px var(--sal-orange-tint); }
    .input-wrap .lead { color: var(--ink-300); flex-shrink: 0; }
    .input-wrap input { flex: 1; border: none; outline: none; background: transparent; padding: 12px 0; font-family: 'DM Sans', sans-serif; font-size: 14px; color: var(--ink-900); }
    .toggle { border: none; background: transparent; cursor: pointer; color: var(--ink-300); display: inline-flex; padding: 4px; }
    .toggle:hover { color: var(--ink-700); }
    .err { display: block; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--danger); margin-top: 6px; }

    .btn-login { width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; margin-top: 6px; background: var(--sal-orange); color: #fff; border: none; border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; transition: background var(--transition); }
    .btn-login:hover:not(:disabled) { background: var(--sal-orange-dark); }
    .btn-login:disabled { opacity: 0.55; cursor: not-allowed; }
    .spin { animation: lg-spin 1s linear infinite; }
    @keyframes lg-spin { to { transform: rotate(360deg); } }

    .alert-err { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 11px 13px; background: var(--danger-tint); color: var(--danger); border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 13px; }
    .foot { text-align: center; margin-top: 28px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--ink-300); }

    @media (max-width: 880px) {
      .login { grid-template-columns: 1fr; }
      .brand-panel { display: none; }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  readonly brand = BRANDING;
  readonly year = new Date().getFullYear();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  showError(field: string, error: string): boolean {
    const c = this.loginForm.get(field);
    return !!(c?.hasError(error) && c?.touched);
  }

  onSubmit(): void {
    if (!this.loginForm.valid) { this.loginForm.markAllAsTouched(); return; }
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        // Tous les rôles (y compris l'administrateur) atterrissent sur le tableau de bord.
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.';
      },
    });
  }
}
