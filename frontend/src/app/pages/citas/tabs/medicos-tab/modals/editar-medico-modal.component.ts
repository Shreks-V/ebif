import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { ServicioRaw } from '../../../../../shared/models/almacen.models';

interface MedicoServicioInput { idServicio: number; nombre: string; }
interface MedicoInput {
  idDoctor: number; nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  especialidad: string; telefono: string; correo: string; activo: 'S' | 'N';
  servicios: MedicoServicioInput[]; iniciales: string;
}
interface EditMedicoForm {
  idDoctor: number; nombre: string; apellido_paterno: string; apellido_materno: string;
  especialidad: string; telefono: string; correo: string; activo: 'S' | 'N';
}

@Component({
  selector: 'app-editar-medico-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-medico-modal.component.html',
})
export class EditarMedicoModalComponent implements OnChanges {
  @Input() medico: MedicoInput | null = null;
  @Input() serviciosList: ServicioRaw[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  editMedico: EditMedicoForm | null = null;
  serviciosSeleccionados: number[] = [];
  guardando = false;
  error = '';

  constructor(private readonly api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medico'] && this.medico) {
      this.editMedico = {
        idDoctor: this.medico.idDoctor,
        nombre: this.medico.nombre,
        apellido_paterno: this.medico.apellidoPaterno,
        apellido_materno: this.medico.apellidoMaterno || '',
        especialidad: this.medico.especialidad,
        telefono: this.medico.telefono || '',
        correo: this.medico.correo || '',
        activo: this.medico.activo,
      };
      this.serviciosSeleccionados = this.medico.servicios.map((s) => s.idServicio);
      this.error = '';
      this.guardando = false;
    }
  }

  toggleServicio(idServicio: number): void {
    const idx = this.serviciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) this.serviciosSeleccionados.splice(idx, 1);
    else this.serviciosSeleccionados.push(idServicio);
  }

  guardar(): void {
    if (!this.editMedico?.nombre || !this.editMedico?.apellido_paterno) return;
    this.guardando = true;
    const payload = {
      nombre: this.editMedico.nombre,
      apellido_paterno: this.editMedico.apellido_paterno,
      apellido_materno: this.editMedico.apellido_materno,
      especialidad: this.editMedico.especialidad,
      telefono: this.editMedico.telefono,
      correo: this.editMedico.correo,
      activo: this.editMedico.activo,
      servicios: [...this.serviciosSeleccionados],
    };
    this.api.updateDoctor(this.editMedico.idDoctor, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.error = '';
        this.guardado.emit();
      },
      error: (err) => {
        this.guardando = false;
        this.error = err?.error?.detail || 'Error al actualizar el médico.';
      },
    });
  }
}
