import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BitacoraItem } from '../../../shared/models/bitacora.models';

@Component({
  selector: 'app-detalle-bitacora-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-bitacora-modal.component.html',
})
export class DetalleBitacoraModalComponent {
  @Input() item: BitacoraItem | null = null;
  @Output() closed = new EventEmitter<void>();

  tipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      INSERT: 'Inserción', UPDATE: 'Actualización', DELETE: 'Eliminación', CANCELACION: 'Cancelación',
    };
    return labels[tipo] ?? tipo;
  }

  tipoClass(tipo: string): string {
    if (tipo === 'INSERT') return 'bg-emerald-100 text-emerald-700';
    if (tipo === 'UPDATE') return 'bg-blue-100 text-blue-700';
    if (tipo === 'DELETE') return 'bg-red-100 text-red-700';
    if (tipo === 'CANCELACION') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  tablaLabel(tabla: string | undefined): string {
    if (!tabla) return '—';
    const labels: Record<string, string> = {
      PACIENTE: 'Beneficiarios', CITA: 'Citas', VENTA: 'Recibos', PRODUCTO: 'Productos',
      SERVICIO: 'Servicios', COMODATO: 'Comodatos', USUARIO_SISTEMA: 'Usuarios', MEMBRESIA: 'Membresías',
    };
    return labels[tabla] ?? tabla;
  }

  formatFecha(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      const utc = /[Z+]/.test(iso) ? iso : iso + 'Z';
      return new Date(utc).toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch { return iso; }
  }
}
