import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/ui/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: '<router-outlet></router-outlet><app-toast-container></app-toast-container>',
  styles: []
})
export class AppComponent {
  title = 'ORUS Scoring';
}
