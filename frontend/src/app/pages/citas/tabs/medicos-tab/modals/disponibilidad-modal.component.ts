import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';

interface MedicoInput { idDoctor: number; nombre?: string; apellidoPaterno?: string; }
interface SlotDisponibilidad { id_disponibilidad: number; dia_semana: number; hora_inicio: string; hora_fin: string; }
interface DispEspecial { id_disp_especial: number; fecha_inicio: string; hora_inicio: string; hora_fin: string; tipo_recurrencia: string; descripcion?: string; }
interface SemanaSlot { dia_semana: number; id_doctor: number; hora_inicio: string; hora_fin: string; nombre_doctor: string; }
interface NuevoSlotForm { dia_semana: number; hora_inicio: string; hora_fin: string; }

@Component({
  selector: 'app-disponibilidad-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './disponibilidad-modal.component.html',
})
export class DisponibilidadModalComponent implements OnChanges {
  @Input() medico: MedicoInput | null = null;
  @Output() closed = new EventEmitter<void>();

  slots: SlotDisponibilidad[] = [];
  semana: SemanaSlot[] = [];
  especial: DispEspecial[] = [];
  error = '';
  dispEspecialError = '';
  nuevoSlot: NuevoSlotForm = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
  guardandoSlot = false;
  guardandoDispEspecial = false;
  nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };

  readonly horasDisponibles: string[] = (() => {
    const result: string[] = [];
    for (let h = 7; h <= 21; h++) {
      result.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 21) result.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return result;
  })();

  readonly diasSemana = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miercoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sabado' },
    { num: 7, nombre: 'Domingo' },
  ];

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medico'] && this.medico) {
      this.slots = [];
      this.especial = [];
      this.error = '';
      this.dispEspecialError = '';
      this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
      this.nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };
      this.cargarSlots();
      this.cargarEspecial();
      this.api.getDisponibilidadSemana().subscribe({
        next: (data) => { this.semana = data as unknown as SemanaSlot[]; },
        error: () => { this.semana = []; },
      });
    }
  }

  getSlotsForDay(dia: number): SlotDisponibilidad[] {
    return this.slots.filter(s => s.dia_semana === dia);
  }

  getConflictDoctor(dia: number, slot: SlotDisponibilidad): string | null {
    const conflict = this.semana.find(s =>
      s.dia_semana === dia &&
      s.id_doctor !== this.medico?.idDoctor &&
      s.hora_inicio < slot.hora_fin &&
      s.hora_fin > slot.hora_inicio
    );
    return conflict ? conflict.nombre_doctor : null;
  }

  agregarSlot(): void {
    if (!this.nuevoSlot.dia_semana || !this.nuevoSlot.hora_inicio || !this.nuevoSlot.hora_fin) return;
    this.error = '';
    if (this.nuevoSlot.hora_inicio >= this.nuevoSlot.hora_fin) {
      this.error = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    if (!this.medico) return;
    this.guardandoSlot = true;
    this.api.createDoctorDisponibilidad(this.medico.idDoctor, {
      dia_semana: this.nuevoSlot.dia_semana,
      hora_inicio: this.nuevoSlot.hora_inicio,
      hora_fin: this.nuevoSlot.hora_fin,
    }).subscribe({
      next: () => {
        this.guardandoSlot = false;
        this.nuevoSlot = { dia_semana: 0, hora_inicio: '', hora_fin: '' };
        this.cargarSlots();
        this.api.getDisponibilidadSemana().subscribe({ next: (data) => { this.semana = data as unknown as SemanaSlot[]; } });
      },
      error: (err) => {
        this.guardandoSlot = false;
        this.error = err.error?.detail || 'Error al crear disponibilidad';
      },
    });
  }

  eliminarSlot(slot: SlotDisponibilidad): void {
    if (!this.medico) return;
    this.api.deleteDoctorDisponibilidad(this.medico.idDoctor, slot.id_disponibilidad).subscribe({
      next: () => {
        this.cargarSlots();
        this.api.getDisponibilidadSemana().subscribe({ next: (data) => { this.semana = data as unknown as SemanaSlot[]; } });
      },
    });
  }

  agregarDispEspecial(): void {
    if (!this.nuevoDispEspecial.fecha_inicio || !this.nuevoDispEspecial.hora_inicio || !this.nuevoDispEspecial.hora_fin) return;
    this.dispEspecialError = '';
    if (this.nuevoDispEspecial.hora_inicio >= this.nuevoDispEspecial.hora_fin) {
      this.dispEspecialError = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    if (!this.medico) return;
    this.guardandoDispEspecial = true;
    this.api.createDoctorDisponibilidadEspecial(this.medico.idDoctor, {
      fecha_inicio: this.nuevoDispEspecial.fecha_inicio,
      hora_inicio: this.nuevoDispEspecial.hora_inicio,
      hora_fin: this.nuevoDispEspecial.hora_fin,
      tipo_recurrencia: this.nuevoDispEspecial.tipo_recurrencia,
      descripcion: this.nuevoDispEspecial.descripcion || null,
    }).subscribe({
      next: () => {
        this.guardandoDispEspecial = false;
        this.nuevoDispEspecial = { fecha_inicio: '', hora_inicio: '', hora_fin: '', tipo_recurrencia: 'UNICA', descripcion: '' };
        this.cargarEspecial();
      },
      error: (err) => {
        this.guardandoDispEspecial = false;
        this.dispEspecialError = err?.error?.detail || 'Error al guardar la disponibilidad especial.';
      },
    });
  }

  eliminarDispEspecial(de: DispEspecial): void {
    if (!this.medico) return;
    this.api.deleteDoctorDisponibilidadEspecial(this.medico.idDoctor, de.id_disp_especial).subscribe({
      next: () => { this.cargarEspecial(); },
    });
  }

  tipoRecurrenciaLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'UNICA': 'Única vez',
      'QUINCENAL': 'Quincenal',
      'CADA_3_SEMANAS': 'Cada 3 sem.',
      'MENSUAL': 'Mensual',
    };
    return labels[tipo] || tipo;
  }

  private cargarSlots(): void {
    if (!this.medico) return;
    this.api.getDoctorDisponibilidad(this.medico.idDoctor).subscribe({
      next: (data: SlotDisponibilidad[]) => { this.slots = data; },
    });
  }

  private cargarEspecial(): void {
    if (!this.medico) return;
    this.api.getDoctorDisponibilidadEspecial(this.medico.idDoctor).subscribe({
      next: (data) => { this.especial = data as unknown as DispEspecial[]; },
    });
  }
}
