import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar-iniciales',
  standalone: true,
  template: `
    <div [class]="'flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 overflow-hidden ' + colorClass + ' ' + sizeClass">
      @if (fotoUrl) {
        <img [src]="fotoUrl" [alt]="fotoAlt" class="w-full h-full object-cover" />
      } @else {
        {{ iniciales }}
      }
    </div>
  `,
})
export class AvatarInicialesComponent {
  @Input({ required: true }) iniciales = '';
  @Input({ required: true }) colorClass = '';
  /** Tailwind size classes, e.g. "w-10 h-10 text-sm" */
  @Input() sizeClass = 'w-10 h-10 text-sm';
  @Input() fotoUrl: string | null = null;
  @Input() fotoAlt = '';
}
