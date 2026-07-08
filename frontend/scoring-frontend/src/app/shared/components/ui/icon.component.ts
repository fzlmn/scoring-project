import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Single icon wrapper over Material Symbols Rounded (loaded via styles.css @import).
 * Color inherits `currentColor`, so the icon takes the surrounding text color.
 *
 * Usage: <app-icon name="dashboard"></app-icon>
 *        <app-icon name="check_circle" [size]="22" filled></app-icon>
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="material-symbols-rounded"
      [class.is-filled]="filled"
      [style.fontSize.px]="size"
      aria-hidden="true"
    >{{ name }}</span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
  `]
})
export class IconComponent {
  /** Material Symbols ligature, e.g. "dashboard", "group", "warning". */
  @Input() name = '';
  /** Pixel size; defaults to the global --icon-size when omitted. */
  @Input() size?: number;
  /** Render the filled variant. */
  @Input() filled = false;
}
