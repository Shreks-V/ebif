import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface ProductoItem {
  idProducto: number;
  claveInterna: string;
  nombre: string;
  descripcion: string;
  tipoProducto: string; // MEDICAMENTO / EQUIPO
  precioA: number | null;
  precioB: number | null;
  activo: string;
  // Subtype fields
  presentacion?: string; // medicamento
  dosis?: string; // medicamento
  requiereCaducidad?: string; // medicamento
  numeroSerie?: string; // equipo
  marca?: string; // equipo
  modelo?: string; // equipo
  estatusEquipo?: string; // equipo
  observaciones?: string; // equipo
  // Existencia
  cantidadDisponible: number | null;
  nivelMinimo: number | null;
  unidadMedida: string;
  fechaCaducidad?: string | null;
}

interface ServicioItem {
  idServicio: number;
  nombre: string;
  descripcion: string;
  cuotaRecuperacion: number;
  precioA: number | null;
  precioB: number | null;
  activo: string;
}

interface ComodatoItem {
  idComodato: number;
  folioComodato: string;
  idEquipo: number;
  nombreEquipo: string;
  idPaciente: number;
  nombrePaciente: string;
  folioPaciente: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  estatus: string; // PRESTADO / DEVUELTO / CANCELADO
  montoTotal: number;
  montoPagado: number;
  saldoPendiente: number;
  exentoPago: string;
  notas?: string;
}

@Component({
  selector: 'app-almacen',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] overflow-hidden">
      <app-navbar />

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

          <!-- Header -->
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-[#00328b] rounded-2xl flex items-center justify-center shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-slate-800">Almac&eacute;n e Inventario</h1>
              <p class="text-slate-500 text-sm">Control de medicamentos, servicios y comodatos</p>
            </div>
          </div>

          <!-- KPI Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <!-- Total Items -->
            <div class="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
              <div class="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
              <svg class="w-8 h-8 text-blue-600 mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <p class="text-4xl font-black text-slate-900">{{ productos.length + servicios.length }}</p>
              <p class="text-sm text-slate-600 mt-1">Items en inventario</p>
            </div>
            <!-- Bajo Stock -->
            <div class="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200">
              <div class="absolute top-4 right-4 w-2.5 h-2.5 bg-amber-500 rounded-full"></div>
              <svg class="w-8 h-8 text-amber-600 mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <p class="text-4xl font-black text-slate-900">{{ getBajoStockCount() }}</p>
              <p class="text-sm text-slate-600 mt-1">Alertas de stock</p>
            </div>
            <!-- Pr&oacute;ximos a Vencer (RF-I-06) -->
            <div class="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-red-200">
              <div class="absolute top-4 right-4 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              <svg class="w-8 h-8 text-red-600 mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <p class="text-4xl font-black text-slate-900">{{ alertasCaducidad }}</p>
              <p class="text-sm text-slate-600 mt-1">Pr&oacute;ximos a vencer</p>
            </div>
            <!-- Comodatos Activos -->
            <div class="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
              <div class="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
              <svg class="w-8 h-8 text-green-600 mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <p class="text-4xl font-black text-slate-900">{{ getComodatosActivosCount() }}</p>
              <p class="text-sm text-slate-600 mt-1">Comodatos activos</p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
            <div class="flex gap-2">
              <button
                (click)="activeTab = 'inventario'"
                [class]="activeTab === 'inventario'
                  ? 'flex-1 px-6 py-3 rounded-lg font-semibold transition-all bg-[#00328b] text-white shadow-lg flex items-center justify-center gap-2'
                  : 'flex-1 px-6 py-3 rounded-lg font-semibold transition-all text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                Inventario
              </button>
              <button
                (click)="activeTab = 'comodatos'"
                [class]="activeTab === 'comodatos'
                  ? 'flex-1 px-6 py-3 rounded-lg font-semibold transition-all bg-[#00328b] text-white shadow-lg flex items-center justify-center gap-2'
                  : 'flex-1 px-6 py-3 rounded-lg font-semibold transition-all text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-2'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Comodatos
              </button>
            </div>
          </div>

          <!-- Loading Skeleton -->
          <div *ngIf="loading" class="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
            <div class="animate-pulse space-y-4">
              <div class="grid grid-cols-3 gap-6">
                <div *ngFor="let _ of [1,2,3]" class="h-28 bg-slate-200 rounded-2xl"></div>
              </div>
              <div class="space-y-3 mt-6">
                <div *ngFor="let _ of [1,2,3,4,5]" class="flex items-center gap-4 py-3">
                  <div class="w-12 h-12 bg-slate-200 rounded-xl"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/4"></div>
                  </div>
                  <div class="h-4 bg-slate-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB: Inventario -->
          <ng-container *ngIf="activeTab === 'inventario' && !loading">

            <!-- Category Filter Cards -->
            <div class="flex items-center justify-between mb-0">
              <h2 class="text-lg font-semibold text-slate-800">Filtrar por Categor&iacute;a</h2>
              <button *ngIf="selectedCategory" (click)="selectedCategory = null" class="text-sm text-slate-500 hover:text-slate-700 cursor-pointer bg-transparent border-0">Limpiar filtro</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Medicamentos -->
              <button
                (click)="toggleCategory('Medicamento')"
                [class]="selectedCategory === 'Medicamento'
                  ? 'bg-blue-50 rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-blue-500 text-left transition-all'
                  : 'bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-slate-200 hover:border-blue-300 text-left transition-all'"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div [class]="selectedCategory === 'Medicamento' ? 'p-3 bg-blue-600 rounded-xl shadow-lg' : 'p-3 bg-blue-100 rounded-xl'">
                    <svg class="w-6 h-6" [class.text-white]="selectedCategory === 'Medicamento'" [class.text-blue-600]="selectedCategory !== 'Medicamento'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">Medicamentos</h3>
                    <p class="text-sm text-slate-600">{{ getCategoryCount('Medicamento') }} items</p>
                  </div>
                </div>
                <p class="text-sm font-semibold" [class]="selectedCategory === 'Medicamento' ? 'text-blue-700' : 'text-slate-500'">
                  {{ selectedCategory === 'Medicamento' ? '&#10003; Filtro activo' : 'Ver categor&iacute;a' }}
                </p>
              </button>

              <!-- Servicios -->
              <button
                (click)="toggleCategory('Servicios')"
                [class]="selectedCategory === 'Servicios'
                  ? 'bg-purple-50 rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-purple-500 text-left transition-all'
                  : 'bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-slate-200 hover:border-purple-300 text-left transition-all'"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div [class]="selectedCategory === 'Servicios' ? 'p-3 bg-purple-600 rounded-xl shadow-lg' : 'p-3 bg-purple-100 rounded-xl'">
                    <svg class="w-6 h-6" [class.text-white]="selectedCategory === 'Servicios'" [class.text-purple-600]="selectedCategory !== 'Servicios'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V4a.3.3 0 1 0-.6 0"/><path d="M8 2h4.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5H12"/><path d="M14.5 2H19a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-1"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">Servicios</h3>
                    <p class="text-sm text-slate-600">{{ getCategoryCount('Servicios') }} items</p>
                  </div>
                </div>
                <p class="text-sm font-semibold" [class]="selectedCategory === 'Servicios' ? 'text-purple-700' : 'text-slate-500'">
                  {{ selectedCategory === 'Servicios' ? '&#10003; Filtro activo' : 'Ver categor&iacute;a' }}
                </p>
              </button>

              <!-- Equipo -->
              <button
                (click)="toggleCategory('Equipo')"
                [class]="selectedCategory === 'Equipo'
                  ? 'bg-green-50 rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-green-500 text-left transition-all'
                  : 'bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-slate-200 hover:border-green-300 text-left transition-all'"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div [class]="selectedCategory === 'Equipo' ? 'p-3 bg-green-600 rounded-xl shadow-lg' : 'p-3 bg-green-100 rounded-xl'">
                    <svg class="w-6 h-6" [class.text-white]="selectedCategory === 'Equipo'" [class.text-green-600]="selectedCategory !== 'Equipo'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">Equipo</h3>
                    <p class="text-sm text-slate-600">{{ getCategoryCount('Equipo') }} items</p>
                  </div>
                </div>
                <p class="text-sm font-semibold" [class]="selectedCategory === 'Equipo' ? 'text-green-700' : 'text-slate-500'">
                  {{ selectedCategory === 'Equipo' ? '&#10003; Filtro activo' : 'Ver categor&iacute;a' }}
                </p>
              </button>
            </div>

            <!-- Search + Add -->
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="relative flex-1">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="searchInventario"
                  placeholder="Buscar en inventario..."
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <button (click)="openNuevoProductoModal()" class="px-6 py-3 bg-[#00328b] text-white rounded-xl font-semibold text-sm hover:bg-[#002a75] transition-colors shadow-lg flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Agregar Item
              </button>
            </div>

            <!-- Inventory Table -->
            <div class="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">ID</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Categor&iacute;a</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Nombre</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Unidad</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Stock Actual</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Stock M&iacute;nimo</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Precio Cuota A</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Precio Cuota B</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Estado</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of filteredInventario()" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td class="px-5 py-4 text-slate-600 font-mono">{{ item.id }}</td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-2">
                          <div [ngClass]="getCategoryIconBg(item.categoria)" class="w-7 h-7 rounded-lg flex items-center justify-center">
                            <svg *ngIf="item.categoria === 'MEDICAMENTO'" class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                            </svg>
                            <svg *ngIf="item.categoria === 'SERVICIO'" class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V4"/>
                            </svg>
                            <svg *ngIf="item.categoria === 'EQUIPO'" class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                          </div>
                          <span class="text-slate-700">{{ item.categoria }}</span>
                        </div>
                      </td>
                      <td class="px-5 py-4 text-slate-800 font-medium">{{ item.nombre }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ item.unidadMedida }}</td>
                      <td class="px-5 py-4 text-slate-800 font-semibold">{{ item.cantidadDisponible !== null ? item.cantidadDisponible : '\u2014' }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ item.nivelMinimo !== null ? item.nivelMinimo : '\u2014' }}</td>
                      <td class="px-5 py-4">
                        <span class="text-green-700 font-semibold">{{ item.precioA !== null ? '$' + item.precioA.toFixed(2) : '\u2014' }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <span class="text-blue-700 font-semibold">{{ item.precioB !== null ? '$' + item.precioB.toFixed(2) : '\u2014' }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <span [ngClass]="getEstadoBadgeClass(item.estado)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                          {{ item.estado }}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-1">
                          <button (click)="openEditProductoModal(item)" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path stroke-linecap="round" stroke-linejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button (click)="openConfirmDeleteModal(item)" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </ng-container>

          <!-- TAB: Comodatos -->
          <ng-container *ngIf="activeTab === 'comodatos'">

            <!-- Search + Nuevo Comodato -->
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="relative flex-1">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="searchComodatos"
                  placeholder="Buscar comodatos..."
                  class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              <button (click)="openNuevoComodatoModal()" class="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Nuevo Comodato
              </button>
            </div>

            <!-- Comodatos Table -->
            <div class="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Folio</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Beneficiario</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Equipo</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Fecha Pr&eacute;stamo</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Devoluci&oacute;n</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Estatus</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let com of filteredComodatos()" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td class="px-5 py-4">
                        <span class="font-mono text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded">{{ com.folioComodato }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <div>
                          <p class="text-slate-800 font-medium">{{ com.nombrePaciente }}</p>
                          <p class="text-xs text-slate-400">{{ com.folioPaciente }}</p>
                        </div>
                      </td>
                      <td class="px-5 py-4 text-slate-700">{{ com.nombreEquipo }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ com.fechaPrestamo }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ com.fechaDevolucion ?? '\u2014' }}</td>
                      <td class="px-5 py-4">
                        <span [ngClass]="getComodatoEstadoBadgeClass(com.estatus)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                          {{ com.estatus }}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-1">
                          <button (click)="openEditComodatoModal(com)" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path stroke-linecap="round" stroke-linejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button *ngIf="com.estatus === 'PRESTADO'" (click)="marcarDevuelto(com)" class="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors" title="Marcar como devuelto">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </button>
                          <button (click)="descargarContratoComodato(com)" class="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors" title="Contrato PDF">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                            </svg>
                          </button>
                          <button (click)="printComodato(com)" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Imprimir">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </ng-container>

        </div>
      </main>

      <app-footer />
    </div>

    <!-- ==================== MODAL: Nuevo / Editar Producto ==================== -->
    <div *ngIf="showNuevoProductoModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeProductoModal()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-800">{{ editingProduct ? 'Editar Producto' : 'Agregar Nuevo Item' }}</h2>
          <button (click)="closeProductoModal()" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="submitProducto()" class="space-y-4">
          <!-- Row: Clave Interna + Nombre -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Clave Interna *</label>
              <input type="text" [(ngModel)]="productoForm.clave_interna" name="clave_interna" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Ej: MED-001" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
              <input type="text" [(ngModel)]="productoForm.nombre" name="nombre" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Nombre del producto" />
            </div>
          </div>

          <!-- Descripcion -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Descripci&oacute;n</label>
            <textarea [(ngModel)]="productoForm.descripcion" name="descripcion" rows="2"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm resize-none" placeholder="Descripci&oacute;n del producto"></textarea>
          </div>

          <!-- Row: Tipo Producto + Activo -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Producto *</label>
              <select [(ngModel)]="productoForm.tipo_producto" name="tipo_producto" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option value="">Seleccionar...</option>
                <option value="MEDICAMENTO">Medicamento</option>
                <option value="EQUIPO">Equipo</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Activo</label>
              <select [(ngModel)]="productoForm.activo" name="activo"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option value="S">S&iacute;</option>
                <option value="N">No</option>
              </select>
            </div>
          </div>

          <!-- Row: Precios -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Precio Cuota A</label>
              <input type="number" [(ngModel)]="productoForm.precio_cuota_a" name="precio_cuota_a" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="0.00" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Precio Cuota B</label>
              <input type="number" [(ngModel)]="productoForm.precio_cuota_b" name="precio_cuota_b" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="0.00" />
            </div>
          </div>

          <!-- MEDICAMENTO-specific fields -->
          <ng-container *ngIf="productoForm.tipo_producto === 'MEDICAMENTO'">
            <div class="border-t-2 border-slate-100 pt-4">
              <h3 class="text-sm font-bold text-blue-700 mb-3">Datos de Medicamento</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Presentaci&oacute;n</label>
                  <input type="text" [(ngModel)]="productoForm.presentacion" name="presentacion"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Ej: Tableta" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Dosis</label>
                  <input type="text" [(ngModel)]="productoForm.dosis" name="dosis"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Ej: 500mg" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Requiere Caducidad</label>
                  <select [(ngModel)]="productoForm.requiere_caducidad" name="requiere_caducidad"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                    <option value="S">S&iacute;</option>
                    <option value="N">No</option>
                  </select>
                </div>
              </div>
              <div *ngIf="productoForm.requiere_caducidad === 'S'" class="mt-4">
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Caducidad</label>
                <input type="date" [(ngModel)]="productoForm.fecha_caducidad" name="fecha_caducidad"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
              </div>
            </div>
          </ng-container>

          <!-- EQUIPO-specific fields -->
          <ng-container *ngIf="productoForm.tipo_producto === 'EQUIPO'">
            <div class="border-t-2 border-slate-100 pt-4">
              <h3 class="text-sm font-bold text-green-700 mb-3">Datos de Equipo</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">N&uacute;mero de Serie</label>
                  <input type="text" [(ngModel)]="productoForm.numero_serie" name="numero_serie"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="N&uacute;mero de serie" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Marca</label>
                  <input type="text" [(ngModel)]="productoForm.marca" name="marca"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Marca" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Modelo</label>
                  <input type="text" [(ngModel)]="productoForm.modelo" name="modelo"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Modelo" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Estatus Equipo</label>
                  <select [(ngModel)]="productoForm.estatus_equipo" name="estatus_equipo"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                    <option value="DISPONIBLE">Disponible</option>
                    <option value="EN_USO">En Uso</option>
                    <option value="DAÑADO">Da&ntilde;ado</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-slate-700 mb-1">Observaciones</label>
                  <input type="text" [(ngModel)]="productoForm.observaciones" name="observaciones"
                    class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Observaciones" />
                </div>
              </div>
            </div>
          </ng-container>

          <!-- Row: Cantidad, Nivel Minimo, Unidad Medida -->
          <div class="border-t-2 border-slate-100 pt-4">
            <h3 class="text-sm font-bold text-slate-600 mb-3">Existencia</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Cantidad Disponible</label>
                <input type="number" [(ngModel)]="productoForm.cantidad_disponible" name="cantidad_disponible" min="0"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="0" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Nivel M&iacute;nimo</label>
                <input type="number" [(ngModel)]="productoForm.nivel_minimo" name="nivel_minimo" min="0"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="5" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                <input type="text" [(ngModel)]="productoForm.unidad_medida" name="unidad_medida"
                  class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="Ej: Pieza, Caja" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t-2 border-slate-100">
            <button type="button" (click)="closeProductoModal()"
              class="px-6 py-3 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors border-2 border-slate-200">
              Cancelar
            </button>
            <button type="submit" [disabled]="submittingProducto"
              class="px-6 py-3 bg-[#00328b] text-white rounded-xl font-semibold text-sm hover:bg-[#002a75] transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {{ submittingProducto ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Guardar') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== MODAL: Confirmar Eliminacion ==================== -->
    <div *ngIf="showConfirmDeleteModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeConfirmDeleteModal()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-slate-800">Confirmar Eliminaci&oacute;n</h2>
          <button (click)="closeConfirmDeleteModal()" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="mb-6">
          <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </div>
          <p class="text-center text-slate-700 text-lg font-semibold">&iquest;Est&aacute;s seguro?</p>
          <p class="text-center text-slate-500 text-sm mt-1">
            Se eliminar&aacute; <span class="font-semibold text-slate-700">"{{ productoToDelete?.nombre }}"</span> del inventario. Esta acci&oacute;n no se puede deshacer.
          </p>
        </div>
        <div class="flex items-center justify-end gap-3">
          <button (click)="closeConfirmDeleteModal()"
            class="px-6 py-3 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors border-2 border-slate-200">
            Cancelar
          </button>
          <button (click)="confirmDelete()" [disabled]="submittingDelete"
            class="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
            {{ submittingDelete ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL: Nuevo Comodato ==================== -->
    <div *ngIf="showNuevoComodatoModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeComodatoModal()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-800">Nuevo Comodato</h2>
          <button (click)="closeComodatoModal()" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="submitComodato()" class="space-y-4">
          <!-- Row: Paciente + Equipo -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Paciente *</label>
              <select [(ngModel)]="comodatoForm.id_paciente" name="id_paciente" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option [ngValue]="null">Seleccionar paciente...</option>
                <option *ngFor="let b of beneficiariosList" [ngValue]="b.id">{{ b.nombre }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Equipo *</label>
              <select [(ngModel)]="comodatoForm.id_equipo" name="id_equipo" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option [ngValue]="null">Seleccionar equipo...</option>
                <option *ngFor="let e of equiposList" [ngValue]="e.idProducto">{{ e.nombre }}</option>
              </select>
            </div>
          </div>

          <!-- Row: Fechas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Pr&eacute;stamo *</label>
              <input type="date" [(ngModel)]="comodatoForm.fecha_prestamo" name="fecha_prestamo" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Devoluci&oacute;n</label>
              <input type="date" [(ngModel)]="comodatoForm.fecha_devolucion" name="fecha_devolucion"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
          </div>

          <!-- Row: Estatus + Exento -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Estatus</label>
              <select [(ngModel)]="comodatoForm.estatus" name="estatus"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option value="PRESTADO">Prestado</option>
                <option value="DEVUELTO">Devuelto</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Exento de Pago</label>
              <select [(ngModel)]="comodatoForm.exento_pago" name="exento_pago"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option value="N">No</option>
                <option value="S">S&iacute;</option>
              </select>
            </div>
          </div>

          <!-- Row: Montos -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Monto Total</label>
              <input type="number" [(ngModel)]="comodatoForm.monto_total" name="monto_total" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="0.00" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Monto Pagado</label>
              <input type="number" [(ngModel)]="comodatoForm.monto_pagado" name="monto_pagado" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="0.00" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Saldo Pendiente</label>
              <input type="number" [(ngModel)]="comodatoForm.saldo_pendiente" name="saldo_pendiente" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" placeholder="0.00" />
            </div>
          </div>

          <!-- Notas -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Notas</label>
            <textarea [(ngModel)]="comodatoForm.notas" name="notas" rows="3"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm resize-none" placeholder="Notas adicionales..."></textarea>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t-2 border-slate-100">
            <button type="button" (click)="closeComodatoModal()"
              class="px-6 py-3 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors border-2 border-slate-200">
              Cancelar
            </button>
            <button type="submit" [disabled]="submittingComodato"
              class="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {{ submittingComodato ? 'Guardando...' : 'Crear Comodato' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== MODAL: Editar Servicio ==================== -->
    <div *ngIf="showEditServicioModal && editServicioForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showEditServicioModal = false">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full mx-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-800">Editar Servicio</h2>
          <button (click)="showEditServicioModal = false" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form (ngSubmit)="guardarEdicionServicio()" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
            <input type="text" [(ngModel)]="editServicioForm.nombre" name="editSrvNombre" required
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Descripci&oacute;n</label>
            <textarea [(ngModel)]="editServicioForm.descripcion" name="editSrvDesc" rows="3"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm resize-none"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Precio Cuota A</label>
              <input type="number" [(ngModel)]="editServicioForm.precio_cuota_a" name="editSrvPrecioA" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm"/>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Precio Cuota B</label>
              <input type="number" [(ngModel)]="editServicioForm.precio_cuota_b" name="editSrvPrecioB" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm"/>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
            <select [(ngModel)]="editServicioForm.activo" name="editSrvActivo"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm">
              <option value="S">Activo</option>
              <option value="N">Inactivo</option>
            </select>
          </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" (click)="showEditServicioModal = false" class="px-6 py-3 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors border-2 border-slate-200">Cancelar</button>
            <button type="submit" [disabled]="submittingEditServicio" class="px-6 py-3 bg-[#00328b] text-white rounded-xl font-semibold text-sm hover:bg-[#002a75] transition-colors disabled:opacity-50">
              {{ submittingEditServicio ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== MODAL: Editar Comodato ==================== -->
    <div *ngIf="showEditComodatoModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showEditComodatoModal = false">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-slate-800">Editar Comodato</h2>
          <button (click)="showEditComodatoModal = false" class="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form (ngSubmit)="guardarEdicionComodato()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Pr&eacute;stamo *</label>
              <input type="date" [(ngModel)]="editComodatoForm.fecha_prestamo" name="ecFechaPrest" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Devoluci&oacute;n</label>
              <input type="date" [(ngModel)]="editComodatoForm.fecha_devolucion" name="ecFechaDev"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Estatus</label>
              <select [(ngModel)]="editComodatoForm.estatus" name="ecEstatus"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option value="PRESTADO">Prestado</option>
                <option value="DEVUELTO">Devuelto</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Exento de Pago</label>
              <select [(ngModel)]="editComodatoForm.exento_pago" name="ecExento"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm bg-white">
                <option value="N">No</option>
                <option value="S">S&iacute;</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Monto Total</label>
              <input type="number" [(ngModel)]="editComodatoForm.monto_total" name="ecMontoTotal" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Monto Pagado</label>
              <input type="number" [(ngModel)]="editComodatoForm.monto_pagado" name="ecMontoPagado" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Saldo Pendiente</label>
              <input type="number" [(ngModel)]="editComodatoForm.saldo_pendiente" name="ecSaldo" step="0.01" min="0"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Notas</label>
            <textarea [(ngModel)]="editComodatoForm.notas" name="ecNotas" rows="3"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors text-sm resize-none"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t-2 border-slate-100">
            <button type="button" (click)="showEditComodatoModal = false"
              class="px-6 py-3 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors border-2 border-slate-200">
              Cancelar
            </button>
            <button type="submit" [disabled]="submittingEditComodato"
              class="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {{ submittingEditComodato ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== PRINT CONTAINER (hidden, used by window.print) ==================== -->
    <div id="print-comodato" class="hidden print:block print:p-8" *ngIf="printingComodato">
      <h1 class="text-2xl font-bold mb-4">Comodato {{ printingComodato.folioComodato }}</h1>
      <table class="w-full border-collapse text-sm">
        <tr class="border-b"><td class="py-2 font-semibold w-40">Folio:</td><td class="py-2">{{ printingComodato.folioComodato }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Paciente:</td><td class="py-2">{{ printingComodato.nombrePaciente }} ({{ printingComodato.folioPaciente }})</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Equipo:</td><td class="py-2">{{ printingComodato.nombreEquipo }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Fecha Pr&eacute;stamo:</td><td class="py-2">{{ printingComodato.fechaPrestamo }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Fecha Devoluci&oacute;n:</td><td class="py-2">{{ printingComodato.fechaDevolucion ?? 'Pendiente' }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Estatus:</td><td class="py-2">{{ printingComodato.estatus }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Monto Total:</td><td class="py-2">\${{ printingComodato.montoTotal.toFixed(2) }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Monto Pagado:</td><td class="py-2">\${{ printingComodato.montoPagado.toFixed(2) }}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">Saldo Pendiente:</td><td class="py-2">\${{ printingComodato.saldoPendiente.toFixed(2) }}</td></tr>
        <tr><td class="py-2 font-semibold">Exento de Pago:</td><td class="py-2">{{ printingComodato.exentoPago === 'S' ? 'S&iacute;' : 'No' }}</td></tr>
      </table>
    </div>
  `,
  styles: [`
    @media print {
      app-navbar, app-footer, main, .fixed { display: none !important; }
      #print-comodato { display: block !important; }
    }
  `],
})
export class AlmacenComponent implements OnInit {
  activeTab: 'inventario' | 'comodatos' = 'inventario';
  selectedCategory: string | null = null;
  searchInventario = '';
  searchComodatos = '';

  loading = true;
  productos: ProductoItem[] = [];
  servicios: ServicioItem[] = [];
  comodatos: ComodatoItem[] = [];
  alertasCaducidad = 0;

  // Modal state
  showNuevoProductoModal = false;
  showNuevoComodatoModal = false;
  showConfirmDeleteModal = false;
  editingProduct: ProductoItem | null = null;
  productoToDelete: { id: number; nombre: string; categoria: string } | null = null;

  // Submission flags
  submittingProducto = false;
  submittingDelete = false;
  submittingComodato = false;

  // Print
  printingComodato: ComodatoItem | null = null;

  // Producto form
  productoForm = this.getEmptyProductoForm();

  // Comodato form
  comodatoForm = this.getEmptyComodatoForm();

  // Data for comodato selects
  beneficiariosList: { id: number; nombre: string }[] = [];
  equiposList: ProductoItem[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadProductos();
    this.loadServicios();
    this.loadComodatos();
    this.loadAlmacenStats();
  }

  // ──────────────── Data Loading ────────────────

  loadProductos(): void {
    this.loading = true;
    this.api.getProductos().subscribe({
      next: (data) => {
        this.productos = data.map((p: any) => ({
          idProducto: p.id_producto,
          claveInterna: p.clave_interna,
          nombre: p.nombre,
          descripcion: p.descripcion,
          tipoProducto: p.tipo_producto,
          precioA: p.precio_cuota_a,
          precioB: p.precio_cuota_b,
          activo: p.activo,
          presentacion: p.presentacion,
          dosis: p.dosis,
          requiereCaducidad: p.requiere_caducidad,
          numeroSerie: p.numero_serie,
          marca: p.marca,
          modelo: p.modelo,
          estatusEquipo: p.estatus_equipo,
          observaciones: p.observaciones,
          cantidadDisponible: p.cantidad_disponible,
          nivelMinimo: p.nivel_minimo,
          unidadMedida: p.unidad_medida,
          fechaCaducidad: p.fecha_caducidad,
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading productos:', err);
        this.loading = false;
      },
    });
  }

  loadAlmacenStats(): void {
    this.api.getAlmacenStats().subscribe({
      next: (stats: any) => {
        this.alertasCaducidad = stats.alertas_caducidad ?? 0;
      },
      error: () => {
        this.alertasCaducidad = 0;
      },
    });
  }

  loadServicios(): void {
    this.api.getServicios().subscribe({
      next: (data) => {
        this.servicios = data.map((s: any) => ({
          idServicio: s.id_servicio,
          nombre: s.nombre,
          descripcion: s.descripcion,
          cuotaRecuperacion: s.cuota_recuperacion,
          precioA: s.precio_cuota_a,
          precioB: s.precio_cuota_b,
          activo: s.activo,
        }));
      },
      error: (err) => console.error('Error loading servicios:', err),
    });
  }

  loadComodatos(): void {
    this.api.getComodatos().subscribe({
      next: (data) => {
        this.comodatos = data.map((c: any) => ({
          idComodato: c.id_comodato,
          folioComodato: c.folio_comodato,
          idEquipo: c.id_equipo,
          nombreEquipo: c.nombre_equipo,
          idPaciente: c.id_paciente,
          nombrePaciente: c.nombre_paciente,
          folioPaciente: c.folio_paciente,
          fechaPrestamo: c.fecha_prestamo,
          fechaDevolucion: c.fecha_devolucion,
          estatus: c.estatus,
          montoTotal: c.monto_total,
          montoPagado: c.monto_pagado,
          saldoPendiente: c.saldo_pendiente,
          exentoPago: c.exento_pago,
          notas: c.notas,
        }));
      },
      error: (err) => console.error('Error loading comodatos:', err),
    });
  }

  // ──────────────── Form Defaults ────────────────

  getEmptyProductoForm() {
    return {
      clave_interna: '',
      nombre: '',
      descripcion: '',
      tipo_producto: '',
      precio_cuota_a: null as number | null,
      precio_cuota_b: null as number | null,
      activo: 'S',
      presentacion: '',
      dosis: '',
      requiere_caducidad: 'S',
      numero_serie: '',
      marca: '',
      modelo: '',
      estatus_equipo: 'DISPONIBLE',
      observaciones: '',
      cantidad_disponible: 0,
      nivel_minimo: 5,
      unidad_medida: '',
      fecha_caducidad: '',
    };
  }

  getEmptyComodatoForm() {
    return {
      id_paciente: null as number | null,
      id_equipo: null as number | null,
      fecha_prestamo: '',
      fecha_devolucion: '',
      estatus: 'PRESTADO',
      monto_total: 0,
      monto_pagado: 0,
      saldo_pendiente: 0,
      exento_pago: 'N',
      notas: '',
    };
  }

  // ──────────────── Producto Modal ────────────────

  openNuevoProductoModal(): void {
    this.editingProduct = null;
    this.productoForm = this.getEmptyProductoForm();
    this.showNuevoProductoModal = true;
  }

  openEditProductoModal(item: { id: number; categoria: string; nombre: string }): void {
    // Handle servicio edit
    if (item.categoria === 'SERVICIO') {
      this.editarServicio(item);
      return;
    }

    // Find the actual product from the productos array
    const producto = this.productos.find(p => p.idProducto === item.id);
    if (!producto) return;

    this.editingProduct = producto;
    this.productoForm = {
      clave_interna: producto.claveInterna,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      tipo_producto: producto.tipoProducto,
      precio_cuota_a: producto.precioA,
      precio_cuota_b: producto.precioB,
      activo: producto.activo,
      presentacion: producto.presentacion ?? '',
      dosis: producto.dosis ?? '',
      requiere_caducidad: producto.requiereCaducidad ?? 'S',
      numero_serie: producto.numeroSerie ?? '',
      marca: producto.marca ?? '',
      modelo: producto.modelo ?? '',
      estatus_equipo: producto.estatusEquipo ?? 'DISPONIBLE',
      observaciones: producto.observaciones ?? '',
      cantidad_disponible: producto.cantidadDisponible ?? 0,
      nivel_minimo: producto.nivelMinimo ?? 5,
      unidad_medida: producto.unidadMedida,
      fecha_caducidad: producto.fechaCaducidad ? producto.fechaCaducidad.substring(0, 10) : '',
    };
    this.showNuevoProductoModal = true;
  }

  closeProductoModal(): void {
    this.showNuevoProductoModal = false;
    this.editingProduct = null;
  }

  submitProducto(): void {
    if (!this.productoForm.clave_interna || !this.productoForm.nombre || !this.productoForm.tipo_producto) return;

    this.submittingProducto = true;
    const payload: any = { ...this.productoForm };

    // Clean up type-specific fields
    if (payload.tipo_producto === 'MEDICAMENTO') {
      delete payload.numero_serie;
      delete payload.marca;
      delete payload.modelo;
      delete payload.estatus_equipo;
      delete payload.observaciones;
    } else if (payload.tipo_producto === 'EQUIPO') {
      delete payload.presentacion;
      delete payload.dosis;
      delete payload.requiere_caducidad;
      delete payload.fecha_caducidad;
    }
    if (payload.fecha_caducidad === '') {
      payload.fecha_caducidad = null;
    }

    if (this.editingProduct) {
      this.api.updateProducto(this.editingProduct.idProducto, payload).subscribe({
        next: () => {
          this.loadProductos();
          this.closeProductoModal();
          this.submittingProducto = false;
        },
        error: (err) => {
          console.error('Error updating producto:', err);
          this.submittingProducto = false;
        },
      });
    } else {
      this.api.createProducto(payload).subscribe({
        next: () => {
          this.loadProductos();
          this.closeProductoModal();
          this.submittingProducto = false;
        },
        error: (err) => {
          console.error('Error creating producto:', err);
          this.submittingProducto = false;
        },
      });
    }
  }

  // ──────────────── Delete Modal ────────────────

  openConfirmDeleteModal(item: { id: number; nombre: string; categoria: string }): void {
    this.productoToDelete = item;
    this.showConfirmDeleteModal = true;
  }

  closeConfirmDeleteModal(): void {
    this.showConfirmDeleteModal = false;
    this.productoToDelete = null;
  }

  confirmDelete(): void {
    if (!this.productoToDelete) return;

    this.submittingDelete = true;
    const isServicio = this.productoToDelete.categoria === 'SERVICIO';
    const deleteObs = isServicio
      ? this.api.deleteServicio(this.productoToDelete.id)
      : this.api.deleteProducto(this.productoToDelete.id);

    deleteObs.subscribe({
      next: () => {
        if (isServicio) {
          this.loadServicios();
        } else {
          this.loadProductos();
        }
        this.closeConfirmDeleteModal();
        this.submittingDelete = false;
      },
      error: (err) => {
        console.error('Error deleting item:', err);
        this.submittingDelete = false;
      },
    });
  }

  // ──────────────── Comodato Modal ────────────────

  openNuevoComodatoModal(): void {
    this.comodatoForm = this.getEmptyComodatoForm();
    this.equiposList = this.productos.filter(p => p.tipoProducto === 'EQUIPO');

    // Load beneficiarios for the select
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b: any) => ({
          id: b.id_paciente ?? b.id,
          nombre: `${b.nombre ?? ''} ${b.apellido_paterno ?? ''} ${b.apellido_materno ?? ''}`.trim() || b.nombre_completo || `Paciente ${b.folio}`,
        }));
      },
      error: (err) => console.error('Error loading beneficiarios:', err),
    });

    this.showNuevoComodatoModal = true;
  }

  closeComodatoModal(): void {
    this.showNuevoComodatoModal = false;
  }

  submitComodato(): void {
    if (!this.comodatoForm.id_paciente || !this.comodatoForm.id_equipo || !this.comodatoForm.fecha_prestamo) return;

    this.submittingComodato = true;
    const payload: any = { ...this.comodatoForm };
    if (!payload.fecha_devolucion) {
      payload.fecha_devolucion = null;
    }

    this.api.createComodato(payload).subscribe({
      next: () => {
        this.loadComodatos();
        this.closeComodatoModal();
        this.submittingComodato = false;
      },
      error: (err) => {
        console.error('Error creating comodato:', err);
        this.submittingComodato = false;
      },
    });
  }

  // ──────────────── Print Comodato ────────────────

  printComodato(com: ComodatoItem): void {
    this.printingComodato = com;
    setTimeout(() => {
      window.print();
      this.printingComodato = null;
    }, 100);
  }

  descargarContratoComodato(com: ComodatoItem): void {
    this.api.exportarContratoComodatoPdf(com.idComodato).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `contrato_${com.folioComodato}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => alert('Error al generar contrato de comodato'),
    });
  }

  // ──────────────── KPI Helpers ────────────────

  getBajoStockCount(): number {
    return this.productos.filter(p =>
      p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo
    ).length;
  }

  getComodatosActivosCount(): number {
    return this.comodatos.filter(c => c.estatus === 'PRESTADO').length;
  }

  getCategoryCount(categoria: string): number {
    if (categoria === 'Medicamento') {
      return this.productos.filter(p => p.tipoProducto === 'MEDICAMENTO').length;
    }
    if (categoria === 'Servicios') {
      return this.servicios.length;
    }
    if (categoria === 'Equipo') {
      return this.productos.filter(p => p.tipoProducto === 'EQUIPO').length;
    }
    return 0;
  }

  toggleCategory(categoria: string): void {
    this.selectedCategory = this.selectedCategory === categoria ? null : categoria;
  }

  // Unified row type for the inventory table
  filteredInventario(): { id: number; categoria: string; nombre: string; unidadMedida: string; cantidadDisponible: number | null; nivelMinimo: number | null; precioA: number | null; precioB: number | null; estado: string }[] {
    let items: { id: number; categoria: string; nombre: string; unidadMedida: string; cantidadDisponible: number | null; nivelMinimo: number | null; precioA: number | null; precioB: number | null; estado: string }[] = [];

    const showMedicamentos = !this.selectedCategory || this.selectedCategory === 'Medicamento';
    const showServicios = !this.selectedCategory || this.selectedCategory === 'Servicios';
    const showEquipos = !this.selectedCategory || this.selectedCategory === 'Equipo';

    if (showMedicamentos) {
      this.productos
        .filter(p => p.tipoProducto === 'MEDICAMENTO')
        .forEach(p => {
          const estado = (p.cantidadDisponible !== null && p.nivelMinimo !== null && p.cantidadDisponible < p.nivelMinimo)
            ? 'Bajo Stock'
            : (p.cantidadDisponible === 0 ? 'Agotado' : 'Normal');
          items.push({
            id: p.idProducto, categoria: 'MEDICAMENTO', nombre: p.nombre, unidadMedida: p.unidadMedida,
            cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
            precioA: p.precioA, precioB: p.precioB, estado
          });
        });
    }

    if (showServicios) {
      this.servicios.forEach(s => {
        items.push({
          id: s.idServicio, categoria: 'SERVICIO', nombre: s.nombre, unidadMedida: 'Servicio',
          cantidadDisponible: null, nivelMinimo: null,
          precioA: s.precioA, precioB: s.precioB, estado: 'N/A'
        });
      });
    }

    if (showEquipos) {
      this.productos
        .filter(p => p.tipoProducto === 'EQUIPO')
        .forEach(p => {
          items.push({
            id: p.idProducto, categoria: 'EQUIPO', nombre: p.nombre, unidadMedida: p.unidadMedida,
            cantidadDisponible: p.cantidadDisponible, nivelMinimo: p.nivelMinimo,
            precioA: p.precioA, precioB: p.precioB, estado: p.estatusEquipo ?? 'N/A'
          });
        });
    }

    if (this.searchInventario.trim()) {
      const q = this.searchInventario.toLowerCase();
      items = items.filter(i => i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q));
    }

    return items;
  }

  filteredComodatos(): ComodatoItem[] {
    if (!this.searchComodatos.trim()) return this.comodatos;
    const q = this.searchComodatos.toLowerCase();
    return this.comodatos.filter(c =>
      c.nombrePaciente.toLowerCase().includes(q) ||
      c.folioComodato.toLowerCase().includes(q) ||
      c.nombreEquipo.toLowerCase().includes(q)
    );
  }

  getCategoryIconBg(categoria: string): string {
    switch (categoria) {
      case 'MEDICAMENTO': return 'bg-blue-100';
      case 'SERVICIO': return 'bg-purple-100';
      case 'EQUIPO': return 'bg-green-100';
      default: return 'bg-slate-100';
    }
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Normal': return 'bg-green-100 text-green-700';
      case 'DISPONIBLE': return 'bg-green-100 text-green-700';
      case 'Bajo Stock': return 'bg-amber-100 text-amber-700';
      case 'EN_PRESTAMO': return 'bg-blue-100 text-blue-700';
      case 'Agotado': return 'bg-red-100 text-red-700';
      case 'EN_MANTENIMIENTO': return 'bg-orange-100 text-orange-700';
      case 'N/A': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  getComodatoEstadoBadgeClass(estatus: string): string {
    switch (estatus) {
      case 'PRESTADO': return 'bg-green-100 text-green-700';
      case 'DEVUELTO': return 'bg-slate-100 text-slate-600';
      case 'CANCELADO': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  // ──────────────── Editar Servicio ────────────────

  showEditServicioModal = false;
  editServicioForm: any = null;
  editServicioId = 0;
  submittingEditServicio = false;

  editarServicio(item: { id: number }): void {
    const servicio = this.servicios.find(s => s.idServicio === item.id);
    if (!servicio) return;
    this.editServicioId = servicio.idServicio;
    this.editServicioForm = {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      precio_cuota_a: servicio.precioA,
      precio_cuota_b: servicio.precioB,
      activo: servicio.activo,
    };
    this.showEditServicioModal = true;
  }

  guardarEdicionServicio(): void {
    if (!this.editServicioForm.nombre) return;
    this.submittingEditServicio = true;
    this.api.updateServicio(this.editServicioId, this.editServicioForm).subscribe({
      next: () => {
        this.showEditServicioModal = false;
        this.submittingEditServicio = false;
        this.loadServicios();
      },
      error: (err) => {
        console.error('Error al actualizar servicio:', err);
        this.submittingEditServicio = false;
      },
    });
  }

  // ──────────────── Editar Comodato ────────────────

  showEditComodatoModal = false;
  editComodatoId = 0;
  editComodatoForm: any = {};
  submittingEditComodato = false;
  private editComodatoOriginal: ComodatoItem | null = null;

  openEditComodatoModal(com: ComodatoItem): void {
    this.editComodatoOriginal = com;
    this.editComodatoId = com.idComodato;
    this.editComodatoForm = {
      id_paciente: com.idPaciente,
      id_equipo: com.idEquipo,
      fecha_prestamo: com.fechaPrestamo ? com.fechaPrestamo.substring(0, 10) : '',
      fecha_devolucion: com.fechaDevolucion ? com.fechaDevolucion.substring(0, 10) : '',
      estatus: com.estatus,
      monto_total: com.montoTotal,
      monto_pagado: com.montoPagado,
      saldo_pendiente: com.saldoPendiente,
      exento_pago: com.exentoPago,
      notas: com.notas || '',
    };
    this.showEditComodatoModal = true;
  }

  guardarEdicionComodato(): void {
    this.submittingEditComodato = true;
    const payload = { ...this.editComodatoForm };
    if (!payload.fecha_devolucion) payload.fecha_devolucion = null;

    this.api.updateComodato(this.editComodatoId, payload).subscribe({
      next: () => {
        this.showEditComodatoModal = false;
        this.submittingEditComodato = false;
        this.loadComodatos();
      },
      error: (err) => {
        console.error('Error al actualizar comodato:', err);
        this.submittingEditComodato = false;
      },
    });
  }

  // ──────────────── Marcar Devuelto ────────────────

  marcarDevuelto(com: ComodatoItem): void {
    const today = new Date().toISOString().split('T')[0];
    this.api.updateComodato(com.idComodato, {
      id_paciente: com.idPaciente,
      id_equipo: com.idEquipo,
      fecha_prestamo: com.fechaPrestamo,
      fecha_devolucion: today,
      estatus: 'DEVUELTO',
    }).subscribe({
      next: () => this.loadComodatos(),
      error: (err) => console.error('Error al marcar devuelto:', err),
    });
  }
}
