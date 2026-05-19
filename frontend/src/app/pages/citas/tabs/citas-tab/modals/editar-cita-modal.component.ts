import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { ServicioRaw } from '../../../../../shared/models/almacen.models';

interface CitaServicioInput { idServicio: number; nombre: string; cantidad: number; montoPagado: number; }
interface CitaInput {
  idCita: number; idPaciente: number; nombrePaciente: string; folioPaciente: string;
  fechaHora: string; estatus: string; notas: string | null; servicios: CitaServicioInput[];
}
interface EditCita {
  idCita: number; idPaciente: number; nombrePaciente: string;
  estatus: string; notas: string; servicios: Partial<CitaServicioInput>[];
}

@Component({
  selector: 'app-editar-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-cita-modal.component.html',
})
export class EditarCitaModalComponent implements OnChanges {
  @Input() cita: CitaInput | null = null;
  @Input() serviciosList: ServicioRaw[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() guardada = new EventEmitter<void>();

  editCita: EditCita | null = null;
  editCitaFechaHora = '';
  guardandoEdicionCita = false;

  constructor(private readonly api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cita'] && this.cita) {
      this.editCita = {
        idCita: this.cita.idCita, idPaciente: this.cita.idPaciente, nombrePaciente: this.cita.nombrePaciente,
        estatus: this.cita.estatus, notas: this.cita.notas || '',
        servicios: this.cita.servicios.map((s: CitaServicioInput) => ({ ...s })),
      };
      this.editCitaFechaHora = this.cita.fechaHora ? this.cita.fechaHora.substring(0, 16) : '';
      this.guardandoEdicionCita = false;
    }
  }

  agregarServicioEditCita(): void {
    if (!this.editCita) return;
    this.editCita.servicios.push({ idServicio: undefined, cantidad: 1, montoPagado: 0 });
  }

  guardarEdicionCita(): void {
    if (!this.editCitaFechaHora || !this.editCita) return;
    this.guardandoEdicionCita = true;
    const payload = {
      id_paciente: this.editCita.idPaciente,
      fecha_hora: this.editCitaFechaHora.length === 16 ? this.editCitaFechaHora + ':00' : this.editCitaFechaHora,
      estatus: this.editCita.estatus,
      notas: this.editCita.notas,
      servicios: this.editCita.servicios
        .filter((s) => s.idServicio !== null)
        .map((s) => ({ id_servicio: s.idServicio, cantidad: s.cantidad, monto_pagado: s.montoPagado })),
    };
    this.api.updateCita(this.editCita.idCita, payload).subscribe({
      next: () => { this.guardandoEdicionCita = false; this.guardada.emit(); },
      error: (err) => { console.error('Error al actualizar cita:', err); this.guardandoEdicionCita = false; },
    });
  }
}
