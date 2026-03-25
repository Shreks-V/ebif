import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

interface InventarioItem {
  id: number;
  nombre: string;
  categoria: string;
  stock: number | null;
  stockMinimo: number | null;
  estado: string;
  unidad: string;
  precioA: number;
  precioB: number;
}

interface Comodato {
  id: number;
  folio: string;
  folioBeneficiario: string;
  beneficiario: string;
  equipo: string;
  fechaInicio: string;
  devolucion: string | null;
  estado: string;
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
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Total Items -->
            <div class="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
              <div class="absolute top-4 right-4 w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
              <svg class="w-8 h-8 text-blue-600 mb-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              <p class="text-4xl font-black text-slate-900">{{ inventario.length }}</p>
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

          <!-- TAB: Inventario -->
          <ng-container *ngIf="activeTab === 'inventario'">

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

              <!-- Equipo Comodato -->
              <button
                (click)="toggleCategory('Comodato')"
                [class]="selectedCategory === 'Comodato'
                  ? 'bg-green-50 rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-green-500 text-left transition-all'
                  : 'bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl border-2 border-slate-200 hover:border-green-300 text-left transition-all'"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div [class]="selectedCategory === 'Comodato' ? 'p-3 bg-green-600 rounded-xl shadow-lg' : 'p-3 bg-green-100 rounded-xl'">
                    <svg class="w-6 h-6" [class.text-white]="selectedCategory === 'Comodato'" [class.text-green-600]="selectedCategory !== 'Comodato'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">Equipo Comodato</h3>
                    <p class="text-sm text-slate-600">{{ getCategoryCount('Comodato') }} items</p>
                  </div>
                </div>
                <p class="text-sm font-semibold" [class]="selectedCategory === 'Comodato' ? 'text-green-700' : 'text-slate-500'">
                  {{ selectedCategory === 'Comodato' ? '&#10003; Filtro activo' : 'Ver categor&iacute;a' }}
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
              <button class="px-6 py-3 bg-[#00328b] text-white rounded-xl font-semibold text-sm hover:bg-[#002a75] transition-colors shadow-lg flex items-center gap-2">
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
                            <svg *ngIf="item.categoria === 'Medicamento'" class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                            </svg>
                            <svg *ngIf="item.categoria === 'Servicios'" class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V4"/>
                            </svg>
                            <svg *ngIf="item.categoria === 'Comodato'" class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                          </div>
                          <span class="text-slate-700">{{ item.categoria }}</span>
                        </div>
                      </td>
                      <td class="px-5 py-4 text-slate-800 font-medium">{{ item.nombre }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ item.unidad }}</td>
                      <td class="px-5 py-4 text-slate-800 font-semibold">{{ item.stock !== null ? item.stock : '\u2014' }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ item.stockMinimo !== null ? item.stockMinimo : '\u2014' }}</td>
                      <td class="px-5 py-4">
                        <span class="text-green-700 font-semibold">\${{ item.precioA.toFixed(2) }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <span class="text-blue-700 font-semibold">\${{ item.precioB.toFixed(2) }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <span [ngClass]="getEstadoBadgeClass(item.estado)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                          {{ item.estado }}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-1">
                          <button class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors" title="Editar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path stroke-linecap="round" stroke-linejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-red-600 transition-colors" title="Eliminar">
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
              <button class="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors shadow-lg flex items-center gap-2">
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
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Fecha Inicio</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Devoluci&oacute;n</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Estado</th>
                      <th class="text-left px-5 py-4 font-semibold text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let com of filteredComodatos()" class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td class="px-5 py-4">
                        <span class="font-mono text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded">{{ com.folio }}</span>
                      </td>
                      <td class="px-5 py-4">
                        <div>
                          <p class="text-slate-800 font-medium">{{ com.beneficiario }}</p>
                          <p class="text-xs text-slate-400">{{ com.folioBeneficiario }}</p>
                        </div>
                      </td>
                      <td class="px-5 py-4 text-slate-700">{{ com.equipo }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ com.fechaInicio }}</td>
                      <td class="px-5 py-4 text-slate-600">{{ com.devolucion ?? '\u2014' }}</td>
                      <td class="px-5 py-4">
                        <span [ngClass]="getComodatoEstadoBadgeClass(com.estado)" class="px-2.5 py-1 rounded-full text-xs font-semibold">
                          {{ com.estado }}
                        </span>
                      </td>
                      <td class="px-5 py-4">
                        <button class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 text-xs" title="Imprimir">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8z"/>
                          </svg>
                          Imprimir
                        </button>
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
  `,
})
export class AlmacenComponent {
  activeTab: 'inventario' | 'comodatos' = 'inventario';
  selectedCategory: string | null = null;
  searchInventario = '';
  searchComodatos = '';

  inventario: InventarioItem[] = [
    { id: 1, nombre: 'Acarbixin (amoxicilina) 500/125 mg', categoria: 'Medicamento', stock: 450, stockMinimo: 100, estado: 'Normal', unidad: 'Piezas', precioA: 10.50, precioB: 15.00 },
    { id: 2, nombre: 'Amikacina soluc. iny. 500 mg', categoria: 'Medicamento', stock: 30, stockMinimo: 50, estado: 'Bajo Stock', unidad: 'Piezas', precioA: 25.00, precioB: 35.00 },
    { id: 3, nombre: 'Epamin 100mg c/50', categoria: 'Medicamento', stock: 75, stockMinimo: 20, estado: 'Normal', unidad: 'Piezas', precioA: 45.00, precioB: 60.00 },
    { id: 4, nombre: 'Silla de ruedas aluminio 16"', categoria: 'Comodato', stock: 8, stockMinimo: 5, estado: 'Normal', unidad: 'Pieza', precioA: 50.00, precioB: 75.00 },
    { id: 5, nombre: 'Silla de ruedas infantil rosa 12"', categoria: 'Comodato', stock: 12, stockMinimo: 10, estado: 'Normal', unidad: 'Pieza', precioA: 45.00, precioB: 65.00 },
    { id: 6, nombre: 'Silla de ruedas todo terreno 18"', categoria: 'Comodato', stock: 6, stockMinimo: 5, estado: 'Normal', unidad: 'Pieza', precioA: 100.00, precioB: 140.00 },
    { id: 7, nombre: 'Perfil bioquimico 24 elementos', categoria: 'Servicios', stock: null, stockMinimo: null, estado: 'N/A', unidad: 'Servicio', precioA: 250.00, precioB: 350.00 },
    { id: 8, nombre: 'Perfil de lipidos', categoria: 'Servicios', stock: null, stockMinimo: null, estado: 'N/A', unidad: 'Servicio', precioA: 180.00, precioB: 250.00 },
    { id: 9, nombre: 'Resonancia magnetica', categoria: 'Servicios', stock: null, stockMinimo: null, estado: 'N/A', unidad: 'Servicio', precioA: 800.00, precioB: 1100.00 },
  ];

  comodatos: Comodato[] = [
    { id: 1, folio: 'COM-000001', folioBeneficiario: 'BEN-000156', beneficiario: 'Carlos Rodriguez', equipo: 'Silla de ruedas aluminio 16"', fechaInicio: '2026-02-15', devolucion: null, estado: 'Activo' },
    { id: 2, folio: 'COM-000002', folioBeneficiario: 'BEN-000089', beneficiario: 'Ana Martinez Torres', equipo: 'Silla de ruedas infantil rosa 12"', fechaInicio: '2026-01-20', devolucion: '2026-03-01', estado: 'Devuelto' },
    { id: 3, folio: 'COM-000003', folioBeneficiario: 'BEN-000234', beneficiario: 'Juan Perez Martinez', equipo: 'Muletas ajustables', fechaInicio: '2026-02-28', devolucion: null, estado: 'Devolucion Pendiente' },
    { id: 4, folio: 'COM-000004', folioBeneficiario: 'BEN-000123', beneficiario: 'Maria Garcia Lopez', equipo: 'Andadera plegable', fechaInicio: '2025-12-10', devolucion: null, estado: 'Entregado Final' },
  ];

  getBajoStockCount(): number {
    return this.inventario.filter(i => i.estado === 'Bajo Stock').length;
  }

  getComodatosActivosCount(): number {
    return this.comodatos.filter(c => c.estado === 'Activo').length;
  }

  getCategoryCount(categoria: string): number {
    return this.inventario.filter(i => i.categoria === categoria).length;
  }

  toggleCategory(categoria: string): void {
    this.selectedCategory = this.selectedCategory === categoria ? null : categoria;
  }

  filteredInventario(): InventarioItem[] {
    let items = this.inventario;
    if (this.selectedCategory) {
      items = items.filter(i => i.categoria === this.selectedCategory);
    }
    if (this.searchInventario.trim()) {
      const q = this.searchInventario.toLowerCase();
      items = items.filter(i => i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q));
    }
    return items;
  }

  filteredComodatos(): Comodato[] {
    if (!this.searchComodatos.trim()) return this.comodatos;
    const q = this.searchComodatos.toLowerCase();
    return this.comodatos.filter(c =>
      c.beneficiario.toLowerCase().includes(q) ||
      c.folio.toLowerCase().includes(q) ||
      c.equipo.toLowerCase().includes(q)
    );
  }

  getCategoryIconBg(categoria: string): string {
    switch (categoria) {
      case 'Medicamento': return 'bg-blue-100';
      case 'Servicios': return 'bg-purple-100';
      case 'Comodato': return 'bg-green-100';
      default: return 'bg-slate-100';
    }
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Normal': return 'bg-green-100 text-green-700';
      case 'Bajo Stock': return 'bg-amber-100 text-amber-700';
      case 'Agotado': return 'bg-red-100 text-red-700';
      case 'N/A': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  getComodatoEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'Activo': return 'bg-green-100 text-green-700';
      case 'Devuelto': return 'bg-slate-100 text-slate-600';
      case 'Devolucion Pendiente': return 'bg-amber-100 text-amber-700';
      case 'Entregado Final': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  }
}
