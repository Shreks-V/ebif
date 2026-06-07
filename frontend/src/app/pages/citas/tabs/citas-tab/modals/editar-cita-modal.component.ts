import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { ServicioRaw } from '../../../../../shared/models/almacen.models';
import { ToastService } from '../../../../../core/toast.service';
import { getApiError } from '../../../../../shared/utils/error.utils';

interface ConceptoCitaOption { id: number; nombre: string; precio: number; }
interface ServicioCitaAgregado { id_servicio: number; nombre: string; cantidad: number; monto_pagado: number; }
interface CitaServicioInput { idServicio: number; nombre: string; cantidad: number; montoPagado: number; }
interface CitaInput {
  idCita: number; idPaciente: number; nombrePaciente: string; folioPaciente: string;
  fechaHora: string; estatus: string; notas: string | null; servicios: CitaServicioInput[];
}
interface EditCita {
  idCita: number; idPaciente: number; nombrePaciente: string;
  estatus: string; notas: string;
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
  errorGuardar = '';

  catalogoFiltro = '';
  cantidadesCatalogo: Record<number, number> = {};
  serviciosAgregados: ServicioCitaAgregado[] = [];

  private readonly toast = inject(ToastService);

  constructor(private readonly api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cita'] && this.cita) {
      this.editCita = {
        idCita: this.cita.idCita, idPaciente: this.cita.idPaciente,
        nombrePaciente: this.cita.nombrePaciente,
        estatus: this.cita.estatus, notas: this.cita.notas || '',
      };
      this.editCitaFechaHora = this.cita.fechaHora ? this.cita.fechaHora.substring(0, 16) : '';
      this.serviciosAgregados = this.cita.servicios.map(s => ({
        id_servicio: s.idServicio, nombre: s.nombre,
        cantidad: s.cantidad ?? 1, monto_pagado: s.montoPagado ?? 0,
      }));
      this.cantidadesCatalogo = {};
      this.catalogoFiltro = '';
      this.guardandoEdicionCita = false;
      this.errorGuardar = '';
    }
  }

  get catalogoVisible(): ConceptoCitaOption[] {
    const list = this.serviciosList.map(s => ({
      id: s.id_servicio, nombre: s.nombre,
      precio: Number(s.precio_cuota_a || s.cuota_recuperacion || 0),
    }));
    if (!this.catalogoFiltro) return list;
    const q = this.catalogoFiltro.toLowerCase();
    return list.filter(s => s.nombre.toLowerCase().includes(q));
  }

  getCantidad(id: number): number { return this.cantidadesCatalogo[id] ?? 0; }

  setCantidad(id: number, val: number): void {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    const updated = { ...this.cantidadesCatalogo };
    if (n === 0) delete updated[id];
    else updated[id] = n;
    this.cantidadesCatalogo = updated;
  }

  get totalSeleccionados(): number {
    return Object.values(this.cantidadesCatalogo).filter(v => v > 0).length;
  }

  get totalCita(): number {
    return this.serviciosAgregados.reduce((sum, s) => sum + s.monto_pagado, 0);
  }

  agregarSeleccionados(): void {
    for (const [idStr, cantidad] of Object.entries(this.cantidadesCatalogo)) {
      if (cantidad <= 0) continue;
      const id = Number(idStr);
      const found = this.serviciosList.find(s => s.id_servicio === id);
      if (!found) continue;
      const precio = Number(found.precio_cuota_a || found.cuota_recuperacion || 0);
      const existing = this.serviciosAgregados.findIndex(s => s.id_servicio === id);
      if (existing >= 0) {
        this.serviciosAgregados[existing].cantidad += cantidad;
        this.serviciosAgregados[existing].monto_pagado = this.serviciosAgregados[existing].cantidad * precio;
      } else {
        this.serviciosAgregados.push({ id_servicio: id, nombre: found.nombre, cantidad, monto_pagado: precio * cantidad });
      }
    }
    this.cantidadesCatalogo = {};
    this.catalogoFiltro = '';
  }

  removerAgregado(index: number): void {
    this.serviciosAgregados.splice(index, 1);
  }

  guardarEdicionCita(): void {
    this.errorGuardar = '';
    if (!this.editCita) return;
    if (!this.editCitaFechaHora) {
      this.errorGuardar = 'Elige una fecha y hora para la cita.';
      return;
    }
    if (this.serviciosAgregados.length === 0) {
      this.errorGuardar = 'Agrega al menos un servicio antes de guardar.';
      return;
    }
    this.guardandoEdicionCita = true;
    const payload = {
      id_paciente: this.editCita.idPaciente,
      fecha_hora: this.editCitaFechaHora.length === 16 ? this.editCitaFechaHora + ':00' : this.editCitaFechaHora,
      estatus: this.editCita.estatus,
      notas: this.editCita.notas,
      servicios: this.serviciosAgregados.map(s => ({
        id_servicio: s.id_servicio, cantidad: s.cantidad, monto_pagado: s.monto_pagado,
      })),
    };
    this.api.updateCita(this.editCita.idCita, payload).subscribe({
      next: () => { this.guardandoEdicionCita = false; this.toast.show('Cambios guardados exitosamente.', 'success'); this.guardada.emit(); },
      error: (err) => {
        this.guardandoEdicionCita = false;
        this.toast.show(getApiError(err, 'Error al guardar los cambios. Intenta de nuevo.'), 'error');
      },
    });
  }
}
