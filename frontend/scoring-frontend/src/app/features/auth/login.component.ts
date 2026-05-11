import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <div class="login-left"></div>
      <div class="login-right">
        <div class="login-box">
          <div class="login-header">
            <h1 class="logo-text">ORUS Scoring</h1>
            <p class="subtitle">Système de notation et d'analyse de crédit</p>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="email">Email</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                placeholder="votre&#64;email.com"
                class="form-input"
              />
              <span *ngIf="loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched" class="error">
                L'email est requis
              </span>
            </div>

            <div class="form-group">
              <label for="password">Mot de passe</label>
              <input
                id="password"
                type="password"
                formControlName="password"
                placeholder="••••••••"
                class="form-input"
              />
              <span *ngIf="loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched" class="error">
                Le mot de passe est requis
              </span>
            </div>

            <button
              type="submit"
              [disabled]="!loginForm.valid || isLoading"
              class="btn-login"
            >
              {{ isLoading ? 'Connexion...' : 'Se connecter' }}
            </button>
          </form>

          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div class="demo-credentials">
            <p><strong>Comptes de démonstration :</strong></p>
            <ul>
              <li><strong>Chargé :</strong> charge / e93def0d-7</li>
              <li><strong>Analyste :</strong> analyste / Youssef1234!</li>
              <li><strong>Superviseur :</strong> superviseur / Kaoutar1234!</li>
              <li><strong>Admin :</strong> admin / Admin1234!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      height: 100vh;
      background: white;
    }

    .login-left {
      flex: 1;
      background: linear-gradient(135deg, #1A1A2E 0%, #16213E 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .login-right {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      background: #F5F5F7;
    }

    .login-box {
      width: 100%;
      max-width: 400px;
      background: white;
      padding: 40px;
      border-radius: 12px;
      border: 1px solid #E5E5EA;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-text {
      font-size: 28px;
      font-weight: 700;
      color: #E8621A;
      margin: 0 0 8px 0;
      font-family: 'Sora', sans-serif;
    }

    .subtitle {
      font-size: 13px;
      color: #888;
      margin: 0;
      font-family: 'DM Sans', sans-serif;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1A1A2E;
      margin-bottom: 8px;
      font-family: 'DM Sans', sans-serif;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #E5E5EA;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'DM Sans', sans-serif;
      transition: border-color 0.3s;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #E8621A;
      box-shadow: 0 0 0 3px rgba(232, 98, 26, 0.1);
    }

    .form-input:disabled {
      background: #F5F5F7;
      color: #ccc;
    }

    .error {
      display: block;
      font-size: 12px;
      color: #D94040;
      margin-top: 4px;
      font-family: 'DM Sans', sans-serif;
    }

    .btn-login {
      width: 100%;
      padding: 12px;
      background: #E8621A;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: background 0.3s;
      margin-top: 10px;
    }

    .btn-login:hover:not(:disabled) {
      background: #d14d0a;
    }

    .btn-login:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .error-message {
      margin-top: 15px;
      padding: 10px 12px;
      background: #FCE3E3;
      color: #D94040;
      border-radius: 6px;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
    }

    .demo-credentials {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #E5E5EA;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      color: #666;
    }

    .demo-credentials p {
      margin: 0 0 10px 0;
      font-weight: 600;
      color: #1A1A2E;
    }

    .demo-credentials ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .demo-credentials li {
      margin: 5px 0;
      color: #666;
    }

    .demo-credentials strong {
      color: #1A1A2E;
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

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

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          this.isLoading = false;
          const user = response;

          if (user.role === 'ADMINISTRATEUR') {
            this.router.navigate(['/admin/utilisateurs']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.';
        },
      });
    }
  }
}
