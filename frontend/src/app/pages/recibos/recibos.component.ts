import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

interface ReciboItem {
  id: number;
  nombre: string;
  tipo: 'Consulta' | 'Servicio' | 'Producto';
  precio: number;
  cantidad: number;
}

interface Recibo {
  folio: string;
  usuario: string;
  fecha: string;
  items: ReciboItem[];
  montoPagado: number;
  metodoPago: 'Efectivo' | 'Tarjeta';
  detallesTarjeta?: { ultimos4: string; banco: string; tipo: string };
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
          <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-blue-100">
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

        <!-- Filters -->
        <div class="bg-white rounded-xl p-4 shadow-lg border-2 border-slate-100">
          <div class="grid grid-cols-3 gap-4">
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
            <button (click)="limpiarFiltros()" class="w-full py-2.5 px-4 border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              Limpiar
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl shadow-lg border-2 border-slate-100 overflow-hidden">
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                    Items
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  <div class="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    Total
                  </div>
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  Pago
                </th>
                <th class="text-left px-5 py-4 text-xs font-bold text-slate-700">
                  Acci&oacute;n
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let recibo of recibosFiltrados; let i = index" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td class="px-5 py-4">
                  <span class="font-mono text-sm font-bold text-emerald-600">{{ recibo.folio }}</span>
                </td>
                <td class="px-5 py-4 text-sm text-slate-700">{{ recibo.usuario }}</td>
                <td class="px-5 py-4 text-sm text-slate-600">{{ recibo.fecha }}</td>
                <td class="px-5 py-4">
                  <div class="flex flex-wrap gap-1">
                    <span *ngFor="let item of recibo.items"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      [ngClass]="{
                        'bg-blue-100 text-blue-700': item.tipo === 'Consulta',
                        'bg-purple-100 text-purple-700': item.tipo === 'Servicio',
                        'bg-emerald-100 text-emerald-700': item.tipo === 'Producto'
                      }">
                      {{ item.tipo }} x{{ item.cantidad }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4 text-sm font-bold text-slate-900">\${{ recibo.montoPagado | number:'1.2-2' }}</td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-1.5 text-sm" *ngIf="recibo.metodoPago === 'Efectivo'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                    </svg>
                    <span class="text-emerald-600 font-semibold">Efectivo</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-sm" *ngIf="recibo.metodoPago === 'Tarjeta'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                    <span class="text-blue-600 font-semibold">Tarjeta</span>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <button (click)="verDetalle(recibo)" class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-all cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="recibosFiltrados.length === 0">
                <td colspan="7" class="text-center py-8 text-slate-400 text-sm">No se encontraron recibos</td>
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
              <p class="text-xs text-slate-500">{{ reciboSeleccionado.folio }}</p>
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
              <p class="font-mono text-sm font-bold text-emerald-600">{{ reciboSeleccionado.folio }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha</p>
              <p class="text-sm text-slate-700">{{ reciboSeleccionado.fecha }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Beneficiario</p>
              <p class="text-sm text-slate-700 font-medium">{{ reciboSeleccionado.usuario }}</p>
            </div>
          </div>

          <!-- Items List -->
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Items</p>
            <div class="space-y-2">
              <div *ngFor="let item of reciboSeleccionado.items" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                    [ngClass]="{
                      'bg-blue-100 text-blue-700': item.tipo === 'Consulta',
                      'bg-purple-100 text-purple-700': item.tipo === 'Servicio',
                      'bg-emerald-100 text-emerald-700': item.tipo === 'Producto'
                    }">
                    {{ item.tipo }}
                  </span>
                  <span class="text-sm text-slate-700">{{ item.nombre }}</span>
                </div>
                <div class="text-right">
                  <span class="text-sm text-slate-500">{{ item.cantidad }} x \${{ item.precio | number:'1.2-2' }}</span>
                  <span class="ml-3 text-sm font-bold text-slate-900">\${{ item.cantidad * item.precio | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Method -->
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">M&eacute;todo de Pago</p>
            <div class="flex items-center gap-2" *ngIf="reciboSeleccionado.metodoPago === 'Efectivo'">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>
                </svg>
              </div>
              <span class="text-sm font-semibold text-emerald-600">Efectivo</span>
            </div>
            <div *ngIf="reciboSeleccionado.metodoPago === 'Tarjeta'">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </div>
                <span class="text-sm font-semibold text-blue-600">Tarjeta</span>
              </div>
              <div *ngIf="reciboSeleccionado.detallesTarjeta" class="ml-10 p-3 bg-blue-50 rounded-lg text-sm space-y-1">
                <p class="text-slate-600">Terminaci&oacute;n: <span class="font-bold text-slate-800">**** {{ reciboSeleccionado.detallesTarjeta.ultimos4 }}</span></p>
                <p class="text-slate-600">Banco: <span class="font-bold text-slate-800">{{ reciboSeleccionado.detallesTarjeta.banco }}</span></p>
                <p class="text-slate-600">Tipo: <span class="font-bold text-slate-800">{{ reciboSeleccionado.detallesTarjeta.tipo }}</span></p>
              </div>
            </div>
          </div>

          <!-- Total -->
          <div class="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
            <span class="text-white font-bold text-lg">Total</span>
            <span class="text-white font-black text-2xl">\${{ reciboSeleccionado.montoPagado | number:'1.2-2' }}</span>
          </div>
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

  recibos: Recibo[] = [];
  recibosFiltrados: Recibo[] = [];

  montoTotal = 0;
  montoEfectivo = 0;
  montoTarjeta = 0;

  showDetalle = false;
  reciboSeleccionado: Recibo | null = null;

  ngOnInit(): void {
    this.recibos = [
      {
        folio: 'REC-2026-001', usuario: 'María González López', fecha: '2026-03-20',
        items: [
          { id: 1, nombre: 'Consulta General', tipo: 'Consulta', precio: 450, cantidad: 1 },
          { id: 2, nombre: 'Paracetamol 500mg', tipo: 'Producto', precio: 150, cantidad: 2 }
        ],
        montoPagado: 750, metodoPago: 'Efectivo'
      },
      {
        folio: 'REC-2026-002', usuario: 'Juan Pérez Martínez', fecha: '2026-03-21',
        items: [
          { id: 1, nombre: 'Fisioterapia', tipo: 'Servicio', precio: 350, cantidad: 2 },
          { id: 2, nombre: 'Ibuprofeno 400mg', tipo: 'Producto', precio: 8, cantidad: 20 }
        ],
        montoPagado: 860, metodoPago: 'Tarjeta',
        detallesTarjeta: { ultimos4: '4532', banco: 'BBVA', tipo: 'Débito' }
      }
    ];

    this.recibosFiltrados = [...this.recibos];
    this.calcularEstadisticas();
  }

  filtrarRecibos(): void {
    this.recibosFiltrados = this.recibos.filter(r => {
      const matchFolio = !this.filtroFolio ||
        r.folio.toLowerCase().includes(this.filtroFolio.toLowerCase());
      const matchBeneficiario = !this.filtroBeneficiario ||
        r.usuario.toLowerCase().includes(this.filtroBeneficiario.toLowerCase());
      return matchFolio && matchBeneficiario;
    });
  }

  limpiarFiltros(): void {
    this.filtroFolio = '';
    this.filtroBeneficiario = '';
    this.recibosFiltrados = [...this.recibos];
  }

  calcularEstadisticas(): void {
    this.montoTotal = this.recibos.reduce((sum, r) => sum + r.montoPagado, 0);
    this.montoEfectivo = this.recibos.filter(r => r.metodoPago === 'Efectivo').reduce((sum, r) => sum + r.montoPagado, 0);
    this.montoTarjeta = this.recibos.filter(r => r.metodoPago === 'Tarjeta').reduce((sum, r) => sum + r.montoPagado, 0);
  }

  openNuevoCobro(): void {
    // Placeholder for new cobro functionality
  }

  verDetalle(recibo: Recibo): void {
    this.reciboSeleccionado = recibo;
    this.showDetalle = true;
  }

  closeDetalle(): void {
    this.showDetalle = false;
    this.reciboSeleccionado = null;
  }
}
