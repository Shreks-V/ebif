import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { ServicioRaw } from '../../../../../shared/models/almacen.models';
import { KeyboardClickDirective } from '../../../../../shared/directives/keyboard-click.directive';

interface NuevoMedicoForm {
  nombre: string; apellido_paterno: string; apellido_materno: string;
  especialidad: string; telefono: string; correo: string; activo: string;
}

@Component({
  selector: 'app-nuevo-medico-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyboardClickDirective],
  templateUrl: './nuevo-medico-modal.component.html',
})
export class NuevoMedicoModalComponent {
  @Input() serviciosList: ServicioRaw[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  nuevoMedico: NuevoMedicoForm = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
  serviciosSeleccionados: number[] = [];
  guardando = false;
  error = '';

  constructor(private readonly api: ApiService) {}

  toggleServicio(idServicio: number): void {
    const idx = this.serviciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) this.serviciosSeleccionados.splice(idx, 1);
    else this.serviciosSeleccionados.push(idServicio);
  }

  guardar(): void {
    if (!this.nuevoMedico.nombre || !this.nuevoMedico.apellido_paterno) return;
    this.guardando = true;
    const payload = {
      nombre: this.nuevoMedico.nombre,
      apellido_paterno: this.nuevoMedico.apellido_paterno,
      apellido_materno: this.nuevoMedico.apellido_materno,
      especialidad: this.nuevoMedico.especialidad,
      telefono: this.nuevoMedico.telefono,
      correo: this.nuevoMedico.correo,
      activo: this.nuevoMedico.activo,
      servicios: [...this.serviciosSeleccionados],
    };
    this.api.createDoctor(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.error = '';
        this.guardado.emit();
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.detail || 'Error al guardar el médico. Intenta de nuevo.';
      },
    });
  }
}
