import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';

interface CitaInput { idCita: number; nombrePaciente?: string; folioPaciente?: string; }

@Component({
  selector: 'app-confirmar-eliminar-cita-modal',
  standalone: true,
  templateUrl: './confirmar-eliminar-cita-modal.component.html',
})
export class ConfirmarEliminarCitaModalComponent {
  @Input() cita: CitaInput | null = null;
  @Output() eliminado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  constructor(private api: ApiService) {}

  eliminar(): void {
    if (!this.cita) return;
    this.api.deleteCita(this.cita.idCita).subscribe({
      next: () => this.eliminado.emit(),
      error: (err) => { console.error('Error al eliminar cita:', err); this.cancelado.emit(); },
    });
  }
}
