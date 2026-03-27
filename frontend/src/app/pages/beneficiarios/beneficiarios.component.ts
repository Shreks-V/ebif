import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface Beneficiario {
  idPaciente: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  genero: string;
  fechaNacimiento: string;
  curp: string;
  nombrePadreMadre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefonoCasa: string;
  telefonoCelular: string;
  correoElectronico: string;
  enEmergenciaAvisarA: string;
  telefonoEmergencia: string;
  municipioNacimiento: string;
  estadoNacimiento: string;
  hospitalNacimiento: string;
  tipoSangre: string;
  usaValvula: string;
  notasAdicionales: string;
  fechaAlta: string;
  membresiaEstatus: string;
  tipoCuota: string;
  activo: string;
  tiposEspina: {idTipoEspina: number, nombre: string}[];
  // UI helpers
  iniciales: string;
  color: string;
}

interface Preregistro {
  id: number;
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  curp: string;
  nombrePadreMadre: string;
  tipoCuota: string;
  fechaSolicitud: string;
  estatus: string;
  // UI helpers
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
                <p class="text-slate-600 font-semibold">Gestion completa de beneficiarios y membresias</p>
              </div>
            </div>
            <button (click)="openNuevoModal()" class="bg-gradient-to-r from-[#f3ad1c] to-[#ffb84d] text-white shadow-xl font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-2xl transition-all">
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
                  placeholder="Buscar por nombre, folio, CURP o membresia..."
                  class="w-full pl-14 h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#007BFF] focus:ring-2 focus:ring-[#007BFF]/20 transition-all"
                />
              </div>
              <button (click)="exportarCSV()" class="h-14 border-2 border-slate-200 font-bold px-6 rounded-2xl text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-2 transition-all">
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
              Aprobacion de Preregistro ({{ filteredPreregistros.length }})
            </button>
          </div>

          <!-- Tab Content: Beneficiarios Activos -->
          <div *ngIf="currentTab === 'activos'" class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 overflow-hidden">
            <table class="w-full">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Espina</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cuota</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membresia</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Alta</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of paginatedBeneficiarios; let i = index" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 text-sm font-semibold text-slate-700">{{ b.folio }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div [class]="b.color + ' w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm'">
                        {{ b.iniciales }}
                      </div>
                      <span class="text-sm font-semibold text-slate-800">{{ b.nombre }} {{ b.apellidoPaterno }} {{ b.apellidoMaterno }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ $any(b.tiposEspina[0])?.nombre || 'N/A' }}</td>
                  <td class="px-6 py-4">
                    <span [class]="getCuotaBadgeClass(b.tipoCuota)">Cuota {{ b.tipoCuota }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span [class]="getMembresiaBadgeClass(b.membresiaEstatus)">{{ b.membresiaEstatus }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ b.fechaAlta }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <!-- Eye -->
                      <button (click)="verDetalleBeneficiario(b)" class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Ver detalle">
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
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estatus</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cuota</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Solicitud</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of paginatedPreregistros; let i = index" class="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                  <td class="px-6 py-4 text-sm font-semibold text-slate-700">{{ p.id }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div [class]="p.color + ' w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm'">
                        {{ p.iniciales }}
                      </div>
                      <span class="text-sm font-semibold text-slate-800">{{ p.nombre }} {{ p.apellidoPaterno }} {{ p.apellidoMaterno }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ p.estatus }}</td>
                  <td class="px-6 py-4">
                    <span [class]="getCuotaBadgeClass(p.tipoCuota)">Cuota {{ p.tipoCuota }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ p.fechaSolicitud }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <!-- Eye -->
                      <button (click)="verDetallePreregistro(p)" class="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Ver detalle">
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

    <!-- ==================== MODAL: Nuevo Beneficiario ==================== -->
    <div *ngIf="showNuevoModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeNuevoModal()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-black text-slate-900">Nuevo Beneficiario</h2>
          <button (click)="closeNuevoModal()" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="submitNuevoBeneficiario()">
          <!-- Datos personales -->
          <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Datos Personales</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
              <input type="text" [(ngModel)]="formData.nombre" name="nombre" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Paterno *</label>
              <input type="text" [(ngModel)]="formData.apellido_paterno" name="apellido_paterno" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Apellido Materno</label>
              <input type="text" [(ngModel)]="formData.apellido_materno" name="apellido_materno" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Genero *</label>
              <select [(ngModel)]="formData.genero" name="genero" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha de Nacimiento *</label>
              <input type="date" [(ngModel)]="formData.fecha_nacimiento" name="fecha_nacimiento" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">CURP *</label>
              <input type="text" [(ngModel)]="formData.curp" name="curp" required maxlength="18" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all uppercase" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-slate-700 mb-1">Nombre del Padre/Madre</label>
              <input type="text" [(ngModel)]="formData.nombre_padre_madre" name="nombre_padre_madre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
          </div>

          <!-- Direccion -->
          <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Direccion</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-slate-700 mb-1">Direccion</label>
              <input type="text" [(ngModel)]="formData.direccion" name="direccion" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Colonia</label>
              <input type="text" [(ngModel)]="formData.colonia" name="colonia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Ciudad</label>
              <input type="text" [(ngModel)]="formData.ciudad" name="ciudad" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Estado</label>
              <select [(ngModel)]="formData.estado" name="estado" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                <option value="">Seleccionar</option>
                <option *ngFor="let e of estadosMexicanos" [value]="e">{{ e }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Codigo Postal</label>
              <input type="text" [(ngModel)]="formData.codigo_postal" name="codigo_postal" maxlength="5" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
          </div>

          <!-- Contacto -->
          <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Contacto</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Casa</label>
              <input type="tel" [(ngModel)]="formData.telefono_casa" name="telefono_casa" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Celular</label>
              <input type="tel" [(ngModel)]="formData.telefono_celular" name="telefono_celular" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-semibold text-slate-700 mb-1">Correo Electronico</label>
              <input type="email" [(ngModel)]="formData.correo_electronico" name="correo_electronico" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">En emergencia avisar a</label>
              <input type="text" [(ngModel)]="formData.en_emergencia_avisar_a" name="en_emergencia_avisar_a" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Telefono Emergencia</label>
              <input type="tel" [(ngModel)]="formData.telefono_emergencia" name="telefono_emergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all" />
            </div>
          </div>

          <!-- Medico -->
          <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Informacion Medica</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Sangre</label>
              <select [(ngModel)]="formData.tipo_sangre" name="tipo_sangre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                <option value="">Seleccionar</option>
                <option *ngFor="let ts of tiposSangre" [value]="ts">{{ ts }}</option>
              </select>
            </div>
            <div class="flex items-center gap-3 pt-7">
              <input type="checkbox" [(ngModel)]="formDataUsaValvula" name="usa_valvula" id="usa_valvula" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]" />
              <label for="usa_valvula" class="text-sm font-semibold text-slate-700">Usa Valvula</label>
            </div>
          </div>

          <!-- Membresia -->
          <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3">Membresia</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Tipo de Cuota *</label>
              <select [(ngModel)]="formData.tipo_cuota" name="tipo_cuota" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                <option value="">Seleccionar</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1">Estatus de Membresia *</label>
              <select [(ngModel)]="formData.membresia_estatus" name="membresia_estatus" required class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 outline-none transition-all">
                <option value="">Seleccionar</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="VENCIDO">VENCIDO</option>
                <option value="SUSPENDIDO">SUSPENDIDO</option>
              </select>
            </div>
          </div>

          <!-- Error message -->
          <div *ngIf="nuevoError" class="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-semibold">
            {{ nuevoError }}
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end gap-3">
            <button type="button" (click)="closeNuevoModal()" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button type="submit" [disabled]="submittingNuevo" class="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[#00328b] to-[#0052cc] text-white hover:shadow-lg transition-all disabled:opacity-50">
              {{ submittingNuevo ? 'Guardando...' : 'Guardar Beneficiario' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== MODAL: Detalle Beneficiario ==================== -->
    <div *ngIf="showDetalleModal && beneficiarioSeleccionado" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeDetalleModal()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div [class]="beneficiarioSeleccionado.color + ' w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg'">
              {{ beneficiarioSeleccionado.iniciales }}
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-900">{{ beneficiarioSeleccionado.nombre }} {{ beneficiarioSeleccionado.apellidoPaterno }} {{ beneficiarioSeleccionado.apellidoMaterno }}</h2>
              <p class="text-slate-500 font-semibold">Folio: {{ beneficiarioSeleccionado.folio }}</p>
            </div>
          </div>
          <button (click)="closeDetalleModal()" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Badges -->
        <div class="flex items-center gap-3 mb-6">
          <span [class]="getMembresiaBadgeClass(beneficiarioSeleccionado.membresiaEstatus)">{{ beneficiarioSeleccionado.membresiaEstatus }}</span>
          <span [class]="getCuotaBadgeClass(beneficiarioSeleccionado.tipoCuota)">Cuota {{ beneficiarioSeleccionado.tipoCuota }}</span>
        </div>

        <!-- Personal -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Datos Personales</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div><span class="text-xs font-bold text-slate-400 uppercase">Genero</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.genero || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Fecha Nacimiento</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.fechaNacimiento || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">CURP</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.curp || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Padre/Madre</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.nombrePadreMadre || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Fecha Alta</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.fechaAlta || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Tipo Espina</span><p class="text-sm font-semibold text-slate-800">{{ $any(beneficiarioSeleccionado.tiposEspina[0])?.nombre || 'N/A' }}</p></div>
        </div>

        <!-- Direccion -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Direccion</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Direccion</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.direccion || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Colonia</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.colonia || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Ciudad</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.ciudad || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Estado</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.estado || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Codigo Postal</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.codigoPostal || '-' }}</p></div>
        </div>

        <!-- Contacto -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Contacto</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div><span class="text-xs font-bold text-slate-400 uppercase">Telefono Casa</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.telefonoCasa || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Telefono Celular</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.telefonoCelular || '-' }}</p></div>
          <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Correo Electronico</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.correoElectronico || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">En emergencia avisar a</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.enEmergenciaAvisarA || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Telefono Emergencia</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.telefonoEmergencia || '-' }}</p></div>
        </div>

        <!-- Medico -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Informacion Medica</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div><span class="text-xs font-bold text-slate-400 uppercase">Tipo de Sangre</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.tipoSangre || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Usa Valvula</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.usaValvula === 'S' ? 'Si' : 'No' }}</p></div>
          <div class="md:col-span-2"><span class="text-xs font-bold text-slate-400 uppercase">Notas Adicionales</span><p class="text-sm font-semibold text-slate-800">{{ beneficiarioSeleccionado.notasAdicionales || '-' }}</p></div>
        </div>

        <!-- Close -->
        <div class="flex justify-end">
          <button (click)="closeDetalleModal()" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL: Detalle Preregistro ==================== -->
    <div *ngIf="showDetallePreregistroModal && preregistroSeleccionado" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeDetallePreregistroModal()">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-4">
            <div [class]="preregistroSeleccionado.color + ' w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg'">
              {{ preregistroSeleccionado.iniciales }}
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-900">{{ preregistroSeleccionado.nombre }} {{ preregistroSeleccionado.apellidoPaterno }} {{ preregistroSeleccionado.apellidoMaterno }}</h2>
              <p class="text-slate-500 font-semibold">Pre-registro #{{ preregistroSeleccionado.id }}</p>
            </div>
          </div>
          <button (click)="closeDetallePreregistroModal()" class="w-10 h-10 rounded-xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Badges -->
        <div class="flex items-center gap-3 mb-6">
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{{ preregistroSeleccionado.estatus }}</span>
          <span [class]="getCuotaBadgeClass(preregistroSeleccionado.tipoCuota)">Cuota {{ preregistroSeleccionado.tipoCuota }}</span>
        </div>

        <!-- Personal -->
        <h3 class="text-sm font-bold text-[#00328b] uppercase tracking-wider mb-3 border-b-2 border-slate-100 pb-2">Datos Personales</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-6">
          <div><span class="text-xs font-bold text-slate-400 uppercase">Nombre</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.nombre }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Apellido Paterno</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.apellidoPaterno }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Apellido Materno</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.apellidoMaterno || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Fecha Nacimiento</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.fechaNacimiento || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">CURP</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.curp || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Padre/Madre</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.nombrePadreMadre || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Fecha Solicitud</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.fechaSolicitud || '-' }}</p></div>
          <div><span class="text-xs font-bold text-slate-400 uppercase">Folio</span><p class="text-sm font-semibold text-slate-800">{{ preregistroSeleccionado.folio || '-' }}</p></div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3">
          <button (click)="closeDetallePreregistroModal()" class="px-6 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
            Cerrar
          </button>
          <button (click)="closeDetallePreregistroModal(); aprobarPreregistro(preregistroSeleccionado)" class="px-6 py-3 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
            Aprobar
          </button>
          <button (click)="closeDetallePreregistroModal(); rechazarPreregistro(preregistroSeleccionado)" class="px-6 py-3 rounded-xl font-bold border-2 border-red-400 text-red-500 hover:bg-red-50 transition-all">
            Rechazar
          </button>
        </div>
      </div>
    </div>
  `
})
export class BeneficiariosComponent implements OnInit {
  currentTab: 'activos' | 'preregistros' = 'activos';
  searchTerm = '';

  // Pagination
  pageSize = 5;
  beneficiariosPage = 1;
  preregistrosPage = 1;

  // Modal state
  showNuevoModal = false;
  showDetalleModal = false;
  showDetallePreregistroModal = false;
  beneficiarioSeleccionado: Beneficiario | null = null;
  preregistroSeleccionado: Preregistro | null = null;
  submittingNuevo = false;
  nuevoError = '';
  formDataUsaValvula = false;

  // Form data for new beneficiario
  formData: any = {};

  // Select options
  estadosMexicanos = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de Mexico', 'Coahuila', 'Colima', 'Durango',
    'Estado de Mexico', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
    'Michoacan', 'Morelos', 'Nayarit', 'Nuevo Leon', 'Oaxaca',
    'Puebla', 'Queretaro', 'Quintana Roo', 'San Luis Potosi', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
    'Yucatan', 'Zacatecas'
  ];

  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  private avatarColors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400',
    'bg-rose-400', 'bg-indigo-400', 'bg-orange-400', 'bg-teal-400',
    'bg-cyan-400', 'bg-amber-400'
  ];

  beneficiarios: Beneficiario[] = [];
  preregistros: Preregistro[] = [];
  filteredBeneficiarios: Beneficiario[] = [];
  filteredPreregistros: Preregistro[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadBeneficiarios();
    this.loadPreregistros();
    this.resetFormData();
  }

  private resetFormData(): void {
    this.formData = {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      genero: '',
      fecha_nacimiento: '',
      curp: '',
      nombre_padre_madre: '',
      direccion: '',
      colonia: '',
      ciudad: '',
      estado: '',
      codigo_postal: '',
      telefono_casa: '',
      telefono_celular: '',
      correo_electronico: '',
      en_emergencia_avisar_a: '',
      telefono_emergencia: '',
      tipo_sangre: '',
      usa_valvula: 'N',
      tipo_cuota: '',
      membresia_estatus: ''
    };
    this.formDataUsaValvula = false;
  }

  private loadBeneficiarios(): void {
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiarios = data.map((item: any, index: number) => ({
          idPaciente: item.id_paciente,
          folio: item.folio,
          nombre: item.nombre,
          apellidoPaterno: item.apellido_paterno,
          apellidoMaterno: item.apellido_materno,
          genero: item.genero,
          fechaNacimiento: item.fecha_nacimiento,
          curp: item.curp,
          nombrePadreMadre: item.nombre_padre_madre,
          direccion: item.direccion,
          colonia: item.colonia,
          ciudad: item.ciudad,
          estado: item.estado,
          codigoPostal: item.codigo_postal,
          telefonoCasa: item.telefono_casa,
          telefonoCelular: item.telefono_celular,
          correoElectronico: item.correo_electronico,
          enEmergenciaAvisarA: item.en_emergencia_avisar_a,
          telefonoEmergencia: item.telefono_emergencia,
          municipioNacimiento: item.municipio_nacimiento,
          estadoNacimiento: item.estado_nacimiento,
          hospitalNacimiento: item.hospital_nacimiento,
          tipoSangre: item.tipo_sangre,
          usaValvula: item.usa_valvula,
          notasAdicionales: item.notas_adicionales,
          fechaAlta: item.fecha_alta,
          membresiaEstatus: item.membresia_estatus,
          tipoCuota: item.tipo_cuota,
          activo: item.activo,
          tiposEspina: (item.tipos_espina || []).map((te: any) => ({
            idTipoEspina: te.id_tipo_espina,
            nombre: te.nombre
          })),
          iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
          color: this.avatarColors[index % this.avatarColors.length]
        } as Beneficiario));
        this.filterData();
      },
      error: (err) => {
        console.error('Error loading beneficiarios:', err);
      }
    });
  }

  private loadPreregistros(): void {
    this.api.getPreRegistros().subscribe({
      next: (data) => {
        this.preregistros = data.map((item: any, index: number) => ({
          id: item.id_paciente,
          folio: item.folio,
          nombre: item.nombre,
          apellidoPaterno: item.apellido_paterno,
          apellidoMaterno: item.apellido_materno || '',
          fechaNacimiento: item.fecha_nacimiento,
          curp: item.curp,
          nombrePadreMadre: item.nombre_padre_madre,
          tipoCuota: item.tipo_cuota || '',
          fechaSolicitud: item.fecha_registro,
          estatus: item.estatus_registro,
          iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
          color: this.avatarColors[index % this.avatarColors.length]
        } as Preregistro));
        this.filterData();
      },
      error: (err) => {
        console.error('Error loading preregistros:', err);
      }
    });
  }

  // ──────────── Modal: Nuevo Beneficiario ────────────

  openNuevoModal(): void {
    this.resetFormData();
    this.nuevoError = '';
    this.showNuevoModal = true;
  }

  closeNuevoModal(): void {
    this.showNuevoModal = false;
  }

  submitNuevoBeneficiario(): void {
    if (!this.formData.nombre || !this.formData.apellido_paterno || !this.formData.genero ||
        !this.formData.fecha_nacimiento || !this.formData.curp || !this.formData.tipo_cuota ||
        !this.formData.membresia_estatus) {
      this.nuevoError = 'Por favor completa todos los campos obligatorios marcados con *.';
      return;
    }

    this.submittingNuevo = true;
    this.nuevoError = '';

    const payload = { ...this.formData };
    payload.usa_valvula = this.formDataUsaValvula ? 'S' : 'N';

    this.api.createBeneficiario(payload).subscribe({
      next: () => {
        this.submittingNuevo = false;
        this.showNuevoModal = false;
        this.loadBeneficiarios();
      },
      error: (err) => {
        this.submittingNuevo = false;
        this.nuevoError = err?.error?.detail || 'Error al crear el beneficiario. Intenta de nuevo.';
        console.error('Error creating beneficiario:', err);
      }
    });
  }

  // ──────────── Modal: Detalle Beneficiario ────────────

  verDetalleBeneficiario(b: Beneficiario): void {
    this.beneficiarioSeleccionado = b;
    this.showDetalleModal = true;
  }

  closeDetalleModal(): void {
    this.showDetalleModal = false;
    this.beneficiarioSeleccionado = null;
  }

  // ──────────── Modal: Detalle Preregistro ────────────

  verDetallePreregistro(p: Preregistro): void {
    this.preregistroSeleccionado = p;
    this.showDetallePreregistroModal = true;
  }

  closeDetallePreregistroModal(): void {
    this.showDetallePreregistroModal = false;
    this.preregistroSeleccionado = null;
  }

  // ──────────── Exportar CSV ────────────

  exportarCSV(): void {
    const headers = ['Folio', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'CURP', 'Genero', 'Ciudad', 'Estado', 'Membresia', 'Cuota'];
    const rows = this.filteredBeneficiarios.map(b => [
      b.folio,
      b.nombre,
      b.apellidoPaterno,
      b.apellidoMaterno,
      b.curp,
      b.genero,
      b.ciudad,
      b.estado,
      b.membresiaEstatus,
      b.tipoCuota
    ]);

    const escapeCsv = (val: string) => {
      if (!val) return '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => escapeCsv(cell || '')).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'beneficiarios_' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ──────────── Pagination ────────────

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
      b.folio.toLowerCase().includes(term) ||
      b.curp.toLowerCase().includes(term) ||
      b.membresiaEstatus.toLowerCase().includes(term) ||
      b.tipoCuota.toLowerCase().includes(term)
    );
    this.filteredPreregistros = this.preregistros.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      p.apellidoPaterno.toLowerCase().includes(term) ||
      p.apellidoMaterno.toLowerCase().includes(term) ||
      p.id.toString().includes(term) ||
      p.curp.toLowerCase().includes(term) ||
      p.tipoCuota.toLowerCase().includes(term)
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
    if (cuota === 'A') return `${base} bg-emerald-100 text-emerald-800`;
    if (cuota === 'B') return `${base} bg-blue-100 text-blue-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  getMembresiaBadgeClass(membresia: string): string {
    const base = 'px-3 py-1 rounded-full text-xs font-bold';
    if (membresia === 'ACTIVO') return `${base} bg-green-100 text-green-800`;
    if (membresia === 'VENCIDO') return `${base} bg-red-100 text-red-800`;
    if (membresia === 'SUSPENDIDO') return `${base} bg-amber-100 text-amber-800`;
    return `${base} bg-slate-100 text-slate-800`;
  }

  aprobarPreregistro(p: Preregistro): void {
    this.api.aprobarPreRegistro(p.id).subscribe({
      next: () => {
        this.preregistros = this.preregistros.filter(item => item.id !== p.id);
        this.filterData();
        this.loadBeneficiarios();
      },
      error: (err) => console.error('Error al aprobar:', err)
    });
  }

  rechazarPreregistro(p: Preregistro): void {
    this.api.rechazarPreRegistro(p.id).subscribe({
      next: () => {
        this.preregistros = this.preregistros.filter(item => item.id !== p.id);
        this.filterData();
      },
      error: (err) => console.error('Error al rechazar:', err)
    });
  }
}
