import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] overflow-hidden">
      <app-navbar></app-navbar>

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

          <!-- Header -->
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-black text-slate-900 tracking-tight">Hoja de Nuevos - Agenda de Citas</h1>
              <p class="text-slate-600 font-semibold">Programaci&oacute;n y gesti&oacute;n de citas m&eacute;dicas</p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-2 border-b border-slate-200">
            <button
              (click)="activeTab = 'citas'"
              class="px-4 py-2 text-sm font-semibold transition-colors"
              [ngClass]="activeTab === 'citas' ? 'text-[#00328b] border-b-2 border-[#00328b]' : 'text-slate-600 hover:text-slate-800'"
            >
              Agenda de Citas
            </button>
            <button
              (click)="activeTab = 'medicos'"
              class="px-4 py-2 text-sm font-semibold transition-colors"
              [ngClass]="activeTab === 'medicos' ? 'text-[#00328b] border-b-2 border-[#00328b]' : 'text-slate-600 hover:text-slate-800'"
            >
              M&eacute;dicos
            </button>
          </div>

          <!-- Tab: Agenda de Citas -->
          <div *ngIf="activeTab === 'citas'" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <!-- Card Header -->
            <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 class="text-lg font-bold text-slate-900 tracking-wide">CITAS</h2>
              <button (click)="abrirNuevaCita()" class="px-4 py-2 bg-[#00328b] text-white text-sm font-semibold rounded-lg hover:bg-[#002a75] transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/>
                  <line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                Nueva Cita
              </button>
            </div>

            <!-- Search + Filters -->
            <div class="px-6 py-4 space-y-4">
              <!-- Search -->
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre de paciente..."
                  [(ngModel)]="searchCitas"
                  (input)="filtrarCitas()"
                  class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00328b]/20 focus:border-[#00328b] transition-all"
                />
              </div>

              <!-- Date filter + Estado filters -->
              <div class="flex items-center gap-4 flex-wrap">
                <div class="flex items-center gap-2">
                  <label class="text-xs font-semibold text-slate-500">Fecha:</label>
                  <input
                    type="date"
                    [(ngModel)]="filtroFecha"
                    (change)="filtrarCitas()"
                    class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00328b]/20 focus:border-[#00328b] transition-all"
                  />
                  <button *ngIf="filtroFecha" (click)="filtroFecha = ''; filtrarCitas()" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Limpiar fecha">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    *ngFor="let estado of estadoFilters"
                    (click)="filtroEstado = estado; filtrarCitas()"
                    class="px-4 py-2 text-xs font-semibold rounded-lg transition-all"
                    [ngClass]="filtroEstado === estado ? 'bg-[#00328b] text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                  >
                    {{ estado }}
                  </button>
                </div>
              </div>

              <!-- Tipo consulta filters -->
              <div class="flex flex-wrap gap-2">
                <button
                  *ngFor="let tipo of tipoFilters"
                  (click)="filtroTipo = tipo; filtrarCitas()"
                  class="px-4 py-2 text-xs font-semibold rounded-lg transition-all"
                  [ngClass]="filtroTipo === tipo ? 'bg-[#f3ad1c] text-slate-900 shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
                >
                  {{ tipo }}
                </button>
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-t border-slate-200 bg-slate-50">
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <div class="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                          <line x1="16" x2="16" y1="2" y2="6"/>
                          <line x1="8" x2="8" y1="2" y2="6"/>
                          <line x1="3" x2="21" y1="10" y2="10"/>
                        </svg>
                        Fecha / Hora
                      </div>
                    </th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Paciente</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Consulta</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let cita of citasFiltradas" class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4 font-medium text-slate-900">
                      <div>{{ getFecha(cita.fechaHora) }}</div>
                      <div class="text-xs text-slate-500">{{ getHora(cita.fechaHora) }}</div>
                    </td>
                    <td class="px-6 py-4 text-slate-700">{{ cita.nombrePaciente }}</td>
                    <td class="px-6 py-4 text-slate-700">{{ cita.servicios[0]?.nombre || 'N/A' }}</td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        [ngClass]="getEstadoBadgeClass(cita.estatus)"
                      >
                        {{ cita.estatus }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <button (click)="verDetalleCita(cita)" class="p-1.5 text-slate-400 hover:text-[#00328b] hover:bg-slate-100 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="citasFiltradas.length === 0">
                    <td colspan="5" class="px-6 py-12 text-center text-slate-400 text-sm">
                      No se encontraron citas con los filtros seleccionados.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab: Medicos -->
          <div *ngIf="activeTab === 'medicos'" class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <!-- Card Header -->
            <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 class="text-lg font-bold text-slate-900 tracking-wide">M&Eacute;DICOS</h2>
              <button (click)="abrirNuevoMedico()" class="px-4 py-2 bg-[#00328b] text-white text-sm font-semibold rounded-lg hover:bg-[#002a75] transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/>
                  <line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                Agregar M&eacute;dico
              </button>
            </div>

            <!-- Search -->
            <div class="px-6 py-4">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar m&eacute;dico por nombre o especialidad..."
                  [(ngModel)]="searchMedicos"
                  (input)="filtrarMedicos()"
                  class="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00328b]/20 focus:border-[#00328b] transition-all"
                />
              </div>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-t border-slate-200 bg-slate-50">
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Especialidad</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Servicios</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th class="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let medico of medicosFiltrados" class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00328b] to-[#0052cc] flex items-center justify-center text-white text-xs font-bold">
                          {{ medico.iniciales }}
                        </div>
                        <span class="font-medium text-slate-900">Dr(a). {{ medico.nombre }} {{ medico.apellidoPaterno }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        {{ medico.especialidad }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-col gap-0.5">
                        <span class="text-slate-700 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          {{ medico.telefono }}
                        </span>
                        <span class="text-slate-500 text-xs flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2"/>
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                          </svg>
                          {{ medico.correo }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex flex-wrap gap-1">
                        <span
                          *ngFor="let servicio of medico.servicios"
                          class="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded border border-amber-200"
                        >
                          {{ servicio.nombre }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                        [ngClass]="medico.activo === 'S' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'"
                      >
                        {{ medico.activo === 'S' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <button (click)="verDetalleMedico(medico)" class="p-1.5 text-slate-400 hover:text-[#00328b] hover:bg-slate-100 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="medicosFiltrados.length === 0">
                    <td colspan="6" class="px-6 py-12 text-center text-slate-400 text-sm">
                      No se encontraron m&eacute;dicos con la b&uacute;squeda actual.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      <app-footer></app-footer>
    </div>

    <!-- ==================== MODAL: Nueva Cita ==================== -->
    <div *ngIf="showNuevaCitaModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showNuevaCitaModal = false">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-black text-slate-900">Nueva Cita</h2>
          <button (click)="showNuevaCitaModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="guardarCita()" class="space-y-5">
          <!-- Paciente -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Paciente</label>
            <input
              type="text"
              placeholder="Buscar paciente por folio o nombre..."
              [(ngModel)]="busquedaPaciente"
              (input)="filtrarBeneficiarios()"
              (focus)="showPacienteDropdown = true"
              name="busquedaPaciente"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"
              autocomplete="off"
            />
            <div *ngIf="showPacienteDropdown && beneficiariosFiltrados.length > 0" class="mt-1 border border-slate-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto z-10 relative">
              <button
                type="button"
                *ngFor="let b of beneficiariosFiltrados"
                (click)="seleccionarPaciente(b)"
                class="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 transition-colors border-b border-slate-100 last:border-b-0"
              >
                {{ b.folio }} - {{ b.nombre_completo }}
              </button>
            </div>
            <p *ngIf="nuevaCita.id_paciente" class="mt-1 text-xs text-emerald-600 font-semibold">Paciente seleccionado: {{ busquedaPaciente }}</p>
          </div>

          <!-- Fecha y Hora -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Fecha y Hora</label>
            <input
              type="datetime-local"
              [(ngModel)]="nuevaCitaFechaHora"
              name="fechaHora"
              required
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"
            />
          </div>

          <!-- Estatus -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estatus</label>
            <select
              [(ngModel)]="nuevaCita.estatus"
              name="estatus"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors"
            >
              <option value="PROGRAMADA">PROGRAMADA</option>
              <option value="EN_CURSO">EN_CURSO</option>
              <option value="COMPLETADA">COMPLETADA</option>
              <option value="CANCELADA">CANCELADA</option>
            </select>
          </div>

          <!-- Notas -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Notas</label>
            <textarea
              [(ngModel)]="nuevaCita.notas"
              name="notas"
              rows="3"
              placeholder="Notas adicionales..."
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors resize-none"
            ></textarea>
          </div>

          <!-- Servicios -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-semibold text-slate-700">Servicios</label>
              <button type="button" (click)="agregarServicioCita()" class="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                Agregar
              </button>
            </div>
            <div *ngFor="let srv of nuevaCita.servicios; let i = index" class="flex items-center gap-3 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div class="flex-1">
                <select
                  [(ngModel)]="srv.id_servicio"
                  [name]="'servicio_' + i"
                  class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"
                >
                  <option [ngValue]="null" disabled>Seleccionar servicio...</option>
                  <option *ngFor="let s of serviciosList" [ngValue]="s.id_servicio">{{ s.nombre }}</option>
                </select>
              </div>
              <div class="w-20">
                <input
                  type="number"
                  [(ngModel)]="srv.cantidad"
                  [name]="'cantidad_' + i"
                  min="1"
                  placeholder="Cant."
                  class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"
                />
              </div>
              <div class="w-28">
                <input
                  type="number"
                  [(ngModel)]="srv.monto_pagado"
                  [name]="'monto_' + i"
                  min="0"
                  step="0.01"
                  placeholder="Monto"
                  class="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-[#00328b] focus:outline-none text-sm transition-colors"
                />
              </div>
              <button type="button" (click)="quitarServicioCita(i)" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p *ngIf="nuevaCita.servicios.length === 0" class="text-xs text-slate-400 italic">No se han agregado servicios.</p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" (click)="showNuevaCitaModal = false" class="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" [disabled]="guardandoCita" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50">
              {{ guardandoCita ? 'Guardando...' : 'Guardar Cita' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== MODAL: Nuevo Medico ==================== -->
    <div *ngIf="showNuevoMedicoModal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showNuevoMedicoModal = false">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-black text-slate-900">Agregar M&eacute;dico</h2>
          <button (click)="showNuevoMedicoModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form (ngSubmit)="guardarMedico()" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Nombre -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Nombre</label>
              <input type="text" [(ngModel)]="nuevoMedico.nombre" name="nombre" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Nombre"/>
            </div>
            <!-- Apellido Paterno -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Paterno</label>
              <input type="text" [(ngModel)]="nuevoMedico.apellido_paterno" name="apellidoPaterno" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Apellido Paterno"/>
            </div>
            <!-- Apellido Materno -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Apellido Materno</label>
              <input type="text" [(ngModel)]="nuevoMedico.apellido_materno" name="apellidoMaterno"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Apellido Materno"/>
            </div>
            <!-- Especialidad -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Especialidad</label>
              <input type="text" [(ngModel)]="nuevoMedico.especialidad" name="especialidad" required
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Especialidad"/>
            </div>
            <!-- Telefono -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Tel&eacute;fono</label>
              <input type="text" [(ngModel)]="nuevoMedico.telefono" name="telefono"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="Tel&eacute;fono"/>
            </div>
            <!-- Correo -->
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-1.5">Correo</label>
              <input type="email" [(ngModel)]="nuevoMedico.correo" name="correo"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors" placeholder="correo@ejemplo.com"/>
            </div>
          </div>

          <!-- Activo -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estado</label>
            <select [(ngModel)]="nuevoMedico.activo" name="activo"
              class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none transition-colors">
              <option value="S">Activo</option>
              <option value="N">Inactivo</option>
            </select>
          </div>

          <!-- Servicios (checkboxes) -->
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Servicios</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label *ngFor="let s of serviciosList" class="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-white transition-colors">
                <input
                  type="checkbox"
                  [checked]="medicoServiciosSeleccionados.includes(s.id_servicio)"
                  (change)="toggleServicioMedico(s.id_servicio)"
                  class="w-4 h-4 rounded border-slate-300 text-[#00328b] focus:ring-[#00328b]"
                />
                <span class="text-sm text-slate-700">{{ s.nombre }}</span>
              </label>
              <p *ngIf="serviciosList.length === 0" class="text-xs text-slate-400 italic col-span-2">Cargando servicios...</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" (click)="showNuevoMedicoModal = false" class="px-6 py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" [disabled]="guardandoMedico" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors disabled:opacity-50">
              {{ guardandoMedico ? 'Guardando...' : 'Guardar M&eacute;dico' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================== MODAL: Detalle Cita ==================== -->
    <div *ngIf="showDetalleCitaModal && citaSeleccionada" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showDetalleCitaModal = false">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-black text-slate-900">Detalle de Cita</h2>
          <button (click)="showDetalleCitaModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="space-y-5">
          <!-- Paciente info -->
          <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#00328b] to-[#0052cc] flex items-center justify-center text-white text-sm font-bold">
              {{ citaSeleccionada.nombrePaciente?.charAt(0) || '?' }}
            </div>
            <div>
              <p class="font-bold text-slate-900">{{ citaSeleccionada.nombrePaciente }}</p>
              <p class="text-sm text-slate-500">Folio: {{ citaSeleccionada.folioPaciente }}</p>
            </div>
          </div>

          <!-- Fecha y Estado -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Fecha y Hora</p>
              <p class="font-bold text-slate-900">{{ formatFechaHora(citaSeleccionada.fechaHora) }}</p>
            </div>
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estatus</p>
              <span
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                [ngClass]="getEstadoBadgeClass(citaSeleccionada.estatus)"
              >
                {{ citaSeleccionada.estatus }}
              </span>
            </div>
          </div>

          <!-- Notas -->
          <div *ngIf="citaSeleccionada.notas" class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas</p>
            <p class="text-sm text-slate-700">{{ citaSeleccionada.notas }}</p>
          </div>

          <!-- Servicios -->
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Servicios</p>
            <div *ngIf="citaSeleccionada.servicios.length > 0" class="space-y-2">
              <div *ngFor="let srv of citaSeleccionada.servicios" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p class="font-semibold text-slate-900 text-sm">{{ srv.nombre }}</p>
                  <p class="text-xs text-slate-500">Cantidad: {{ srv.cantidad }}</p>
                </div>
                <span class="text-sm font-bold text-emerald-600">\${{ srv.montoPagado | number:'1.2-2' }}</span>
              </div>
            </div>
            <p *ngIf="citaSeleccionada.servicios.length === 0" class="text-sm text-slate-400 italic">Sin servicios registrados.</p>
          </div>

          <!-- Close -->
          <div class="flex justify-end pt-4 border-t border-slate-200">
            <button (click)="showDetalleCitaModal = false" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL: Detalle Medico ==================== -->
    <div *ngIf="showDetalleMedicoModal && medicoSeleccionado" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showDetalleMedicoModal = false">
      <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-black text-slate-900">Detalle del M&eacute;dico</h2>
          <button (click)="showDetalleMedicoModal = false" class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="space-y-5">
          <!-- Doctor info -->
          <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-[#00328b] to-[#0052cc] flex items-center justify-center text-white text-lg font-bold">
              {{ medicoSeleccionado.iniciales }}
            </div>
            <div>
              <p class="text-lg font-bold text-slate-900">Dr(a). {{ medicoSeleccionado.nombre }} {{ medicoSeleccionado.apellidoPaterno }} {{ medicoSeleccionado.apellidoMaterno }}</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                {{ medicoSeleccionado.especialidad }}
              </span>
            </div>
          </div>

          <!-- Contacto -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Tel&eacute;fono</p>
              <p class="font-semibold text-slate-900">{{ medicoSeleccionado.telefono || 'N/A' }}</p>
            </div>
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Correo</p>
              <p class="font-semibold text-slate-900 text-sm break-all">{{ medicoSeleccionado.correo || 'N/A' }}</p>
            </div>
          </div>

          <!-- Estado -->
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado</p>
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
              [ngClass]="medicoSeleccionado.activo === 'S' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'"
            >
              {{ medicoSeleccionado.activo === 'S' ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <!-- Servicios -->
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Servicios Asociados</p>
            <div *ngIf="medicoSeleccionado.servicios.length > 0" class="flex flex-wrap gap-2">
              <span
                *ngFor="let srv of medicoSeleccionado.servicios"
                class="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-lg border border-amber-200"
              >
                {{ srv.nombre }}
              </span>
            </div>
            <p *ngIf="medicoSeleccionado.servicios.length === 0" class="text-sm text-slate-400 italic">Sin servicios asociados.</p>
          </div>

          <!-- Close -->
          <div class="flex justify-end pt-4 border-t border-slate-200">
            <button (click)="showDetalleMedicoModal = false" class="px-6 py-3 text-sm font-semibold text-white bg-[#00328b] rounded-xl hover:bg-[#002a75] transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CitasComponent implements OnInit {
  activeTab: 'citas' | 'medicos' = 'citas';

  searchCitas = '';
  searchMedicos = '';
  filtroEstado = 'Todas';
  filtroTipo = 'Todas';
  filtroFecha = '';

  estadoFilters = ['Todas', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'];
  tipoFilters = ['Todas', 'Consulta Neurocirugía', 'Consulta Ortopédica', 'Consulta Urológica', 'Fisioterapia', 'Terapia Ocupacional'];

  citas: any[] = [];
  citasFiltradas: any[] = [];
  medicos: any[] = [];
  medicosFiltrados: any[] = [];

  // Modal visibility
  showNuevaCitaModal = false;
  showNuevoMedicoModal = false;
  showDetalleCitaModal = false;
  showDetalleMedicoModal = false;

  // Detail selections
  citaSeleccionada: any = null;
  medicoSeleccionado: any = null;

  // Servicios list (loaded once on init)
  serviciosList: any[] = [];

  // Beneficiarios for patient search
  beneficiariosList: any[] = [];
  beneficiariosFiltrados: any[] = [];
  busquedaPaciente = '';
  showPacienteDropdown = false;

  // Nueva Cita form
  nuevaCita: any = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
  nuevaCitaFechaHora = '';
  guardandoCita = false;

  // Nuevo Medico form
  nuevoMedico: any = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
  medicoServiciosSeleccionados: number[] = [];
  guardandoMedico = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarCitas();
    this.cargarDoctores();

    // Load servicios once on init
    this.api.getServicios().subscribe({
      next: (data) => {
        this.serviciosList = data;
      },
      error: (err) => console.error('Error al cargar servicios:', err),
    });
  }

  cargarCitas(): void {
    this.api.getCitas().subscribe({
      next: (data) => {
        this.citas = data.map((c: any) => ({
          idCita: c.id_cita,
          idPaciente: c.id_paciente,
          nombrePaciente: c.nombre_paciente,
          folioPaciente: c.folio_paciente,
          fechaHora: c.fecha_hora,
          estatus: c.estatus,
          notas: c.notas,
          servicios: (c.servicios || []).map((s: any) => ({
            idServicio: s.id_servicio,
            nombre: s.nombre,
            cantidad: s.cantidad,
            montoPagado: s.monto_pagado,
          })),
        }));
        this.citasFiltradas = [...this.citas];
      },
      error: (err) => console.error('Error al cargar citas:', err),
    });
  }

  cargarDoctores(): void {
    this.api.getDoctores().subscribe({
      next: (data) => {
        this.medicos = data.map((d: any) => ({
          idDoctor: d.id_doctor,
          nombre: d.nombre,
          apellidoPaterno: d.apellido_paterno,
          apellidoMaterno: d.apellido_materno,
          especialidad: d.especialidad,
          telefono: d.telefono,
          correo: d.correo,
          activo: d.activo,
          servicios: (d.servicios || []).map((s: any) => ({
            idServicio: s.id_servicio,
            nombre: s.nombre,
          })),
          iniciales: (d.nombre?.charAt(0) || '') + (d.apellido_paterno?.charAt(0) || ''),
        }));
        this.medicosFiltrados = [...this.medicos];
      },
      error: (err) => console.error('Error al cargar médicos:', err),
    });
  }

  getHora(fechaHora: string): string {
    return fechaHora.split('T')[1]?.substring(0, 5) || '';
  }

  getFecha(fechaHora: string): string {
    if (!fechaHora) return '';
    const d = new Date(fechaHora);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatFechaHora(fechaHora: string): string {
    if (!fechaHora) return '';
    const date = new Date(fechaHora);
    return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getEstadoBadgeClass(estatus: string): string {
    switch (estatus) {
      case 'COMPLETADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'EN_CURSO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROGRAMADA': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CANCELADA': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  filtrarCitas(): void {
    let resultado = [...this.citas];

    if (this.searchCitas) {
      const busqueda = this.searchCitas.toLowerCase();
      resultado = resultado.filter(c =>
        c.nombrePaciente.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroFecha) {
      resultado = resultado.filter(c => {
        const citaDate = c.fechaHora?.split('T')[0];
        return citaDate === this.filtroFecha;
      });
    }

    if (this.filtroEstado !== 'Todas') {
      resultado = resultado.filter(c => c.estatus === this.filtroEstado);
    }

    if (this.filtroTipo !== 'Todas') {
      resultado = resultado.filter(c =>
        c.servicios.some((s: any) => s.nombre === this.filtroTipo)
      );
    }

    this.citasFiltradas = resultado;
  }

  filtrarMedicos(): void {
    if (!this.searchMedicos) {
      this.medicosFiltrados = [...this.medicos];
      return;
    }
    const busqueda = this.searchMedicos.toLowerCase();
    this.medicosFiltrados = this.medicos.filter(m =>
      m.nombre.toLowerCase().includes(busqueda) ||
      m.apellidoPaterno.toLowerCase().includes(busqueda) ||
      m.especialidad.toLowerCase().includes(busqueda)
    );
  }

  // ──────────────── Nueva Cita ────────────────

  abrirNuevaCita(): void {
    this.nuevaCita = { id_paciente: null, estatus: 'PROGRAMADA', notas: '', servicios: [] };
    this.nuevaCitaFechaHora = '';
    this.busquedaPaciente = '';
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
    this.showNuevaCitaModal = true;

    // Load beneficiarios on modal open
    this.api.getBeneficiarios().subscribe({
      next: (data) => {
        this.beneficiariosList = data.map((b: any) => ({
          id_paciente: b.id_paciente,
          folio: b.folio,
          nombre_completo: `${b.nombre || ''} ${b.apellido_paterno || ''} ${b.apellido_materno || ''}`.trim(),
        }));
      },
      error: (err) => console.error('Error al cargar beneficiarios:', err),
    });
  }

  filtrarBeneficiarios(): void {
    this.showPacienteDropdown = true;
    if (!this.busquedaPaciente) {
      this.beneficiariosFiltrados = [];
      this.nuevaCita.id_paciente = null;
      return;
    }
    const term = this.busquedaPaciente.toLowerCase();
    this.beneficiariosFiltrados = this.beneficiariosList.filter(b =>
      b.folio?.toLowerCase().includes(term) || b.nombre_completo.toLowerCase().includes(term)
    ).slice(0, 10);
  }

  seleccionarPaciente(b: any): void {
    this.nuevaCita.id_paciente = b.id_paciente;
    this.busquedaPaciente = `${b.folio} - ${b.nombre_completo}`;
    this.showPacienteDropdown = false;
    this.beneficiariosFiltrados = [];
  }

  agregarServicioCita(): void {
    this.nuevaCita.servicios.push({ id_servicio: null, cantidad: 1, monto_pagado: 0 });
  }

  quitarServicioCita(index: number): void {
    this.nuevaCita.servicios.splice(index, 1);
  }

  guardarCita(): void {
    if (!this.nuevaCita.id_paciente || !this.nuevaCitaFechaHora) return;

    this.guardandoCita = true;
    const payload = {
      id_paciente: this.nuevaCita.id_paciente,
      fecha_hora: this.nuevaCitaFechaHora.length === 16 ? this.nuevaCitaFechaHora + ':00' : this.nuevaCitaFechaHora,
      estatus: this.nuevaCita.estatus,
      notas: this.nuevaCita.notas,
      servicios: this.nuevaCita.servicios
        .filter((s: any) => s.id_servicio !== null)
        .map((s: any) => ({
          id_servicio: s.id_servicio,
          cantidad: s.cantidad,
          monto_pagado: s.monto_pagado,
        })),
    };

    this.api.createCita(payload).subscribe({
      next: () => {
        this.showNuevaCitaModal = false;
        this.guardandoCita = false;
        this.cargarCitas();
      },
      error: (err) => {
        console.error('Error al crear cita:', err);
        this.guardandoCita = false;
      },
    });
  }

  // ──────────────── Nuevo Medico ────────────────

  abrirNuevoMedico(): void {
    this.nuevoMedico = { nombre: '', apellido_paterno: '', apellido_materno: '', especialidad: '', telefono: '', correo: '', activo: 'S' };
    this.medicoServiciosSeleccionados = [];
    this.showNuevoMedicoModal = true;
  }

  toggleServicioMedico(idServicio: number): void {
    const idx = this.medicoServiciosSeleccionados.indexOf(idServicio);
    if (idx >= 0) {
      this.medicoServiciosSeleccionados.splice(idx, 1);
    } else {
      this.medicoServiciosSeleccionados.push(idServicio);
    }
  }

  guardarMedico(): void {
    if (!this.nuevoMedico.nombre || !this.nuevoMedico.apellido_paterno) return;

    this.guardandoMedico = true;
    const payload = {
      nombre: this.nuevoMedico.nombre,
      apellido_paterno: this.nuevoMedico.apellido_paterno,
      apellido_materno: this.nuevoMedico.apellido_materno,
      especialidad: this.nuevoMedico.especialidad,
      telefono: this.nuevoMedico.telefono,
      correo: this.nuevoMedico.correo,
      activo: this.nuevoMedico.activo,
      servicios: [...this.medicoServiciosSeleccionados],
    };

    this.api.createDoctor(payload).subscribe({
      next: () => {
        this.showNuevoMedicoModal = false;
        this.guardandoMedico = false;
        this.cargarDoctores();
      },
      error: (err) => {
        console.error('Error al crear médico:', err);
        this.guardandoMedico = false;
      },
    });
  }

  // ──────────────── Detalle Cita ────────────────

  verDetalleCita(cita: any): void {
    this.citaSeleccionada = cita;
    this.showDetalleCitaModal = true;
  }

  // ──────────────── Detalle Medico ────────────────

  verDetalleMedico(medico: any): void {
    this.medicoSeleccionado = medico;
    this.showDetalleMedicoModal = true;
  }
}
