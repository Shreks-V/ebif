import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface ReciboInput { idVenta: number; folioVenta?: string; nombrePaciente?: string; montoTotal?: number; }

@Component({
  selector: 'app-cancelar-recibo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancelar-recibo-modal.component.html',
})
export class CancelarReciboModalComponent implements OnChanges {
  @Input() recibo: ReciboInput | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  motivo = '';
  cancelando = false;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recibo'] && this.recibo) {
      this.motivo = '';
      this.cancelando = false;
    }
  }

  confirmar(): void {
    if (!this.recibo) return;
    this.cancelando = true;
    this.api.cancelarRecibo(this.recibo.idVenta, this.motivo || undefined).subscribe({
      next: () => {
        this.cancelando = false;
        this.cancelado.emit();
      },
      error: (err) => {
        this.cancelando = false;
        console.error('Error al cancelar recibo:', err);
      },
    });
  }
}
