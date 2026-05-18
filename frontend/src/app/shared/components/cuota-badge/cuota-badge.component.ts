import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cuota-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<span [class]="badgeClass">{{ label }}</span>`,
})
export class CuotaBadgeComponent {
  @Input({ required: true }) cuota = '';

  get label(): string {
    return (this.cuota || '').replace(/cuota\s*/i, '').trim() || this.cuota;
  }

  get badgeClass(): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    const letter = this.label.toUpperCase();
    if (letter === 'A') return `${base} bg-emerald-100 text-emerald-800`;
    if (letter === 'B') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }
}
