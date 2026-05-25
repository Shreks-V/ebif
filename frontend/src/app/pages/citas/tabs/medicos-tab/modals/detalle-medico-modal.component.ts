import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardClickDirective } from '../../../../../shared/directives/keyboard-click.directive';

interface MedicoServicioInput { idServicio: number; nombre: string; }
interface MedicoInput {
  idDoctor: number; nombre: string; apellidoPaterno: string; apellidoMaterno: string;
  especialidad: string; telefono: string; correo: string; activo: 'S' | 'N';
  servicios: MedicoServicioInput[]; iniciales: string;
}

@Component({
  selector: 'app-detalle-medico-modal',
  standalone: true,
  imports: [CommonModule, KeyboardClickDirective],
  templateUrl: './detalle-medico-modal.component.html',
})
export class DetalleMedicoModalComponent {
  @Input() medico: MedicoInput | null = null;
  @Output() closed = new EventEmitter<void>();
}
