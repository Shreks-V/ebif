import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../../services/api.service';
import { ServicioRaw } from '../../../../../shared/models/almacen.models';
import { BeneficiarioComboboxComponent, BeneficiarioSeleccionado } from '../../../../../shared/components/beneficiario-combobox/beneficiario-combobox.component';
import { ToastService } from '../../../../../core/toast.service';
import { getApiError } from '../../../../../shared/utils/error.utils';

interface ConceptoCitaOption { id: number; nombre: string; precio: number; }
interface ServicioCitaAgregado { id_servicio: number; nombre: string; cantidad: number; monto_pagado: number; }
interface MedicoLocal { idDoctor: number; nombre: string; apellidoPaterno: string; especialidad?: string; }
interface DoctorServicioRaw { id_servicio: number; }

@Component({
  selector: 'app-nueva-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, BeneficiarioComboboxComponent],
  templateUrl: './nueva-cita-modal.component.html',
})
export class NuevaCitaModalComponent implements OnInit {
  @Input() serviciosList: ServicioRaw[] = [];
  @Input() medicos: MedicoLocal[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() guardada = new EventEmitter<void>();

  nuevaCitaIdPaciente: number | null = null;
  beneficiarioCuota = 'A';
  nuevaCitaEstatus = 'PROGRAMADA';
  nuevaCitaNotas = '';
  nuevaCitaFechaHora = '';
  nuevaCitaIdDoctor: number | null = null;
  nuevaCitaLoadingServicios = false;
  guardandoCita = false;

  catalogoFiltro = '';
  cantidadesCatalogo: Record<number, number> = {};
  serviciosAgregados: ServicioCitaAgregado[] = [];
  serviciosFiltradosPorDoctor: ServicioRaw[] = [];
  errorGuardar = '';

  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.serviciosFiltradosPorDoctor = this.serviciosList;
  }

  onBeneficiarioSeleccionado(b: BeneficiarioSeleccionado | null): void {
    this.nuevaCitaIdPaciente = b ? b.id : null;
    this.beneficiarioCuota = b ? b.tipoCuota : 'A';
  }

  onDoctorNuevaCitaChange(): void {
    this.cantidadesCatalogo = {};
    this.serviciosAgregados = [];
    if (!this.nuevaCitaIdDoctor) {
      this.serviciosFiltradosPorDoctor = this.serviciosList;
      return;
    }
    this.nuevaCitaLoadingServicios = true;
    this.api.getDoctorServicios(this.nuevaCitaIdDoctor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (doctorServs: DoctorServicioRaw[]) => {
          const ids = new Set(doctorServs.map((ds) => ds.id_servicio));
          this.serviciosFiltradosPorDoctor = this.serviciosList.filter(s => ids.has(s.id_servicio));
          this.nuevaCitaLoadingServicios = false;
        },
        error: () => {
          this.serviciosFiltradosPorDoctor = this.serviciosList;
          this.nuevaCitaLoadingServicios = false;
        },
      });
  }

  get catalogoVisible(): ConceptoCitaOption[] {
    const isCuotaB = (this.beneficiarioCuota || '').toUpperCase().includes('B');
    const list = this.serviciosFiltradosPorDoctor.map(s => ({
      id: s.id_servicio,
      nombre: s.nombre,
      precio: isCuotaB
        ? Number(s.precio_cuota_b || s.precio_cuota_a || s.cuota_recuperacion || 0)
        : Number(s.precio_cuota_a || s.cuota_recuperacion || 0),
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
      const found = this.serviciosFiltradosPorDoctor.find(s => s.id_servicio === id);
      if (!found) continue;
      const isCuotaB = (this.beneficiarioCuota || '').toUpperCase().includes('B');
      const precio = isCuotaB
        ? Number(found.precio_cuota_b || found.precio_cuota_a || found.cuota_recuperacion || 0)
        : Number(found.precio_cuota_a || found.cuota_recuperacion || 0);
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

  guardarCita(): void {
    this.errorGuardar = '';
    if (!this.nuevaCitaIdPaciente) {
      this.errorGuardar = 'Selecciona un beneficiario para continuar.';
      return;
    }
    if (!this.nuevaCitaFechaHora) {
      this.errorGuardar = 'Elige una fecha y hora para la cita.';
      return;
    }
    if (this.serviciosAgregados.length === 0) {
      this.errorGuardar = 'Agrega al menos un servicio antes de guardar.';
      return;
    }
    this.guardandoCita = true;
    const payload = {
      id_paciente: this.nuevaCitaIdPaciente,
      fecha_hora: this.nuevaCitaFechaHora.length === 16 ? this.nuevaCitaFechaHora + ':00' : this.nuevaCitaFechaHora,
      estatus: this.nuevaCitaEstatus,
      notas: this.nuevaCitaNotas,
      servicios: this.serviciosAgregados.map(s => ({
        id_servicio: s.id_servicio,
        id_doctor: this.nuevaCitaIdDoctor ?? null,
        cantidad: s.cantidad,
        monto_pagado: s.monto_pagado,
      })),
    };
    this.api.createCita(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.guardandoCita = false; this.toast.show('Cita guardada exitosamente.', 'success'); this.guardada.emit(); },
        error: (err) => {
          this.guardandoCita = false;
          this.toast.show(getApiError(err, 'Error al guardar la cita. Intenta de nuevo.'), 'error');
        },
      });
  }
}
