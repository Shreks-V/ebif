import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    <div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex items-start gap-3 rounded-lg px-4 py-3 shadow-lg text-white text-sm"
          [class]="toastClass(toast.type)"
        >
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="toastService.dismiss(toast.id)" class="opacity-70 hover:opacity-100 leading-none text-lg">&times;</button>
        </div>
      }
    </div>
  `,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);

  toastClass(type: string): string {
    if (type === 'error') return 'bg-red-600';
    if (type === 'warning') return 'bg-yellow-500';
    return 'bg-blue-600';
  }
}
