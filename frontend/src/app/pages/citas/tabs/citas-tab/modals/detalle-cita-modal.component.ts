import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { formatFechaHoraCita, getEstadoBadgeClass } from '../citas-tab.utils';

interface CitaServicioInput { idServicio: number; nombre: string; cantidad: number; montoPagado: number; }
interface CitaInput {
  idCita: number; idPaciente: number; nombrePaciente: string; folioPaciente: string;
  fechaHora: string; estatus: string; notas: string | null; servicios: CitaServicioInput[];
}

@Component({
  selector: 'app-detalle-cita-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-cita-modal.component.html',
})
export class DetalleCitaModalComponent {
  @Input() cita: CitaInput | null = null;
  @Output() closed = new EventEmitter<void>();

  readonly formatFechaHoraCita = formatFechaHoraCita;
  readonly getEstadoBadgeClass = getEstadoBadgeClass;
}
