import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { KeyboardClickDirective } from '../../directives/keyboard-click.directive';

@Component({
  selector: 'app-cambiar-contrasena-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyboardClickDirective],
  templateUrl: './cambiar-contrasena-modal.component.html',
})
export class CambiarContrasenaModalComponent {
  @Output() closed = new EventEmitter<void>();

  data = { actual: '', nueva: '', confirmar: '' };
  error = '';
  success = false;
  loading = false;

  constructor(private readonly api: ApiService) {}

  close(): void { this.closed.emit(); }

  submit(): void {
    this.error = '';
    const { actual, nueva, confirmar } = this.data;
    if (!actual || !nueva || !confirmar) { this.error = 'Completa todos los campos.'; return; }
    if (nueva.length < 8) { this.error = 'La nueva contraseña debe tener al menos 8 caracteres.'; return; }
    if (nueva !== confirmar) { this.error = 'Las contraseñas no coinciden.'; return; }
    this.loading = true;
    this.api.cambiarContrasena({ contrasena_actual: actual, contrasena_nueva: nueva }).subscribe({
      next: () => { this.loading = false; this.success = true; },
      error: (err) => { this.loading = false; this.error = err?.error?.detail || 'Error al cambiar la contraseña.'; },
    });
  }
}
