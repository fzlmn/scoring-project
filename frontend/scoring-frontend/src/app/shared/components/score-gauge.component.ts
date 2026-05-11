import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gauge-container">
      <svg class="gauge-svg" viewBox="0 0 200 120">
        <!-- Background arc -->
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#E5E5EA"
          stroke-width="8"
        />
        <!-- Score arc -->
        <path
          [attr.d]="getArcPath()"
          fill="none"
          [attr.stroke]="getColor()"
          stroke-width="8"
        />
        <!-- Center text -->
        <text x="100" y="85" class="score-text" text-anchor="middle">{{ score }}</text>
        <text x="100" y="110" class="score-label" text-anchor="middle">/100</text>
      </svg>
      <div class="gauge-label">{{ getRiskLabel() }}</div>
    </div>
  `,
  styles: [`
    .gauge-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .gauge-svg {
      width: 150px;
      height: 100px;
    }

    .score-text {
      font-size: 32px;
      font-weight: 700;
      font-family: 'Sora', sans-serif;
      fill: #1A1A2E;
    }

    .score-label {
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      fill: #888;
    }

    .gauge-label {
      font-size: 13px;
      font-weight: 600;
      font-family: 'DM Sans', sans-serif;
      color: #1A1A2E;
    }
  `]
})
export class ScoreGaugeComponent {
  @Input() score: number = 0;

  getArcPath(): string {
    const radius = 80;
    const circumference = Math.PI * radius;
    const progress = Math.max(0, Math.min(100, this.score)) / 100;
    const angle = progress * 180;
    const radians = (angle * Math.PI) / 180;

    const x = 100 + radius * Math.cos((180 - angle) * (Math.PI / 180));
    const y = 100 - radius * Math.sin((180 - angle) * (Math.PI / 180));

    const largeArc = angle > 90 ? 1 : 0;

    return `M 20 100 A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y}`;
  }

  getColor(): string {
    if (this.score >= 70) return '#2D9C6A';
    if (this.score >= 40) return '#E8621A';
    return '#D94040';
  }

  getRiskLabel(): string {
    if (this.score >= 70) return 'Risque Faible';
    if (this.score >= 40) return 'Risque Moyen';
    return 'Risque Élevé';
  }
}
