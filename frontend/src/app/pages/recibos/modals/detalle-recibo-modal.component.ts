import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ReciboItem } from '../../../shared/models/recibo.models';

interface MetodoPagoItem { idMetodoPago?: number; nombre: string; monto: number; }
interface ReciboInput {
  idVenta: number; folioVenta: string; nombrePaciente?: string; folioPaciente?: string;
  fechaVenta?: string; montoTotal: number; montoPagado: number; saldoPendiente: number;
  exentoPago?: string; cancelada?: string; motivoCancelacion?: string | null;
  metodosPago: MetodoPagoItem[];
}

@Component({
  selector: 'app-detalle-recibo-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detalle-recibo-modal.component.html',
})
export class DetalleReciboModalComponent implements OnChanges {
  @Input() recibo: ReciboInput | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() abrirPago = new EventEmitter<void>();

  items: ReciboItem[] = [];
  loadingItems = false;

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recibo'] && this.recibo) {
      this.items = [];
      this.loadingItems = true;
      this.api.getReciboItems(this.recibo.idVenta).subscribe({
        next: (data) => { this.items = data; this.loadingItems = false; },
        error: () => { this.loadingItems = false; },
      });
    }
  }

  printRecibo(): void {
    if (!this.recibo) return;
    const r = this.recibo;
    const items = this.items;
    const fmtMoney = (n: number) => `$${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    const itemsRows = items.map(item => `
      <tr>
        <td>${item.tipo === 'PRODUCTO' ? 'Producto' : 'Servicio'}</td>
        <td>${item.descripcion ?? ''}</td>
        <td class="right">${fmtMoney(item.precio_unitario)}</td>
        <td class="right">${item.cantidad}</td>
        <td class="right bold">${fmtMoney(item.subtotal ?? 0)}</td>
      </tr>`).join('');
    const metodosRows = (r.metodosPago ?? []).map((mp) => `
      <tr>
        <td>${mp.nombre}</td>
        <td class="right bold">${fmtMoney(mp.monto)}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Comprobante ${r.folioVenta}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e293b;padding:32px;max-width:720px;margin:auto}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #e2e8f0}
        .org{font-size:20px;font-weight:900;color:#00328b}
        .org-sub{font-size:12px;color:#64748b;margin-top:2px}
        .folio{font-size:24px;font-weight:900;color:#10b981;text-align:right}
        .folio-date{font-size:11px;color:#94a3b8;text-align:right;margin-top:2px}
        .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
        .info-box .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:2px}
        .info-box .val{font-size:13px;font-weight:700}
        h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin:20px 0 10px}
        table{width:100%;border-collapse:collapse}
        th{text-align:left;font-size:10px;text-transform:uppercase;padding:6px 8px;background:#f8fafc;border-bottom:2px solid #e2e8f0;color:#64748b}
        td{padding:7px 8px;border-bottom:1px solid #f1f5f9;font-size:13px}
        .right{text-align:right}
        .bold{font-weight:700}
        .totals{margin-top:16px}
        .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
        .saldo{font-size:18px;font-weight:900;padding:10px 0;border-top:2px solid #e2e8f0;margin-top:6px;color:${r.saldoPendiente > 0 ? '#d97706' : '#10b981'}}
        .cancelada{margin-top:20px;padding:10px 14px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;color:#b91c1c;font-size:12px}
        @media print{@page{margin:18mm}body{padding:0}}
      </style></head><body>
      <div class="header">
        <div>
          <div class="org">EBIF</div>
          <div class="org-sub">Asociaci&oacute;n de Espina B&iacute;fida</div>
          <div class="org-sub" style="margin-top:6px;font-weight:700">Comprobante de Pago</div>
        </div>
        <div>
          <div class="folio">${r.folioVenta}</div>
          <div class="folio-date">${r.fechaVenta}</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-box"><div class="lbl">Beneficiario</div><div class="val">${r.nombrePaciente}</div></div>
        <div class="info-box"><div class="lbl">Folio Paciente</div><div class="val" style="font-family:monospace">${r.folioPaciente}</div></div>
        <div class="info-box"><div class="lbl">Exento de Pago</div><div class="val">${r.exentoPago === 'S' ? 'S&iacute;' : 'No'}</div></div>
      </div>
      <h2>Conceptos</h2>
      ${items.length > 0 ? `<table><thead><tr><th>Tipo</th><th>Descripci&oacute;n</th><th class="right">P.Unit</th><th class="right">Cant.</th><th class="right">Subtotal</th></tr></thead><tbody>${itemsRows}</tbody></table>` : '<p style="color:#94a3b8;font-style:italic;font-size:12px">Sin conceptos registrados.</p>'}
      <h2>M&eacute;todos de Pago</h2>
      <table><thead><tr><th>M&eacute;todo</th><th class="right">Monto</th></tr></thead><tbody>${metodosRows}</tbody></table>
      <div class="totals">
        <div class="total-row"><span>Monto Total</span><span>${fmtMoney(r.montoTotal)}</span></div>
        <div class="total-row"><span>Monto Pagado</span><span>${fmtMoney(r.montoPagado)}</span></div>
        <div class="total-row saldo"><span>Saldo Pendiente</span><span>${fmtMoney(r.saldoPendiente)}</span></div>
      </div>
      ${r.cancelada === 'S' ? `<div class="cancelada"><strong>CANCELADA</strong> &mdash; ${r.motivoCancelacion ?? ''}</div>` : ''}
    </body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.focus();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } else {
      URL.revokeObjectURL(blobUrl);
      const fallback = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(fallback);
      a.download = `comprobante_${r.folioVenta}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 150);
    }
  }
}
