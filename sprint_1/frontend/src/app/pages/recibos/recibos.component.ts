import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface MetodoPagoItem {
  idMetodoPago: number;
  nombre: string; // EFECTIVO / TRANSFERENCIA / TARJETA / EXENTO
  monto: number;
}

interface Recibo {
  idVenta: number;
  folioVenta: string;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaVenta: string;
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  exentoPago: string; // S / N
  cancelada: string; // S / N
  motivoCancelacion: string | null;
  metodosPago: MetodoPagoItem[];
}

interface MetodoPagoCatalogo {
  id: number;
  nombre: string;
}

interface BeneficiarioOption {
  id: number;
  folio: string;
  nombre: string;
}

interface MetodoPagoRow {
  id_metodo_pago: number;
  monto: number;
}

@Component({
  selector: 'app-recibos',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <app-navbar></app-navbar>

    <main class="flex-1 min-h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb]/30 via-white to-[#e0f2ff]/50">
      <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <!-- Receipt icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                <path d="M12 17.5v.5"/>
                <path d="M12 6v.5"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-black text-slate-900">Recibos</h1>
              <p class="text-sm text-slate-600">Gesti&oacute;n de cobros unificados</p>
            </div>
          </div>
          <button (click)="openNuevoCobro()" class="flex items-center gap-2 px-5 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
            </svg>
            Nuevo Cobro
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-4 gap-4">
          <!-- Total Recibos -->
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-emerald-100">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-emerald-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                  <path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>
                </svg>
              </div>
              <p class="text-xs text-slate-600 font-semibold">Total Recibos</p>
            </div>
            <p class="text-2xl font-black text-slate-900">{{ recibos.length }}</p>
          </div>
          <!-- Monto Total -->
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-blue-100">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <p class="text-xs text-slate-600 font-semibold">Monto Total</p>
            </div>
            <p class="text-2xl font-black text-slate-900">\${{ montoTotal | number:'1.0-0' }}</p>
          </div>
          <!-- Efectivo -->
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-emerald-100">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-emerald-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                </svg>
              </div>
              <p class="text-xs text-slate-600 font-semibold">Efectivo</p>
            </div>
            <p class="text-2xl font-black text-slate-900">\${{ montoEfectivo | number:'1.0-0' }}</p>
          </div>
          <!-- Tarjeta -->
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-emerald-100">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-blue-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                </svg>
              </div>
              <p class="text-xs text-slate-600 font-semibold">Tarjeta</p>
            </div>
            <p class="text-2xl font-black text-slate-900">\${{ montoTarjeta | number:'1.0-0' }}</p>
          </div>
        </div>

        <!-- Transferencia KPI -->
        <div class="grid grid-cols-4 gap-4">
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-purple-100">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-purple-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 12h16"/><path d="m8 8-4 4 4 4"/><path d="M20 4v16"/>
                </svg>
              </div>
              <p class="text-xs text-slate-600 font-semibold">Transferencia</p>
            </div>
            <p class="text-2xl font-black text-slate-900">\${{ montoTransferencia | number:'1.0-0' }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-slate-100">
          <div class="grid grid-cols-5 gap-4">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input type="text" placeholder="Buscar por folio..." [(ngModel)]="filtroFolio" (input)="filtrarRecibos()" class="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
            </div>
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input type="text" placeholder="Buscar por beneficiario..." [(ngModel)]="filtroBeneficiario" (input)="filtrarRecibos()" class="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
            </div>
            <div>
              <input type="date" [(ngModel)]="filtroFechaInicio" (change)="filtrarRecibos()" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="Fecha inicio" />
            </div>
            <div>
              <input type="date" [(ngModel)]="filtroFechaFin" (change)="filtrarRecibos()" class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" placeholder="Fecha fin" />
            </div>
            <button (click)="limpiarFiltros()" class="w-full py-2.5 px-4 border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              Limpiar
            </button>
          </div>
        </div>

        <!-- Loading Skeleton -->
        <div *ngIf="loading" class="bg-white rounded-xl shadow-lg border-2 border-slate-100 p-6">
          <div class="animate-pulse space-y-4">
            <div *ngFor="let _ of [1,2,3,4,5]" class="flex items-center gap-4 py-3">
              <div class="h-4 bg-slate-200 rounded w-24"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-slate-200 rounded w-1/3"></div>
              </div>
              <div class="h-4 bg-slate-200 rounded w-20"></div>
              <div class="h-6 bg-slate-200 rounded-full w-16"></div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div *ngIf="!loading" class="bg-white rounded-xl shadow-lg border-2 border-slate-100 overflow-hidden">
          <table class="w-full">
            <thead class="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/></svg>
                    Folio
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Beneficiario
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Fecha
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Monto Total
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Pagado
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  Saldo
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  Pago
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  Estado
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  Acci&oacute;n
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let recibo of recibosFiltrados; let i = index" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-4">
                  <span class="font-mono text-sm font-bold text-emerald-600">{{ recibo.folioVenta }}</span>
                </td>
                <td class="px-5 py-4 text-sm text-slate-700">{{ recibo.nombrePaciente }}</td>
                <td class="px-5 py-4 text-sm text-slate-600">{{ recibo.fechaVenta }}</td>
                <td class="px-5 py-4 text-sm font-bold text-slate-900">\${{ recibo.montoTotal | number:'1.2-2' }}</td>
                <td class="px-5 py-4 text-sm font-bold text-slate-900">\${{ recibo.montoPagado | number:'1.2-2' }}</td>
                <td class="px-5 py-4 text-sm font-semibold" [ngClass]="recibo.saldoPendiente > 0 ? 'text-amber-600' : 'text-slate-500'">\${{ recibo.saldoPendiente | number:'1.2-2' }}</td>
                <td class="px-5 py-4">
                  <span class="text-sm font-semibold"
                    [ngClass]="{
                      'text-emerald-600': $any(recibo.metodosPago[0])?.nombre === 'EFECTIVO',
                      'text-blue-600': $any(recibo.metodosPago[0])?.nombre === 'TARJETA',
                      'text-purple-600': $any(recibo.metodosPago[0])?.nombre === 'TRANSFERENCIA',
                      'text-slate-500': $any(recibo.metodosPago[0])?.nombre === 'EXENTO'
                    }">
                    {{ $any(recibo.metodosPago[0])?.nombre }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                    [ngClass]="{
                      'bg-red-100 text-red-700': recibo.cancelada === 'S',
                      'bg-emerald-100 text-emerald-700': recibo.cancelada !== 'S' && recibo.saldoPendiente === 0,
                      'bg-amber-100 text-amber-700': recibo.cancelada !== 'S' && recibo.saldoPendiente > 0
                    }">
                    {{ recibo.cancelada === 'S' ? 'Cancelada' : (recibo.saldoPendiente === 0 ? 'Pagada' : 'Pendiente') }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-1">
                    <button (click)="verDetalle(recibo)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-all cursor-pointer" title="Ver detalle">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button *ngIf="recibo.cancelada !== 'S'" (click)="confirmarCancelarRecibo(recibo)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-all cursor-pointer" title="Cancelar recibo">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="recibosFiltrados.length === 0">
                <td colspan="9" class="text-center py-8 text-slate-400 text-sm">No se encontraron recibos</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </main>

    <!-- Detail Modal -->
    <div *ngIf="showDetalle && reciboSeleccionado" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="closeDetalle()">
      <div class="bg-white rounded-2xl max-w-2xl w-full mx-4 shadow-2xl overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M14 8H8"/><path d="M16 12H8"/><path d="M13 16H8"/>
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900">Detalle de Recibo</h2>
              <p class="text-xs text-slate-500">{{ reciboSeleccionado.folioVenta }}</p>
            </div>
          </div>
          <button (click)="closeDetalle()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-5 space-y-5">
          <!-- Info Row -->
          <div class="grid grid-cols-3 gap-4">
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Folio</p>
              <p class="font-mono text-sm font-bold text-emerald-600">{{ reciboSeleccionado.folioVenta }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha</p>
              <p class="text-sm text-slate-700">{{ reciboSeleccionado.fechaVenta }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Beneficiario</p>
              <p class="text-sm text-slate-700 font-medium">{{ reciboSeleccionado.nombrePaciente }}</p>
            </div>
          </div>

          <!-- Patient Info -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Folio Paciente</p>
              <p class="font-mono text-sm text-slate-700">{{ reciboSeleccionado.folioPaciente }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Exento de Pago</p>
              <p class="text-sm text-slate-700 font-medium">{{ reciboSeleccionado.exentoPago === 'S' ? 'S&iacute;' : 'No' }}</p>
            </div>
          </div>

          <!-- Payment Methods -->
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">M&eacute;todos de Pago</p>
            <div class="space-y-2">
              <div *ngFor="let mp of reciboSeleccionado.metodosPago" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span class="text-sm font-semibold"
                  [ngClass]="{
                    'text-emerald-600': mp.nombre === 'EFECTIVO',
                    'text-blue-600': mp.nombre === 'TARJETA',
                    'text-purple-600': mp.nombre === 'TRANSFERENCIA',
                    'text-slate-500': mp.nombre === 'EXENTO'
                  }">
                  {{ mp.nombre }}
                </span>
                <span class="text-sm font-bold text-slate-900">\${{ mp.monto | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>

          <!-- Cancellation info -->
          <div *ngIf="reciboSeleccionado.cancelada === 'S'" class="p-3 bg-red-50 rounded-lg border border-red-200">
            <p class="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Cancelada</p>
            <p class="text-sm text-red-700">{{ reciboSeleccionado.motivoCancelacion }}</p>
          </div>

          <!-- Totals -->
          <div class="space-y-2">
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm font-semibold text-slate-600">Monto Total</span>
              <span class="text-sm font-bold text-slate-900">\${{ reciboSeleccionado.montoTotal | number:'1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm font-semibold text-slate-600">Monto Pagado</span>
              <span class="text-sm font-bold text-slate-900">\${{ reciboSeleccionado.montoPagado | number:'1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between p-4 bg-gradient-to-r rounded-xl"
              [ngClass]="reciboSeleccionado.saldoPendiente > 0 ? 'from-amber-500 to-amber-600' : 'from-emerald-500 to-emerald-600'">
              <span class="text-white font-bold text-lg">Saldo Pendiente</span>
              <span class="text-white font-black text-2xl">\${{ reciboSeleccionado.saldoPendiente | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Nuevo Cobro Modal -->
    <div *ngIf="showNuevoCobro" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeNuevoCobro()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">

        <!-- Modal Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-slate-900">Nuevo Cobro</h2>
          </div>
          <button (click)="closeNuevoCobro()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <!-- Error message -->
        <div *ngIf="nuevoCobroError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {{ nuevoCobroError }}
        </div>

        <!-- Form -->
        <div class="space-y-5">
          <!-- Paciente -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Paciente</label>
            <select [(ngModel)]="nuevoCobro.id_paciente"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
              <option [ngValue]="0" disabled>Seleccionar paciente...</option>
              <option *ngFor="let b of beneficiariosList" [ngValue]="b.id">{{ b.folio }} - {{ b.nombre }}</option>
            </select>
          </div>

          <!-- Monto Total -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Monto Total</label>
            <input type="number" [(ngModel)]="nuevoCobro.monto_total" (ngModelChange)="calcularSaldoCobro()" min="0" step="0.01"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              placeholder="0.00" />
          </div>

          <!-- Exento de Pago -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Exento de Pago</label>
            <select [(ngModel)]="nuevoCobro.exento_pago"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
              <option value="N">No</option>
              <option value="S">S&iacute;</option>
            </select>
          </div>

          <!-- Metodos de Pago -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-semibold text-slate-700">M&eacute;todos de Pago</label>
              <button (click)="agregarMetodoPago()" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                Agregar
              </button>
            </div>
            <div class="space-y-2">
              <div *ngFor="let mp of nuevoCobro.metodos_pago; let i = index" class="flex items-center gap-3">
                <select [(ngModel)]="mp.id_metodo_pago"
                  class="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                  <option [ngValue]="0" disabled>Seleccionar...</option>
                  <option *ngFor="let m of metodosPagoCatalogo" [ngValue]="m.id">{{ m.nombre }}</option>
                </select>
                <input type="number" [(ngModel)]="mp.monto" (ngModelChange)="calcularSaldoCobro()" min="0" step="0.01"
                  class="w-32 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                  placeholder="0.00" />
                <button *ngIf="nuevoCobro.metodos_pago.length > 1" (click)="removerMetodoPago(i)"
                  class="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 transition-all cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Totals summary -->
          <div class="bg-slate-50 rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-600 font-semibold">Monto Total</span>
              <span class="font-bold text-slate-900">\${{ nuevoCobro.monto_total | number:'1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-600 font-semibold">Monto Pagado</span>
              <span class="font-bold text-emerald-600">\${{ nuevoCobroMontoPagado | number:'1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
              <span class="font-bold" [ngClass]="nuevoCobroSaldoPendiente > 0 ? 'text-amber-600' : 'text-emerald-600'">Saldo Pendiente</span>
              <span class="font-black text-lg" [ngClass]="nuevoCobroSaldoPendiente > 0 ? 'text-amber-600' : 'text-emerald-600'">\${{ nuevoCobroSaldoPendiente | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex gap-3 pt-2">
            <button (click)="guardarCobro()" [disabled]="guardandoCobro"
              class="flex-1 px-6 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              {{ guardandoCobro ? 'Guardando...' : 'Guardar Cobro' }}
            </button>
            <button (click)="closeNuevoCobro()"
              class="px-6 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Cancel Confirmation Modal -->
    <div *ngIf="showConfirmCancelarRecibo && reciboACancelar" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" (click)="showConfirmCancelarRecibo = false">
      <div class="bg-white rounded-2xl max-w-md w-full mx-4 shadow-2xl p-6" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-900">Cancelar Recibo</h2>
          <button (click)="showConfirmCancelarRecibo = false" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <p class="text-center text-slate-700 text-lg font-semibold mb-1">&iquest;Cancelar este recibo?</p>
        <p class="text-center text-slate-500 text-sm mb-4">Recibo <span class="font-mono font-bold text-emerald-600">{{ reciboACancelar.folioVenta }}</span> por <span class="font-bold">\${{ reciboACancelar.montoTotal | number:'1.2-2' }}</span></p>
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">Motivo de cancelaci&oacute;n</label>
          <textarea [(ngModel)]="motivoCancelacion" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 transition-all text-sm resize-none" placeholder="Describe el motivo de la cancelaci&oacute;n..."></textarea>
        </div>
        <div class="flex gap-3 mt-4">
          <button (click)="cancelarRecibo()" [disabled]="cancelandoRecibo"
            class="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {{ cancelandoRecibo ? 'Cancelando...' : 'Confirmar Cancelaci\u00f3n' }}
          </button>
          <button (click)="showConfirmCancelarRecibo = false"
            class="px-6 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all cursor-pointer">
            Volver
          </button>
        </div>
      </div>
    </div>

    <app-footer></app-footer>
  `,
  styles: []
})
export class RecibosComponent implements OnInit {
  filtroFolio = '';
  filtroBeneficiario = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  loading = true;
  recibos: Recibo[] = [];
  recibosFiltrados: Recibo[] = [];

  montoTotal = 0;
  montoEfectivo = 0;
  montoTarjeta = 0;
  montoTransferencia = 0;

  showDetalle = false;
  reciboSeleccionado: Recibo | null = null;

  // Cancel recibo state
  showConfirmCancelarRecibo = false;
  reciboACancelar: Recibo | null = null;
  motivoCancelacion = '';
  cancelandoRecibo = false;

  // Nuevo Cobro modal state
  showNuevoCobro = false;
  guardandoCobro = false;
  nuevoCobroError = '';
  beneficiariosList: BeneficiarioOption[] = [];
  metodosPagoCatalogo: MetodoPagoCatalogo[] = [];
  nuevoCobroMontoPagado = 0;
  nuevoCobroSaldoPendiente = 0;

  nuevoCobro = {
    id_paciente: 0,
    monto_total: 0,
    exento_pago: 'N',
    metodos_pago: [{ id_metodo_pago: 0, monto: 0 }] as MetodoPagoRow[]
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarRecibos();
    this.cargarStats();
  }

  private cargarRecibos(): void {
    this.loading = true;
    this.api.getRecibos().subscribe({
      next: (data: any[]) => {
        this.recibos = data.map((r: any) => ({
          idVenta: r.id_venta,
          folioVenta: r.folio_venta,
          idPaciente: r.id_paciente,
          nombrePaciente: r.nombre_paciente,
          folioPaciente: r.folio_paciente,
          fechaVenta: r.fecha_venta,
          montoTotal: r.monto_total,
          montoPagado: r.monto_pagado,
          saldoPendiente: r.saldo_pendiente,
          exentoPago: r.exento_pago,
          cancelada: r.cancelada,
          motivoCancelacion: r.motivo_cancelacion,
          metodosPago: (r.metodos_pago || []).map((mp: any) => ({
            idMetodoPago: mp.id_metodo_pago,
            nombre: mp.nombre,
            monto: mp.monto
          }))
        }));
        this.recibosFiltrados = [...this.recibos];
        this.calcularEstadisticas();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar recibos:', err);
        this.loading = false;
      }
    });
  }

  private cargarStats(): void {
    this.api.getRecibosStats().subscribe({
      next: (stats: any) => {
        this.montoTotal = stats.monto_total_sum ?? 0;
        this.montoEfectivo = stats.monto_efectivo ?? 0;
        this.montoTarjeta = stats.monto_tarjeta ?? 0;
        this.montoTransferencia = stats.monto_transferencia ?? 0;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas de recibos:', err);
      }
    });
  }

  filtrarRecibos(): void {
    this.recibosFiltrados = this.recibos.filter(r => {
      const matchFolio = !this.filtroFolio ||
        r.folioVenta.toLowerCase().includes(this.filtroFolio.toLowerCase());
      const matchBeneficiario = !this.filtroBeneficiario ||
        r.nombrePaciente.toLowerCase().includes(this.filtroBeneficiario.toLowerCase());
      let matchFechaInicio = true;
      let matchFechaFin = true;
      if (this.filtroFechaInicio && r.fechaVenta) {
        matchFechaInicio = r.fechaVenta.slice(0, 10) >= this.filtroFechaInicio;
      }
      if (this.filtroFechaFin && r.fechaVenta) {
        matchFechaFin = r.fechaVenta.slice(0, 10) <= this.filtroFechaFin;
      }
      return matchFolio && matchBeneficiario && matchFechaInicio && matchFechaFin;
    });
  }

  limpiarFiltros(): void {
    this.filtroFolio = '';
    this.filtroBeneficiario = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.recibosFiltrados = [...this.recibos];
  }

  calcularEstadisticas(): void {
    this.montoTotal = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.montoTotal, 0);
    this.montoEfectivo = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'EFECTIVO').reduce((s, mp) => s + mp.monto, 0), 0);
    this.montoTarjeta = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'TARJETA').reduce((s, mp) => s + mp.monto, 0), 0);
    this.montoTransferencia = this.recibos
      .filter(r => r.cancelada !== 'S')
      .reduce((sum, r) => sum + r.metodosPago.filter(mp => mp.nombre === 'TRANSFERENCIA').reduce((s, mp) => s + mp.monto, 0), 0);
  }

  openNuevoCobro(): void {
    this.nuevoCobroError = '';
    this.guardandoCobro = false;
    this.nuevoCobro = {
      id_paciente: 0,
      monto_total: 0,
      exento_pago: 'N',
      metodos_pago: [{ id_metodo_pago: 0, monto: 0 }]
    };
    this.nuevoCobroMontoPagado = 0;
    this.nuevoCobroSaldoPendiente = 0;

    // Load beneficiarios and metodos de pago
    this.api.getBeneficiarios().subscribe({
      next: (data: any[]) => {
        this.beneficiariosList = data.map((b: any) => ({
          id: b.id_paciente,
          folio: b.folio_paciente || b.folio,
          nombre: b.nombre_completo || ((b.nombre || '') + ' ' + (b.apellido_paterno || '') + ' ' + (b.apellido_materno || '')).trim()
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err)
    });

    this.api.getMetodosPago().subscribe({
      next: (data: any[]) => {
        this.metodosPagoCatalogo = data.map((m: any) => ({
          id: m.id_metodo_pago || m.id,
          nombre: m.nombre
        }));
      },
      error: (err) => console.error('Error al cargar metodos de pago:', err)
    });

    this.showNuevoCobro = true;
  }

  closeNuevoCobro(): void {
    this.showNuevoCobro = false;
  }

  agregarMetodoPago(): void {
    this.nuevoCobro.metodos_pago.push({ id_metodo_pago: 0, monto: 0 });
  }

  removerMetodoPago(index: number): void {
    this.nuevoCobro.metodos_pago.splice(index, 1);
    this.calcularSaldoCobro();
  }

  calcularSaldoCobro(): void {
    this.nuevoCobroMontoPagado = this.nuevoCobro.metodos_pago.reduce((sum, mp) => sum + (mp.monto || 0), 0);
    this.nuevoCobroSaldoPendiente = (this.nuevoCobro.monto_total || 0) - this.nuevoCobroMontoPagado;
    if (this.nuevoCobroSaldoPendiente < 0) {
      this.nuevoCobroSaldoPendiente = 0;
    }
  }

  guardarCobro(): void {
    // Validation
    if (!this.nuevoCobro.id_paciente) {
      this.nuevoCobroError = 'Selecciona un paciente.';
      return;
    }
    if (!this.nuevoCobro.monto_total || this.nuevoCobro.monto_total <= 0) {
      this.nuevoCobroError = 'El monto total debe ser mayor a 0.';
      return;
    }
    const metodosValidos = this.nuevoCobro.metodos_pago.filter(mp => mp.id_metodo_pago > 0 && mp.monto > 0);
    if (metodosValidos.length === 0) {
      this.nuevoCobroError = 'Agrega al menos un metodo de pago con monto.';
      return;
    }

    this.nuevoCobroError = '';
    this.guardandoCobro = true;

    const payload = {
      id_paciente: this.nuevoCobro.id_paciente,
      monto_total: this.nuevoCobro.monto_total,
      monto_pagado: this.nuevoCobroMontoPagado,
      saldo_pendiente: this.nuevoCobroSaldoPendiente,
      exento_pago: this.nuevoCobro.exento_pago,
      metodos_pago: metodosValidos.map(mp => ({
        id_metodo_pago: mp.id_metodo_pago,
        monto: mp.monto
      }))
    };

    this.api.createRecibo(payload).subscribe({
      next: () => {
        this.guardandoCobro = false;
        this.showNuevoCobro = false;
        this.cargarRecibos();
        this.cargarStats();
      },
      error: (err) => {
        this.guardandoCobro = false;
        this.nuevoCobroError = err?.error?.detail || 'Error al crear el recibo. Intenta de nuevo.';
        console.error('Error al crear recibo:', err);
      }
    });
  }

  verDetalle(recibo: Recibo): void {
    this.reciboSeleccionado = recibo;
    this.showDetalle = true;
  }

  closeDetalle(): void {
    this.showDetalle = false;
    this.reciboSeleccionado = null;
  }

  confirmarCancelarRecibo(recibo: Recibo): void {
    this.reciboACancelar = recibo;
    this.motivoCancelacion = '';
    this.cancelandoRecibo = false;
    this.showConfirmCancelarRecibo = true;
  }

  cancelarRecibo(): void {
    if (!this.reciboACancelar) return;
    this.cancelandoRecibo = true;
    this.api.cancelarRecibo(this.reciboACancelar.idVenta, this.motivoCancelacion || undefined).subscribe({
      next: () => {
        this.cancelandoRecibo = false;
        this.showConfirmCancelarRecibo = false;
        this.reciboACancelar = null;
        this.cargarRecibos();
        this.cargarStats();
      },
      error: (err) => {
        this.cancelandoRecibo = false;
        console.error('Error al cancelar recibo:', err);
      }
    });
  }
}
