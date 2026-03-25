import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

interface Beneficiario {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: number;
  membresia: string;
  cuota: string;
  fechaRegistro: string;
  iniciales: string;
  color: string;
}

interface Preregistro {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: number;
  cuota: string;
  fechaPreregistro: string;
  iniciales: string;
  color: string;
}

@Component({
  selector: 'app-beneficiarios',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] overflow-hidden">
      <app-navbar />

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
              <div class="w-14 h-14 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl flex items-center justify-center shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="16" y1="11" x2="22" y2="11"/>
                </svg>
              </div>
              <div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">Registro de Beneficiarios</h1>
                <p class="text-slate-600 font-semibold">Gestión completa de beneficiarios y membresías</p>
              </div>
            </div>
            <button class="bg-gradient-to-r from-[#f3ad1c] to-[#ffb84d] text-white shadow-xl font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-2xl transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Nuevo Beneficiario
            </button>
          </div>

          <!-- Search -->
          <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-6">
            <div class="flex items-center gap-4">
              <div class="relative flex-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  [(ngModel)]="searchTerm"
                  (ngModelChange)="filterData()"
                  placeholder="Buscar por nombre, ID o membresía..."
                  class="w-full pl-14 h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
                />
              </div>
              <button class="h-14 border-2 border-slate-200 font-bold px-6 rounded-2xl text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Exportar
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="bg-white border-2 border-slate-200 p-1 rounded-2xl shadow-lg flex">
            <button
              (click)="currentTab = 'activos'"
              [class]="currentTab === 'activos'
                ? 'bg-[#007BFF] text-white rounded-xl font-bold px-6 py-2 transition-all'
                : 'text-slate-600 font-bold px-6 py-2 rounded-xl hover:bg-slate-100 transition-all'"
            >
              Beneficiarios Activos ({{ filteredBeneficiarios.length }})
            </button>
            <button
              (click)="currentTab = 'preregistros'"
              [class]="currentTab === 'preregistros'
                ? 'bg-[#f3ad1c] text-white rounded-xl font-bold px-6 py-2 transition-all'
                : 'text-slate-600 font-bold px-6 py-2 rounded-xl hover:bg-slate-100 transition-all'"
            >
              Aprobación de Preregistro ({{ filteredPreregistros.length }})
            </button>
          </div>

          <!-- Tab Content: Beneficiarios Activos -->
          <div *ngIf="currentTab === 'activos'" class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Edad</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cuota</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membresía</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Registro</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of paginatedBeneficiarios; let i = index" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 text-sm font-semibold text-slate-700">#{{ b.id }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div [class]="b.color + ' w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm'">
                        {{ b.iniciales }}
                      </div>
                      <span class="text-sm font-semibold text-slate-800">{{ b.nombre }} {{ b.apellidoPaterno }} {{ b.apellidoMaterno }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ b.edad }} años</td>
                  <td class="px-6 py-4">
                    <span [class]="getCuotaBadgeClass(b.cuota)">{{ b.cuota }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span [class]="getMembresiaBadgeClass(b.membresia)">{{ b.membresia }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ b.fechaRegistro }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <!-- Eye -->
                      <button class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Ver detalle">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <!-- History -->
                      <button class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Historial">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </button>
                      <!-- CreditCard -->
                      <button class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Pagos">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                          <line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- Footer -->
            <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span class="text-sm text-slate-500 font-medium">
                Mostrando {{ beneficiariosStart + 1 }} a {{ beneficiariosEnd }} de {{ filteredBeneficiarios.length }} beneficiarios
              </span>
              <div class="flex items-center gap-2">
                <button
                  (click)="beneficiariosPage > 1 && changeBeneficiariosPage(beneficiariosPage - 1)"
                  [disabled]="beneficiariosPage <= 1"
                  class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  (click)="beneficiariosPage < beneficiariosTotalPages && changeBeneficiariosPage(beneficiariosPage + 1)"
                  [disabled]="beneficiariosPage >= beneficiariosTotalPages"
                  class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          <!-- Tab Content: Preregistros -->
          <div *ngIf="currentTab === 'preregistros'" class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="bg-amber-50 border-b border-amber-200">
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Edad</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cuota</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Preregistro</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of paginatedPreregistros; let i = index" class="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                  <td class="px-6 py-4 text-sm font-semibold text-slate-700">#{{ p.id }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div [class]="p.color + ' w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm'">
                        {{ p.iniciales }}
                      </div>
                      <span class="text-sm font-semibold text-slate-800">{{ p.nombre }} {{ p.apellidoPaterno }} {{ p.apellidoMaterno }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ p.edad }} años</td>
                  <td class="px-6 py-4">
                    <span [class]="getCuotaBadgeClass(p.cuota)">{{ p.cuota }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ p.fechaPreregistro }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <!-- Eye -->
                      <button class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Ver detalle">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <!-- Aprobar -->
                      <button
                        (click)="aprobarPreregistro(p)"
                        class="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
                      >
                        Aprobar
                      </button>
                      <!-- Rechazar -->
                      <button
                        (click)="rechazarPreregistro(p)"
                        class="px-4 py-2 rounded-lg border-2 border-red-400 text-red-500 text-sm font-bold hover:bg-red-50 transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- Footer -->
            <div class="px-6 py-4 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
              <span class="text-sm text-slate-500 font-medium">
                Mostrando {{ preregistrosStart + 1 }} a {{ preregistrosEnd }} de {{ filteredPreregistros.length }} preregistros
              </span>
              <div class="flex items-center gap-2">
                <button
                  (click)="preregistrosPage > 1 && changePreregistrosPage(preregistrosPage - 1)"
                  [disabled]="preregistrosPage <= 1"
                  class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  (click)="preregistrosPage < preregistrosTotalPages && changePreregistrosPage(preregistrosPage + 1)"
                  [disabled]="preregistrosPage >= preregistrosTotalPages"
                  class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

        </div>

        <app-footer />
      </main>
    </div>
  `
})
export class BeneficiariosComponent {
  currentTab: 'activos' | 'preregistros' = 'activos';
  searchTerm = '';

  // Pagination
  pageSize = 5;
  beneficiariosPage = 1;
  preregistrosPage = 1;

  beneficiarios: Beneficiario[] = [
    { id: 1, nombre: 'María', apellidoPaterno: 'González', apellidoMaterno: 'López', edad: 12, membresia: 'Activa', cuota: 'Cuota A', fechaRegistro: '15/01/2025', iniciales: 'MG', color: 'bg-pink-400' },
    { id: 2, nombre: 'Juan Carlos', apellidoPaterno: 'Martínez', apellidoMaterno: 'Pérez', edad: 8, membresia: 'Activa', cuota: 'Cuota B', fechaRegistro: '22/01/2025', iniciales: 'JM', color: 'bg-blue-400' },
    { id: 3, nombre: 'Ana Patricia', apellidoPaterno: 'Rodríguez', apellidoMaterno: 'Hernández', edad: 15, membresia: 'Vencida', cuota: 'Cuota A', fechaRegistro: '10/12/2024', iniciales: 'AR', color: 'bg-purple-400' }
  ];

  preregistros: Preregistro[] = [
    { id: 101, nombre: 'Roberto', apellidoPaterno: 'Sánchez', apellidoMaterno: 'Cruz', edad: 9, cuota: 'Cuota A', fechaPreregistro: '01/03/2025', iniciales: 'RS', color: 'bg-orange-400' },
    { id: 102, nombre: 'Elena', apellidoPaterno: 'Torres', apellidoMaterno: 'Ramírez', edad: 11, cuota: 'Cuota B', fechaPreregistro: '28/02/2025', iniciales: 'ET', color: 'bg-teal-400' },
    { id: 103, nombre: 'Fernando', apellidoPaterno: 'López', apellidoMaterno: 'García', edad: 7, cuota: 'Cuota A', fechaPreregistro: '25/02/2025', iniciales: 'FL', color: 'bg-indigo-400' }
  ];

  filteredBeneficiarios: Beneficiario[] = [...this.beneficiarios];
  filteredPreregistros: Preregistro[] = [...this.preregistros];

  get beneficiariosStart(): number {
    return (this.beneficiariosPage - 1) * this.pageSize;
  }

  get beneficiariosEnd(): number {
    return Math.min(this.beneficiariosStart + this.pageSize, this.filteredBeneficiarios.length);
  }

  get beneficiariosTotalPages(): number {
    return Math.ceil(this.filteredBeneficiarios.length / this.pageSize) || 1;
  }

  get paginatedBeneficiarios(): Beneficiario[] {
    return this.filteredBeneficiarios.slice(this.beneficiariosStart, this.beneficiariosEnd);
  }

  get preregistrosStart(): number {
    return (this.preregistrosPage - 1) * this.pageSize;
  }

  get preregistrosEnd(): number {
    return Math.min(this.preregistrosStart + this.pageSize, this.filteredPreregistros.length);
  }

  get preregistrosTotalPages(): number {
    return Math.ceil(this.filteredPreregistros.length / this.pageSize) || 1;
  }

  get paginatedPreregistros(): Preregistro[] {
    return this.filteredPreregistros.slice(this.preregistrosStart, this.preregistrosEnd);
  }

  filterData(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredBeneficiarios = this.beneficiarios.filter(b =>
      b.nombre.toLowerCase().includes(term) ||
      b.apellidoPaterno.toLowerCase().includes(term) ||
      b.apellidoMaterno.toLowerCase().includes(term) ||
      b.id.toString().includes(term) ||
      b.membresia.toLowerCase().includes(term) ||
      b.cuota.toLowerCase().includes(term)
    );
    this.filteredPreregistros = this.preregistros.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.apellidoPaterno.toLowerCase().includes(term) ||
      p.apellidoMaterno.toLowerCase().includes(term) ||
      p.id.toString().includes(term) ||
      p.cuota.toLowerCase().includes(term)
    );
    this.beneficiariosPage = 1;
    this.preregistrosPage = 1;
  }

  changeBeneficiariosPage(page: number): void {
    this.beneficiariosPage = page;
  }

  changePreregistrosPage(page: number): void {
    this.preregistrosPage = page;
  }

  getCuotaBadgeClass(cuota: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (cuota === 'Cuota A') return `${base} bg-emerald-100 text-emerald-800`;
    if (cuota === 'Cuota B') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  getMembresiaBadgeClass(membresia: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (membresia === 'Activa') return `${base} bg-green-100 text-green-800`;
    if (membresia === 'Vencida') return `${base} bg-red-100 text-red-800`;
    if (membresia === 'Pendiente') return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  aprobarPreregistro(p: Preregistro): void {
    alert(`Preregistro #${p.id} de ${p.nombre} ${p.apellidoPaterno} ha sido aprobado.`);
    this.preregistros = this.preregistros.filter(item => item.id !== p.id);
    this.filterData();
  }

  rechazarPreregistro(p: Preregistro): void {
    alert(`Preregistro #${p.id} de ${p.nombre} ${p.apellidoPaterno} ha sido rechazado.`);
    this.preregistros = this.preregistros.filter(item => item.id !== p.id);
    this.filterData();
  }
}
