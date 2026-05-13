import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface CrossTabRow {
  etapa: string;
  total?: number;
  [key: string]: string | number | undefined;
}

interface CrossTab {
  titulo: string;
  cols: string[];
  rows: CrossTabRow[];
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff]">
      <app-navbar></app-navbar>

      <main class="flex-1">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

          <!-- Header -->
          <div class="flex items-center gap-4">
            <div class="bg-[#00328b] p-3 rounded-xl shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-slate-800">Reportes e Indicadores</h1>
              <p class="text-slate-500 text-sm mt-1">Reportes de periodo e indicadores de desempeño</p>
            </div>
          </div>

          <!-- ══════════════════════════════════════ -->
          <!-- SECTION 1: RESUMEN DE PERIODO          -->
          <!-- ══════════════════════════════════════ -->
          <div class="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
            <!-- Section header -->
            <div class="bg-gradient-to-r from-[#00328b] to-[#0052cc] px-6 py-4 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
              </svg>
              <div>
                <h2 class="text-xl font-bold text-white">Resumen de Periodo</h2>
                <p class="text-blue-200 text-xs">Estadísticas de servicios y beneficiarios en el rango de fechas</p>
              </div>
            </div>

            <div class="p-6">
              <!-- Date range + query button -->
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha inicio</label>
                  <input type="date" [(ngModel)]="sec1FechaInicio"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha fin</label>
                  <input type="date" [(ngModel)]="sec1FechaFin"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all">
                </div>
                <button (click)="cargarResumenPeriodo()" [disabled]="sec1Loading"
                  class="px-5 py-2 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  {{ sec1Loading ? 'Cargando...' : 'Consultar' }}
                </button>
                @if (sec1Loaded) {
                  <button (click)="exportarPDFResumen()" class="px-4 py-2 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    PDF
                  </button>
                  <button (click)="exportarExcelResumen()" class="px-4 py-2 border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Excel
                  </button>
                }
              </div>

              @if (sec1Error) {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ sec1Error }}</div>
              }

              @if (sec1Loading) {
                <div class="flex items-center justify-center py-16 text-slate-400 text-sm gap-3">
                  <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Cargando datos del periodo...
                </div>
              }

              @if (!sec1Loading && sec1Loaded) {
                <!-- ─── Resumen de servicios ─── -->
                <div class="mb-6">
                  <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <div class="w-1 h-4 bg-[#00328b] rounded-full"></div>
                    Resumen de Servicios
                  </h3>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                      <p class="text-2xl font-black text-[#00328b]">{{ sec1Credenciales }}</p>
                      <p class="text-xs font-semibold text-slate-600 mt-1">Credenciales activas</p>
                    </div>
                    <div class="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
                      <p class="text-2xl font-black text-emerald-700">{{ sec1TotalServicios }}</p>
                      <p class="text-xs font-semibold text-slate-600 mt-1">Cantidad de servicios</p>
                    </div>
                    <div class="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
                      <p class="text-2xl font-black text-amber-700">{{ sec1Exentos }}</p>
                      <p class="text-xs font-semibold text-slate-600 mt-1">Exentos</p>
                    </div>
                    <div class="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-center">
                      <p class="text-2xl font-black text-purple-700">{{ sec1Cuotas }}</p>
                      <p class="text-xs font-semibold text-slate-600 mt-1">Cuota de recuperación</p>
                    </div>
                  </div>
                </div>

                <!-- ─── Beneficiarios activos ─── -->
                <div class="mb-6">
                  <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    Beneficiarios Activos
                  </h3>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">H</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Hombres }}</p>
                        <p class="text-xs text-slate-500">Hombres</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-xs">M</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Mujeres }}</p>
                        <p class="text-xs text-slate-500">Mujeres</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">NL</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Nl }}</p>
                        <p class="text-xs text-slate-500">Urbano (N.L.)</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs">Fo</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Foraneos }}</p>
                        <p class="text-xs text-slate-500">Rural (foráneos)</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-[10px] text-center leading-tight">0-5</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Lactantes }}</p>
                        <p class="text-xs text-slate-500">Lactantes (0-5)</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-[10px] text-center leading-tight">6-11</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Ninos }}</p>
                        <p class="text-xs text-slate-500">Niños (6-11)</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-[10px] text-center leading-tight">12-17</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Adolescentes }}</p>
                        <p class="text-xs text-slate-500">Adolescentes (12-17)</p>
                      </div>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-[10px] text-center leading-tight">18+</div>
                      <div>
                        <p class="text-xl font-black text-slate-900">{{ sec1Adultos }}</p>
                        <p class="text-xs text-slate-500">Adultos (18+)</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ─── Servicios del periodo ─── -->
                @if (sec1ServiciosList.length > 0) {
                  <div class="mb-6">
                    <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-amber-400 rounded-full"></div>
                      Servicios y Productos del Periodo
                    </h3>
                    <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                      <table class="w-full">
                        <thead class="bg-slate-50 border-b-2 border-slate-200">
                          <tr>
                            <th class="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Servicio / Producto</th>
                            <th class="text-right px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (s of sec1ServiciosList; track s; let i = $index) {
                            <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors" [class.bg-white]="i % 2 === 0" [class.bg-slate-50]="i % 2 === 1">
                              <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ s.nombre }}</td>
                              <td class="px-4 py-2.5 text-sm text-slate-700 text-right font-mono font-bold">{{ s.cantidad }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

                <!-- ─── Ciudades + Estudios side by side ─── -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Ciudades -->
                  <div>
                    <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-sky-500 rounded-full"></div>
                      Ciudades
                    </h3>
                    @if (sec1CiudadesList.length > 0) {
                      <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                        <table class="w-full">
                          <thead class="bg-slate-50 border-b-2 border-slate-200">
                            <tr>
                              <th class="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Ciudad</th>
                              <th class="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Estado</th>
                              <th class="text-right px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Beneficiarios</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (c of sec1CiudadesList; track c) {
                              <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td class="px-4 py-2 text-sm text-slate-800">{{ c.nombre }}</td>
                                <td class="px-4 py-2 text-xs text-slate-500">{{ c.estado }}</td>
                                <td class="px-4 py-2 text-sm text-right font-mono font-bold text-slate-700">{{ c.cantidad }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    } @else {
                      <p class="text-sm text-slate-400 italic py-4">Sin datos de ciudades.</p>
                    }
                  </div>

                  <!-- Estudios -->
                  <div>
                    <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-violet-500 rounded-full"></div>
                      Estudios
                    </h3>
                    @if (sec1EstudiosList.length > 0) {
                      <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                        <table class="w-full">
                          <thead class="bg-slate-50 border-b-2 border-slate-200">
                            <tr>
                              <th class="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Estudio</th>
                              <th class="text-right px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (e of sec1EstudiosList; track e) {
                              <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td class="px-4 py-2 text-sm text-slate-800">{{ e.nombre }}</td>
                                <td class="px-4 py-2 text-sm text-right font-mono font-bold text-slate-700">{{ e.cantidad }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    } @else {
                      <p class="text-sm text-slate-400 italic py-4">Sin datos de estudios en el periodo.</p>
                    }
                  </div>
                </div>
              }

              @if (!sec1Loading && !sec1Loaded && !sec1Error) {
                <div class="text-center py-12 text-slate-400">
                  <svg class="mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                  <p class="text-sm font-medium">Selecciona un rango de fechas y presiona <strong>Consultar</strong></p>
                </div>
              }
            </div>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- SECTION 2: INDICADORES DE DESEMPEÑO       -->
          <!-- ══════════════════════════════════════════ -->
          <div class="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
            <!-- Section header -->
            <div class="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
              </svg>
              <div>
                <h2 class="text-xl font-bold text-white">Indicadores de Desempeño</h2>
                <p class="text-slate-400 text-xs">Cruces estadísticos por etapa de vida y categoría</p>
              </div>
            </div>

            <div class="p-6">
              <!-- Period selector -->
              <div class="mb-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Seleccionar periodo</p>
                <div class="flex gap-2">
                  @for (p of indicPeriodos; track p.id) {
                    <button (click)="setIndicPeriod(p.id)"
                      class="px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer"
                      [ngClass]="{
                        'bg-slate-800 text-white border-slate-800 shadow': indicPeriodo === p.id,
                        'bg-white text-slate-600 border-slate-300 hover:border-slate-500': indicPeriodo !== p.id
                      }">
                      {{ p.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Date inputs (editable) -->
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha inicio</label>
                  <input type="date" [(ngModel)]="indicFechaInicio" (change)="indicPeriodo = 'personalizado'"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha fin</label>
                  <input type="date" [(ngModel)]="indicFechaFin" (change)="indicPeriodo = 'personalizado'"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all">
                </div>
                <button (click)="cargarIndicadores()" [disabled]="indicLoading"
                  class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  {{ indicLoading ? 'Cargando...' : 'Consultar' }}
                </button>
              </div>

              @if (indicError) {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ indicError }}</div>
              }

              @if (indicLoading) {
                <div class="flex items-center justify-center py-16 text-slate-400 text-sm gap-3">
                  <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Cargando indicadores...
                </div>
              }

              @if (!indicLoading && indicLoaded) {
                <!-- Top stats row -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div class="bg-[#00328b]/5 border-2 border-[#00328b]/20 rounded-xl p-4 text-center">
                    <p class="text-3xl font-black text-[#00328b]">{{ indicActivos }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Beneficiarios activos</p>
                  </div>
                  <div class="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
                    <p class="text-3xl font-black text-emerald-700">{{ indicNuevos }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Nuevos en el periodo</p>
                  </div>
                  <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                    <p class="text-3xl font-black text-blue-700">{{ indicHombres }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Hombres</p>
                  </div>
                  <div class="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 text-center">
                    <p class="text-3xl font-black text-pink-700">{{ indicMujeres }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Mujeres</p>
                  </div>
                </div>

                <!-- Municipios -->
                @if (indicMunicipios.length > 0) {
                  <div class="mb-6">
                    <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-sky-500 rounded-full"></div>
                      Municipios de Monterrey
                    </h3>
                    <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                      <table class="w-full">
                        <thead class="bg-slate-50 border-b-2 border-slate-200">
                          <tr>
                            <th class="text-left px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Municipio / Ciudad</th>
                            <th class="text-right px-4 py-2.5 text-xs font-bold text-slate-600 uppercase">Beneficiarios</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (m of indicMunicipios; track m; let last = $last) {
                            <tr class="border-b border-slate-100 transition-colors"
                              [class.hover:bg-slate-50]="!last"
                              [class.bg-slate-100]="last"
                              [class.font-bold]="last">
                              <td class="px-4 py-2.5 text-sm text-slate-800">{{ m.label }}</td>
                              <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ m.value }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

                <!-- 6 Cross-tab tables (2-column grid) -->
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  @for (tabla of indicTables; track tabla.titulo) {
                    <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                      <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3">
                        <h4 class="text-sm font-bold text-slate-700">{{ tabla.titulo }}</h4>
                      </div>
                      <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                          <thead class="bg-[#00328b] text-white">
                            <tr>
                              <th class="text-left px-3 py-2 text-xs font-bold">Etapa de vida</th>
                              @for (col of tabla.cols; track col) {
                                <th class="text-right px-3 py-2 text-xs font-bold">{{ col }}</th>
                              }
                              <th class="text-right px-3 py-2 text-xs font-bold bg-[#001f5b]">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of tabla.rows; track row; let last = $last; let i = $index) {
                              <tr [class.bg-slate-800]="last"
                                  [class.text-white]="last"
                                  [class.bg-white]="!last && i % 2 === 0"
                                  [class.bg-slate-50]="!last && i % 2 === 1"
                                  class="border-b border-slate-100 transition-colors">
                                <td class="px-3 py-2 text-xs font-semibold">{{ row['etapa'] }}</td>
                                @for (col of tabla.cols; track col) {
                                  <td class="px-3 py-2 text-xs text-right font-mono">{{ row[col] ?? 0 }}</td>
                                }
                                <td class="px-3 py-2 text-xs text-right font-mono font-bold" [class.bg-slate-700]="last" [class.bg-slate-100]="!last">{{ row['total'] ?? 0 }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>
                  }
                </div>
              }

              @if (!indicLoading && !indicLoaded && !indicError) {
                <div class="text-center py-12 text-slate-400">
                  <svg class="mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
                  </svg>
                  <p class="text-sm font-medium">Selecciona un periodo y presiona <strong>Consultar</strong></p>
                </div>
              }
            </div>
          </div>

          <!-- ══════════════════════════════════════════════ -->
          <!-- SECTION 3: SEGMENTACIÓN DEMOGRÁFICA            -->
          <!-- ══════════════════════════════════════════════ -->
          <div class="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
            <div class="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <div>
                <h2 class="text-xl font-bold text-white">Segmentación Demográfica</h2>
                <p class="text-emerald-100 text-xs">Distribución de beneficiarios por género, etapa de vida, tipo de espina y procedencia</p>
              </div>
            </div>

            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha inicio</label>
                  <input type="date" [(ngModel)]="seg3FechaInicio"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Fecha fin</label>
                  <input type="date" [(ngModel)]="seg3FechaFin"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100 transition-all">
                </div>
                <button (click)="cargarSegmentacion()" [disabled]="seg3Loading"
                  class="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  {{ seg3Loading ? 'Cargando...' : 'Consultar' }}
                </button>
              </div>

              @if (seg3Error) {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ seg3Error }}</div>
              }

              @if (seg3Loading) {
                <div class="flex items-center justify-center py-16 text-slate-400 text-sm gap-3">
                  <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Cargando segmentación...
                </div>
              }

              @if (!seg3Loading && seg3Loaded) {
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">

                  <!-- Género -->
                  <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                    <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-blue-500 rounded-full"></div>
                      <h4 class="text-sm font-bold text-slate-700">Por Género</h4>
                    </div>
                    <table class="w-full">
                      <thead class="bg-blue-600 text-white">
                        <tr>
                          <th class="text-left px-4 py-2.5 text-xs font-bold">Género</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">Beneficiarios</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (r of seg3Genero; track r.label; let i = $index) {
                          <tr class="border-b border-slate-100" [class.bg-white]="i%2===0" [class.bg-slate-50]="i%2===1">
                            <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ r.label }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ r.value }}</td>
                            <td class="px-4 py-2.5 text-sm text-right text-slate-500">{{ seg3Total(seg3Genero) > 0 ? ((r.value / seg3Total(seg3Genero)) * 100 | number:'1.1-1') + '%' : '—' }}</td>
                          </tr>
                        }
                        <tr class="bg-blue-50 border-t-2 border-blue-200">
                          <td class="px-4 py-2.5 text-sm font-black text-blue-800">Total</td>
                          <td class="px-4 py-2.5 text-sm text-right font-black text-blue-800 font-mono">{{ seg3Total(seg3Genero) }}</td>
                          <td class="px-4 py-2.5 text-sm text-right font-bold text-blue-600">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Tipo de espina bífida -->
                  <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                    <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-purple-500 rounded-full"></div>
                      <h4 class="text-sm font-bold text-slate-700">Por Tipo de Espina Bífida</h4>
                    </div>
                    <table class="w-full">
                      <thead class="bg-purple-700 text-white">
                        <tr>
                          <th class="text-left px-4 py-2.5 text-xs font-bold">Tipo</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">Beneficiarios</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (r of seg3TipoEspina; track r.label; let i = $index) {
                          <tr class="border-b border-slate-100" [class.bg-white]="i%2===0" [class.bg-slate-50]="i%2===1">
                            <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ r.label }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ r.value }}</td>
                            <td class="px-4 py-2.5 text-sm text-right text-slate-500">{{ seg3Total(seg3TipoEspina) > 0 ? ((r.value / seg3Total(seg3TipoEspina)) * 100 | number:'1.1-1') + '%' : '—' }}</td>
                          </tr>
                        }
                        @if (seg3TipoEspina.length === 0) {
                          <tr><td colspan="3" class="px-4 py-8 text-center text-sm text-slate-400 italic">Sin datos</td></tr>
                        }
                        @if (seg3TipoEspina.length > 0) {
                          <tr class="bg-purple-50 border-t-2 border-purple-200">
                            <td class="px-4 py-2.5 text-sm font-black text-purple-800">Total</td>
                            <td class="px-4 py-2.5 text-sm text-right font-black text-purple-800 font-mono">{{ seg3Total(seg3TipoEspina) }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-bold text-purple-600">100%</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Etapa de vida -->
                  <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                    <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-amber-500 rounded-full"></div>
                      <h4 class="text-sm font-bold text-slate-700">Por Etapa de Vida</h4>
                    </div>
                    <table class="w-full">
                      <thead class="bg-amber-600 text-white">
                        <tr>
                          <th class="text-left px-4 py-2.5 text-xs font-bold">Etapa</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">Beneficiarios</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (r of seg3EtapaVida; track r.label; let i = $index) {
                          <tr class="border-b border-slate-100" [class.bg-white]="i%2===0" [class.bg-slate-50]="i%2===1">
                            <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ r.label }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ r.value }}</td>
                            <td class="px-4 py-2.5 text-sm text-right text-slate-500">{{ seg3Total(seg3EtapaVida) > 0 ? ((r.value / seg3Total(seg3EtapaVida)) * 100 | number:'1.1-1') + '%' : '—' }}</td>
                          </tr>
                        }
                        <tr class="bg-amber-50 border-t-2 border-amber-200">
                          <td class="px-4 py-2.5 text-sm font-black text-amber-800">Total</td>
                          <td class="px-4 py-2.5 text-sm text-right font-black text-amber-800 font-mono">{{ seg3Total(seg3EtapaVida) }}</td>
                          <td class="px-4 py-2.5 text-sm text-right font-bold text-amber-600">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Por estado / procedencia -->
                  <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                    <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-sky-500 rounded-full"></div>
                      <h4 class="text-sm font-bold text-slate-700">Por Estado / Procedencia</h4>
                    </div>
                    <table class="w-full">
                      <thead class="bg-sky-600 text-white">
                        <tr>
                          <th class="text-left px-4 py-2.5 text-xs font-bold">Estado</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">Beneficiarios</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (r of seg3Estado; track r.label; let i = $index) {
                          <tr class="border-b border-slate-100" [class.bg-white]="i%2===0" [class.bg-slate-50]="i%2===1">
                            <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ r.label }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ r.value }}</td>
                            <td class="px-4 py-2.5 text-sm text-right text-slate-500">{{ seg3Total(seg3Estado) > 0 ? ((r.value / seg3Total(seg3Estado)) * 100 | number:'1.1-1') + '%' : '—' }}</td>
                          </tr>
                        }
                        @if (seg3Estado.length > 0) {
                          <tr class="bg-sky-50 border-t-2 border-sky-200">
                            <td class="px-4 py-2.5 text-sm font-black text-sky-800">Total</td>
                            <td class="px-4 py-2.5 text-sm text-right font-black text-sky-800 font-mono">{{ seg3Total(seg3Estado) }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-bold text-sky-600">100%</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                </div>
              }

              @if (!seg3Loading && !seg3Loaded && !seg3Error) {
                <div class="text-center py-12 text-slate-400">
                  <svg class="mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  <p class="text-sm font-medium">Selecciona un rango de fechas y presiona <strong>Consultar</strong></p>
                </div>
              }
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════ -->
          <!-- SECTION 4: REPORTE CONSOLIDADO MENSUAL             -->
          <!-- ══════════════════════════════════════════════════ -->
          <div class="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
            <div class="bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-4 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                <path d="m9 16 2 2 4-4"/>
              </svg>
              <div>
                <h2 class="text-xl font-bold text-white">Reporte Consolidado Mensual</h2>
                <p class="text-amber-100 text-xs">Resumen mensual para fundaciones donantes (RF-ER-07)</p>
              </div>
            </div>

            <div class="p-6">
              <div class="flex flex-wrap items-end gap-4 mb-6">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Mes</label>
                  <select [(ngModel)]="consol4Mes"
                    class="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all">
                    @for (m of consol4Meses; track m.value) {
                      <option [value]="m.value">{{ m.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Año</label>
                  <input type="number" [(ngModel)]="consol4Anio" min="2020" [max]="currentYear"
                    class="w-24 px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100 transition-all">
                </div>
                <button (click)="cargarConsolidadoMensual()" [disabled]="consol4Loading"
                  class="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                  </svg>
                  {{ consol4Loading ? 'Generando...' : 'Generar Reporte' }}
                </button>
                @if (consol4Loaded && consol4Data) {
                  <button (click)="exportarConsolidadoExcel()"
                    class="px-4 py-2 border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Excel
                  </button>
                }
              </div>

              @if (consol4Error) {
                <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{{ consol4Error }}</div>
              }

              @if (consol4Loading) {
                <div class="flex items-center justify-center py-16 text-slate-400 text-sm gap-3">
                  <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Generando reporte consolidado...
                </div>
              }

              @if (!consol4Loading && consol4Loaded && consol4Data) {
                <div class="mb-2 text-xs text-slate-400 italic">
                  Periodo: <strong>{{ consol4NombreMes(consol4Data.mes) }} {{ consol4Data.anio }}</strong>
                  &nbsp;·&nbsp; Generado: {{ consol4Data.fecha_generacion | date:'dd/MM/yyyy HH:mm' }}
                </div>

                <!-- KPI cards -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  <div class="bg-[#00328b]/5 border-2 border-[#00328b]/20 rounded-xl p-4 text-center">
                    <p class="text-2xl font-black text-[#00328b]">{{ consol4Data.pacientes_atendidos }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Pacientes atendidos</p>
                  </div>
                  <div class="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 text-center">
                    <p class="text-2xl font-black text-emerald-700">{{ consol4Data.total_servicios }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Total servicios</p>
                  </div>
                  <div class="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 text-center">
                    <p class="text-xl font-black text-teal-700">\${{ consol4Data.monto_servicios | number:'1.2-2' }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Monto servicios</p>
                  </div>
                  <div class="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
                    <p class="text-2xl font-black text-amber-700">{{ consol4Data.total_ventas }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Total ventas</p>
                  </div>
                  <div class="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 text-center">
                    <p class="text-xl font-black text-orange-700">\${{ consol4Data.monto_ventas | number:'1.2-2' }}</p>
                    <p class="text-xs font-semibold text-slate-600 mt-1">Monto ventas</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Citas por estatus -->
                  <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                    <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-amber-500 rounded-full"></div>
                      <h4 class="text-sm font-bold text-slate-700">Citas por Estatus</h4>
                    </div>
                    <table class="w-full">
                      <thead class="bg-amber-600 text-white">
                        <tr>
                          <th class="text-left px-4 py-2.5 text-xs font-bold">Estatus</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of consol4CitasEntries(); track entry.key; let i = $index) {
                          <tr class="border-b border-slate-100" [class.bg-white]="i%2===0" [class.bg-slate-50]="i%2===1">
                            <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ entry.key }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ entry.value }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Por género -->
                  <div class="rounded-xl border-2 border-slate-200 overflow-hidden">
                    <div class="bg-slate-50 border-b-2 border-slate-200 px-4 py-3 flex items-center gap-2">
                      <div class="w-1 h-4 bg-blue-500 rounded-full"></div>
                      <h4 class="text-sm font-bold text-slate-700">Pacientes Atendidos por Género</h4>
                    </div>
                    <table class="w-full">
                      <thead class="bg-blue-600 text-white">
                        <tr>
                          <th class="text-left px-4 py-2.5 text-xs font-bold">Género</th>
                          <th class="text-right px-4 py-2.5 text-xs font-bold">Pacientes</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of consol4GeneroEntries(); track entry.key; let i = $index) {
                          <tr class="border-b border-slate-100" [class.bg-white]="i%2===0" [class.bg-slate-50]="i%2===1">
                            <td class="px-4 py-2.5 text-sm text-slate-800 font-medium">{{ entry.key }}</td>
                            <td class="px-4 py-2.5 text-sm text-right font-mono font-bold text-slate-700">{{ entry.value }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              @if (!consol4Loading && !consol4Loaded && !consol4Error) {
                <div class="text-center py-12 text-slate-400">
                  <svg class="mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                  <p class="text-sm font-medium">Selecciona mes y año, luego presiona <strong>Generar Reporte</strong></p>
                </div>
              }
            </div>
          </div>

        </div>
      </main>

      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    @media print {
      app-navbar, app-footer, button { display: none !important; }
    }
  `]
})
export class ReportesComponent implements OnInit {
  // ─── Section 1 state ───
  sec1FechaInicio = '';
  sec1FechaFin = '';
  sec1Loading = false;
  sec1Error = '';
  sec1Loaded = false;
  sec1Credenciales = 0;
  sec1TotalServicios = 0;
  sec1Exentos = 0;
  sec1Cuotas = 0;
  sec1Hombres = 0;
  sec1Mujeres = 0;
  sec1Nl = 0;
  sec1Foraneos = 0;
  sec1Lactantes = 0;
  sec1Ninos = 0;
  sec1Adolescentes = 0;
  sec1Adultos = 0;
  sec1ServiciosList: { nombre: string; cantidad: number }[] = [];
  sec1CiudadesList: { nombre: string; estado: string; cantidad: number }[] = [];
  sec1EstudiosList: { nombre: string; cantidad: number }[] = [];

  // ─── Section 2 state ───
  indicPeriodo = '3m';
  indicFechaInicio = '';
  indicFechaFin = '';
  indicLoading = false;
  indicError = '';
  indicLoaded = false;
  indicActivos = 0;
  indicNuevos = 0;
  indicHombres = 0;
  indicMujeres = 0;
  indicMunicipios: { label: string; value: number }[] = [];
  indicTables: CrossTab[] = [];

  indicPeriodos = [
    { id: '3m', label: '3 meses' },
    { id: '6m', label: '6 meses' },
    { id: '1y', label: '1 año' },
  ];

  // ─── Section 3: Segmentación demográfica ───
  seg3FechaInicio = '';
  seg3FechaFin = '';
  seg3Loading = false;
  seg3Error = '';
  seg3Loaded = false;
  seg3Genero: { label: string; value: number }[] = [];
  seg3EtapaVida: { label: string; value: number }[] = [];
  seg3TipoEspina: { label: string; value: number }[] = [];
  seg3Estado: { label: string; value: number }[] = [];

  // ─── Section 4: Consolidado mensual ───
  currentYear = new Date().getFullYear();
  consol4Mes = new Date().getMonth() + 1;
  consol4Anio = new Date().getFullYear();
  consol4Loading = false;
  consol4Error = '';
  consol4Loaded = false;
  consol4Data: any = null;
  consol4Meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
  ];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const today = new Date();
    this.sec1FechaInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.sec1FechaFin = lastDay.toISOString().slice(0, 10);
    this.setIndicPeriod('3m');
  }

  setIndicPeriod(period: string): void {
    this.indicPeriodo = period;
    const today = new Date();
    const inicio = new Date(today);
    if (period === '3m') inicio.setMonth(today.getMonth() - 3);
    else if (period === '6m') inicio.setMonth(today.getMonth() - 6);
    else if (period === '1y') inicio.setFullYear(today.getFullYear() - 1);
    this.indicFechaInicio = inicio.toISOString().slice(0, 10);
    this.indicFechaFin = today.toISOString().slice(0, 10);
  }

  cargarResumenPeriodo(): void {
    this.sec1Loading = true;
    this.sec1Error = '';
    this.sec1Loaded = false;
    forkJoin({
      servicios: this.api.getReporteServiciosPorTipo({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      pagos: this.api.getReportePagosExentos({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      estudios: this.api.getReporteEstudiosPorTipo({ fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin }),
      stats: this.api.getDashboardStats(),
      ciudades: this.api.getReportePorCiudad(),
    }).subscribe({
      next: ({ servicios, pagos, estudios, stats, ciudades }) => {
        this.sec1Credenciales = stats.activos ?? 0;
        this.sec1TotalServicios = servicios.total ?? 0;
        this.sec1Exentos = pagos.total_exentos ?? 0;
        this.sec1Cuotas = pagos.total_cuotas ?? 0;

        const pg: Record<string, number> = stats.por_genero ?? {};
        const pp: Record<string, number> = stats.por_procedencia ?? {};
        const pe: Record<string, number> = stats.por_etapa_vida ?? {};
        this.sec1Hombres = pg['Masculino'] ?? 0;
        this.sec1Mujeres = pg['Femenino'] ?? 0;
        this.sec1Nl = pp['Nuevo León'] ?? 0;
        this.sec1Foraneos = pp['Foráneos'] ?? 0;
        this.sec1Lactantes = pe['Primera Infancia (0-5)'] ?? 0;
        this.sec1Ninos = pe['Infancia (6-11)'] ?? 0;
        this.sec1Adolescentes = pe['Adolescencia (12-17)'] ?? 0;
        this.sec1Adultos = (pe['Juventud (18-29)'] ?? 0) + (pe['Adultez (30-59)'] ?? 0) + (pe['Adulto Mayor (60+)'] ?? 0);

        const sLabels: string[] = servicios.labels ?? [];
        const sValues: number[] = servicios.values ?? [];
        this.sec1ServiciosList = sLabels.map((nombre, i) => ({ nombre, cantidad: sValues[i] ?? 0 }));

        const cLabels: string[] = ciudades.labels ?? [];
        const cEstados: string[] = ciudades.estados ?? [];
        const cValues: number[] = ciudades.values ?? [];
        this.sec1CiudadesList = cLabels.map((nombre, i) => ({ nombre, estado: cEstados[i] ?? '', cantidad: cValues[i] ?? 0 }));

        const eLabels: string[] = estudios.labels ?? [];
        const eValues: number[] = estudios.values ?? [];
        this.sec1EstudiosList = eLabels.map((nombre, i) => ({ nombre, cantidad: eValues[i] ?? 0 }));

        this.sec1Loaded = true;
        this.sec1Loading = false;
      },
      error: (err: any) => {
        this.sec1Error = err?.error?.detail || 'Error al cargar los datos del resumen.';
        this.sec1Loading = false;
      },
    });
  }

  cargarIndicadores(): void {
    this.indicLoading = true;
    this.indicError = '';
    this.indicLoaded = false;
    this.api.getIndicadoresDesempeno({
      fecha_inicio: this.indicFechaInicio,
      fecha_fin: this.indicFechaFin,
    }).subscribe({
      next: (data: any) => {
        this.indicActivos = data.beneficiarios_activos ?? 0;
        this.indicNuevos = data.nuevos_en_periodo ?? 0;
        this.indicHombres = data.hombres ?? 0;
        this.indicMujeres = data.mujeres ?? 0;
        this.indicMunicipios = data.municipios ?? [];

        const tablas = data.tablas ?? {};
        this.indicTables = [
          { titulo: 'Sujetos de derecho por CURP', cols: ['CURP N.L.', 'CURP Foráneo'], rows: tablas.por_curp ?? [] },
          { titulo: 'Sujetos de derecho por CURP N.L.', cols: ['Hombre', 'Mujer'], rows: tablas.curp_nl_genero ?? [] },
          { titulo: 'Sujetos de derecho foráneos', cols: ['Hombre', 'Mujer'], rows: tablas.curp_foraneo_genero ?? [] },
          { titulo: 'Sujetos de derecho por lugar de residencia', cols: ['Viven en N.L.', 'Viven en otros estados'], rows: tablas.residencia ?? [] },
          { titulo: 'Sujetos de derecho por nacimiento', cols: ['Mexicanos', 'Nac. extranjera'], rows: tablas.nacimiento ?? [] },
          { titulo: 'Sujetos de derecho por etapa de vida', cols: ['Hombre', 'Mujer'], rows: tablas.etapa_vida_genero ?? [] },
        ];

        this.indicLoaded = true;
        this.indicLoading = false;
      },
      error: (err: any) => {
        this.indicError = err?.error?.detail || 'Error al cargar los indicadores.';
        this.indicLoading = false;
      },
    });
  }

  exportarPDFResumen(): void {
    this.api.exportarReportePdf('resumen', { fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin })
      .subscribe({
        next: (blob) => this.descargar(blob, `reporte_resumen_${this.sec1FechaInicio}.pdf`),
        error: () => alert('Error al generar PDF'),
      });
  }

  exportarExcelResumen(): void {
    this.api.exportarReporteExcel('all', { fecha_inicio: this.sec1FechaInicio, fecha_fin: this.sec1FechaFin })
      .subscribe({
        next: (blob) => this.descargar(blob, `reportes_${this.sec1FechaInicio}_${this.sec1FechaFin}.xlsx`),
        error: () => alert('Error al generar Excel'),
      });
  }

  cargarSegmentacion(): void {
    this.seg3Loading = true;
    this.seg3Error = '';
    this.seg3Loaded = false;
    const filters = { fecha_inicio: this.seg3FechaInicio || undefined, fecha_fin: this.seg3FechaFin || undefined };
    forkJoin({
      genero: this.api.getReportePorGenero(filters),
      etapa: this.api.getReportePorEtapaVida(filters),
      espina: this.api.getReportePorTipoEspina(filters),
      estado: this.api.getReportePorEstado(filters),
    }).subscribe({
      next: ({ genero, etapa, espina, estado }) => {
        this.seg3Genero = (genero.labels as string[]).map((l: string, i: number) => ({ label: l, value: (genero.values as number[])[i] ?? 0 }));
        this.seg3EtapaVida = (etapa.labels as string[]).map((l: string, i: number) => ({ label: l, value: (etapa.values as number[])[i] ?? 0 }));
        this.seg3TipoEspina = (espina.labels as string[]).map((l: string, i: number) => ({ label: l, value: (espina.values as number[])[i] ?? 0 }));
        this.seg3Estado = (estado.labels as string[]).map((l: string, i: number) => ({ label: l, value: (estado.values as number[])[i] ?? 0 }));
        this.seg3Loaded = true;
        this.seg3Loading = false;
      },
      error: (err: any) => {
        this.seg3Error = err?.error?.detail || 'Error al cargar la segmentación.';
        this.seg3Loading = false;
      },
    });
  }

  seg3Total(rows: { label: string; value: number }[]): number {
    return rows.reduce((acc, r) => acc + r.value, 0);
  }

  cargarConsolidadoMensual(): void {
    this.consol4Loading = true;
    this.consol4Error = '';
    this.consol4Loaded = false;
    this.consol4Data = null;
    this.api.getReporteConsolidadoMensual(this.consol4Mes, this.consol4Anio).subscribe({
      next: (data: any) => {
        this.consol4Data = data;
        this.consol4Loaded = true;
        this.consol4Loading = false;
      },
      error: (err: any) => {
        this.consol4Error = err?.error?.detail || 'Error al generar el reporte consolidado.';
        this.consol4Loading = false;
      },
    });
  }

  consol4CitasEntries(): { key: string; value: number }[] {
    if (!this.consol4Data?.citas_por_estatus) return [];
    return Object.entries(this.consol4Data.citas_por_estatus).map(([key, value]) => ({ key, value: value as number }));
  }

  consol4GeneroEntries(): { key: string; value: number }[] {
    if (!this.consol4Data?.por_genero) return [];
    return Object.entries(this.consol4Data.por_genero).map(([key, value]) => ({ key, value: value as number }));
  }

  consol4NombreMes(mes: number): string {
    return this.consol4Meses.find(m => m.value === mes)?.label ?? String(mes);
  }

  exportarConsolidadoExcel(): void {
    this.api.exportarReporteExcel('consolidado-mensual', { mes: this.consol4Mes, anio: this.consol4Anio })
      .subscribe({
        next: (blob) => this.descargar(blob, `consolidado_${this.consol4NombreMes(this.consol4Mes)}_${this.consol4Anio}.xlsx`),
        error: () => alert('Error al generar Excel'),
      });
  }

  private descargar(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 150);
  }
}
