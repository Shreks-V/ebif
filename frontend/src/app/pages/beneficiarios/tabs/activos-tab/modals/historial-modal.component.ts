import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../../../services/api.service';
import { Beneficiario, HistorialData } from '../activos-tab.types';
import {
  formatDateTime, formatDate, formatMoney, hasPendingAmount,
  getCitaStatusLabel, getCitaStatusClass,
  getPagoStatusLabel, getPagoStatusClass,
  getComodatoStatusLabel, getComodatoStatusClass,
} from '../activos-tab.utils';

@Component({
  selector: 'app-historial-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-modal.component.html',
})
export class HistorialModalComponent implements OnChanges {
  @Input() beneficiario: Beneficiario | null = null;
  @Output() closed = new EventEmitter<void>();

  historialData: HistorialData | null = null;
  historialLoading = false;
  historialTab: 'citas' | 'pagos' | 'comodatos' = 'citas';

  readonly formatDateTime = formatDateTime;
  readonly formatDate = formatDate;
  readonly formatMoney = formatMoney;
  readonly hasPendingAmount = hasPendingAmount;
  readonly getCitaStatusLabel = getCitaStatusLabel;
  readonly getCitaStatusClass = getCitaStatusClass;
  readonly getPagoStatusLabel = getPagoStatusLabel;
  readonly getPagoStatusClass = getPagoStatusClass;
  readonly getComodatoStatusLabel = getComodatoStatusLabel;
  readonly getComodatoStatusClass = getComodatoStatusClass;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['beneficiario'] && this.beneficiario) {
      this.historialTab = 'citas';
      this.historialData = null;
      this.historialLoading = true;
      this.api.getBeneficiarioHistorial(this.beneficiario.folio).subscribe({
        next: (data) => { this.historialData = data; this.historialLoading = false; },
        error: (err) => {
          console.error('Error al cargar historial:', err);
          this.historialLoading = false;
          this.historialData = {
            nombre: `${this.beneficiario!.nombre} ${this.beneficiario!.apellidoPaterno}`,
            citas: [], pagos: [], comodatos: [],
          };
        },
      });
    }
  }
}
