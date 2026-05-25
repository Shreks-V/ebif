import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../../services/api.service';
import { ServicioRaw } from '../../../../../shared/models/almacen.models';
import { KeyboardClickDirective } from '../../../../../shared/directives/keyboard-click.directive';

interface BeneficiarioOption { id_paciente: number; folio: string; nombre_completo: string; }
interface NuevaCitaServicio { id_servicio: number | null; cantidad: number; monto_pagado: number; }
interface NuevaCitaForm {
  id_paciente: number | null; estatus: string; notas: string; servicios: NuevaCitaServicio[];
}
interface MedicoLocal { idDoctor: number; nombre: string; apellidoPaterno: string; especialidad?: string; }
interface DoctorServicioRaw { id_servicio: number; }

@Component({
  selector: 'app-nueva-cita-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, KeyboardClickDirective],
  templateUrl: './nueva-cita-modal.component.html',
})
export class NuevaCitaModalComponent implements OnInit {
  @Input() serviciosList: ServicioRaw[] = [];
  @Input() medicos: MedicoLocal[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() guardada = new EventEmitter<void>();

  nuevaCita: NuevaCitaForm = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
  nuevaCitaFechaHora = '';
  nuevaCitaIdDoctor: number | null = null;
  beneficiariosList: BeneficiarioOption[] = [];
  beneficiariosFiltrados: BeneficiarioOption[] = [];
  busquedaPaciente = '';
  showPacienteDropdown = false;
  nuevaCitaServiciosFiltrados: ServicioRaw[] = [];
  nuevaCitaLoadingServicios = false;
  guardandoCita = false;

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.nuevaCitaServiciosFiltrados = this.serviciosList;
    this.api.getBeneficiarios()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.beneficiariosList = data.map((b) => ({
            id_paciente: b.id_paciente,
            folio: b.folio,
            nombre_completo: `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.trim(),
          }));
        },
        error: (err) => console.error('Error al cargar beneficiarios:', err),
      });
  }

  filtrarBeneficiarios(): void {
    this.showPacienteDropdown = true;
    if (!this.busquedaPaciente) {
      this.beneficiariosFiltrados = [];
      this.nuevaCita.id_paciente = null;
      return;
    }
    const term = this.busquedaPaciente.toLowerCase();
    this.beneficiariosFiltrados = this.beneficiariosList
      .filter(b => b.folio?.toLowerCase().includes(term) || b.nombre_completo.toLowerCase().includes(term))
      .slice(0, 10);
  }

  seleccionarPaciente(b: BeneficiarioOption): void {
    this.nuevaCita.id_paciente = b.id_paciente;
    this.busquedaPaciente = `${b.folio} - ${b.nombre_completo}`;
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
  }

  agregarServicioCita(): void {
    this.nuevaCita.servicios.push({ id_servicio: null, cantidad: 1, monto_pagado: 0 });
  }

  quitarServicioCita(index: number): void { this.nuevaCita.servicios.splice(index, 1); }

  onDoctorNuevaCitaChange(): void {
    this.nuevaCita.servicios.forEach((s) => { s.id_servicio = null; s.monto_pagado = 0; });
    if (!this.nuevaCitaIdDoctor) { this.nuevaCitaServiciosFiltrados = this.serviciosList; return; }
    this.nuevaCitaLoadingServicios = true;
    this.api.getDoctorServicios(this.nuevaCitaIdDoctor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (doctorServs: DoctorServicioRaw[]) => {
        const ids = new Set(doctorServs.map((ds) => ds.id_servicio));
        this.nuevaCitaServiciosFiltrados = this.serviciosList.filter(s => ids.has(s.id_servicio));
        this.nuevaCitaLoadingServicios = false;
      },
      error: () => { this.nuevaCitaServiciosFiltrados = this.serviciosList; this.nuevaCitaLoadingServicios = false; },
    });
  }

  onServicioNuevaCitaChange(srv: NuevaCitaServicio): void {
    if (!srv.id_servicio) { srv.monto_pagado = 0; return; }
    const found = this.serviciosList.find((s) => s.id_servicio === srv.id_servicio);
    if (found) srv.monto_pagado = found.cuota_recuperacion ?? found.precio_cuota_a ?? 0;
  }

  guardarCita(): void {
    if (!this.nuevaCita.id_paciente || !this.nuevaCitaFechaHora) return;
    this.guardandoCita = true;
    const payload = {
      id_paciente: this.nuevaCita.id_paciente,
      fecha_hora: this.nuevaCitaFechaHora.length === 16 ? this.nuevaCitaFechaHora + ':00' : this.nuevaCitaFechaHora,
      estatus: this.nuevaCita.estatus,
      notas: this.nuevaCita.notas,
      servicios: this.nuevaCita.servicios
        .filter((s) => s.id_servicio !== null)
        .map((s) => ({ id_servicio: s.id_servicio, id_doctor: this.nuevaCitaIdDoctor ?? null, cantidad: s.cantidad, monto_pagado: s.monto_pagado })),
    };
    this.api.createCita(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.guardandoCita = false; this.guardada.emit(); },
        error: (err) => { console.error('Error al crear cita:', err); this.guardandoCita = false; },
      });
  }
}
