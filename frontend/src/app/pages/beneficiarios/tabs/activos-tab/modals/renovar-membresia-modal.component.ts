import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../services/api.service';
import { Beneficiario } from '../activos-tab.types';
import { getMembresiaBadgeClass } from '../activos-tab.utils';
import { getApiError } from '../../../../../shared/utils/error.utils';

interface MetodoPagoRaw {
  id_metodo_pago?: number;
  id?: number;
  nombre: string;
}

@Component({
  selector: 'app-renovar-membresia-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renovar-membresia-modal.component.html',
})
export class RenovarMembresiaModalComponent implements OnInit {
  @Input() beneficiario: Beneficiario | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() renovado = new EventEmitter<void>();

  renovarMonto = 0;
  renovarExento = 'N';
  renovarMetodosPago: { id_metodo_pago: number; monto: number }[] = [{ id_metodo_pago: 0, monto: 0 }];
  renovarMetodosCatalogo: { id: number; nombre: string }[] = [];
  renovarError = '';
  renovarSubmitting = false;

  readonly getMembresiaBadgeClass = getMembresiaBadgeClass;

  constructor(private readonly api: ApiService) {}

  get totalPagado(): number {
    if (this.renovarExento === 'S') return this.renovarMonto || 0;
    return this.renovarMetodosPago.reduce((sum, mp) => sum + (Number(mp.monto) || 0), 0);
  }

  get saldoPendiente(): number {
    return Math.max(0, (Number(this.renovarMonto) || 0) - this.totalPagado);
  }

  get pagoExcedeTotal(): boolean {
    return this.renovarExento !== 'S' && this.totalPagado > (Number(this.renovarMonto) || 0);
  }

  ngOnInit(): void {
    this.api.getMetodosPago().subscribe({
      next: (data: MetodoPagoRaw[]) => {
        this.renovarMetodosCatalogo = data.map((m: MetodoPagoRaw) => ({ id: m.id_metodo_pago ?? m.id ?? 0, nombre: m.nombre }));
      },
      error: () => {},
    });
  }

  confirmarRenovacion(): void {
    if (!this.beneficiario) return;
    if (!this.renovarMonto || this.renovarMonto <= 0) {
      this.renovarError = 'El monto debe ser mayor a 0.';
      return;
    }
    const metodosValidos = this.renovarMetodosPago.filter(m => m.id_metodo_pago > 0 && m.monto > 0);
    if (this.renovarExento !== 'S' && metodosValidos.length === 0) {
      this.renovarError = 'Agrega al menos un método de pago.';
      return;
    }
    if (this.pagoExcedeTotal) {
      this.renovarError = 'La suma de los métodos de pago no puede exceder el monto de la cuota.';
      return;
    }
    this.renovarSubmitting = true;
    this.renovarError = '';
    const payload = {
      monto_total: this.renovarMonto,
      exento_pago: this.renovarExento,
      metodos_pago: this.renovarExento === 'S' ? [] : metodosValidos,
    };
    this.api.renovarMembresia(this.beneficiario.folio, payload).subscribe({
      next: (res: { folio_venta?: string }) => {
        this.renovarSubmitting = false;
        if (res?.folio_venta) alert(`Membresía renovada. Cobro generado: ${res.folio_venta}`);
        this.renovado.emit();
      },
      error: (err: unknown) => {
        this.renovarSubmitting = false;
        this.renovarError = getApiError(err, 'Error al renovar la membresía.');
      },
    });
  }
}
