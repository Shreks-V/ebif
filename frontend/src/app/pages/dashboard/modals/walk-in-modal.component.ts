import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { Beneficiario } from '../../../shared/models/beneficiario.models';
import { ServicioRaw } from '../../../shared/models/almacen.models';
import { getApiError } from '../../../shared/utils/error.utils';

@Component({
  selector: 'app-walk-in-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './walk-in-modal.component.html',
})
export class WalkInModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() registrado = new EventEmitter<void>();

  searchTerm = '';
  results: Beneficiario[] = [];
  allBeneficiarios: Beneficiario[] = [];
  servicios: ServicioRaw[] = [];
  selected: Beneficiario | null = null;
  servicioSeleccionadoId: number | null = null;
  cantidad = 1;
  saving = false;
  error = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getBeneficiarios({ limit: 500, membresia_estatus: 'ACTIVO' }).subscribe({
      next: (data) => { this.allBeneficiarios = data || []; },
      error: () => { this.error = 'No se pudieron cargar los beneficiarios'; },
    });
    this.api.getServicios().subscribe({
      next: (data) => {
        this.servicios = (data || []).filter((s) => String(s?.activo ?? 'S').toUpperCase() === 'S');
        this.setDefaultServicio();
      },
      error: () => { this.error = 'No se pudieron cargar los servicios'; },
    });
  }

  private setDefaultServicio(): void {
    const consulta = this.servicios.find((s) => {
      const n = (s.nombre ?? '').toLowerCase();
      return n.includes('consulta') && (n.includes('médica') || n.includes('medica'));
    }) ?? this.servicios.find((s) => (s.nombre ?? '').toLowerCase().includes('consulta'));
    if (consulta) this.servicioSeleccionadoId = consulta.id_servicio ?? null;
  }

  filtrar(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) { this.results = []; return; }
    this.results = this.allBeneficiarios
      .filter((b) => {
        const fullName = `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.toLowerCase();
        return fullName.includes(term) || (b.folio || '').toLowerCase().includes(term);
      })
      .slice(0, 20);
  }

  select(b: Beneficiario): void {
    this.selected = b;
  }

  registrar(): void {
    if (!this.selected || this.saving) return;
    if (!this.servicioSeleccionadoId) {
      this.error = 'Selecciona un servicio para registrar la atención sin cita';
      return;
    }
    const servicioId = Number(this.servicioSeleccionadoId);
    if (!Number.isInteger(servicioId) || servicioId <= 0) {
      this.error = 'Selecciona un servicio válido';
      return;
    }
    const cantidad = Math.max(1, Number(this.cantidad) || 1);
    this.saving = true;
    this.error = '';
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fechaHora = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
    const payload = {
      id_paciente: this.selected.id_paciente,
      fecha_hora: fechaHora,
      estatus: 'PROGRAMADA',
      notas: 'Atención sin cita registrada desde panel principal',
      servicios: [{ id_servicio: servicioId, cantidad }],
    };
    this.api.createCita(payload).subscribe({
      next: () => { this.registrado.emit(); },
      error: (err: unknown) => {
        this.saving = false;
        this.error = getApiError(err, 'No se pudo registrar la atención sin cita');
      },
    });
  }
}
