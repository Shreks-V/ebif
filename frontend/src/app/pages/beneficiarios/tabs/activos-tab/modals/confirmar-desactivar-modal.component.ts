import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiService } from '../../../../../services/api.service';
import { Beneficiario } from '../activos-tab.types';

@Component({
  selector: 'app-confirmar-desactivar-modal',
  standalone: true,
  imports: [],
  templateUrl: './confirmar-desactivar-modal.component.html',
})
export class ConfirmarDesactivarModalComponent {
  @Input() beneficiario: Beneficiario | null = null;
  @Output() desactivado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  constructor(private api: ApiService) {}

  desactivar(): void {
    if (!this.beneficiario) return;
    this.api.deleteBeneficiario(this.beneficiario.folio).subscribe({
      next: () => this.desactivado.emit(),
      error: (err) => {
        console.error('Error al desactivar beneficiario:', err);
        this.cancelado.emit();
      },
    });
  }
}
