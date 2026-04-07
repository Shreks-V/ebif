import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface IndicadorOption {
  id: string;
  nombre: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] overflow-hidden">
      <app-navbar></app-navbar>

      <main class="flex-1 overflow-y-auto">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

          <!-- Header -->
          <div class="flex items-center gap-4">
            <div class="bg-[#00328b] p-3 rounded-xl shadow-lg">
              <!-- FileText icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <h1 class="text-3xl font-bold text-slate-800">Reportes e Indicadores</h1>
              <p class="text-slate-500 text-sm mt-1">Genera reportes documentales y visualiza graficas en pantalla</p>
            </div>
          </div>

          <!-- SECTION 1: Generar Reporte Documento -->
          <div class="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-6">
            <!-- Section header -->
            <div class="flex items-center gap-3 mb-6">
              <div class="bg-[#00328b] p-2 rounded-lg">
                <!-- FileText icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-slate-800">Generar Reporte Documento</h2>
                <p class="text-slate-500 text-sm">Selecciona el tipo de reporte, periodo y genera un reporte</p>
              </div>
            </div>

            <!-- Report type selector -->
            <div class="mb-6">
              <label class="block text-sm font-semibold text-slate-700 mb-2">Tipo de Reporte</label>
              <select [(ngModel)]="tipoReporte"
                class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm">
                <option value="">Seleccionar tipo de reporte...</option>
                <option value="genero">Reporte por Genero</option>
                <option value="etapa-vida">Reporte por Etapa de Vida</option>
                <option value="tipo-espina">Reporte por Tipo de Espina</option>
                <option value="estado">Reporte por Estado</option>
                <option value="resumen">Reporte Resumen</option>
              </select>
            </div>

            <!-- Period selector grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <button
                *ngFor="let period of periods"
                (click)="selectPeriod(period.id)"
                class="px-4 py-3 rounded-lg border-2 font-semibold text-sm flex flex-col items-center gap-1 transition-all cursor-pointer"
                [ngClass]="{
                  'bg-[#00328b] text-white border-[#00328b] shadow-lg': selectedPeriod === period.id,
                  'bg-white text-slate-700 border-slate-300 hover:border-[#00328b]': selectedPeriod !== period.id
                }">
                <!-- Calendar icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                  <line x1="16" x2="16" y1="2" y2="6"/>
                  <line x1="8" x2="8" y1="2" y2="6"/>
                  <line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                {{ period.label }}
              </button>
            </div>

            <!-- Custom date inputs -->
            <div *ngIf="selectedPeriod === 'personalizado'" class="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 mb-6">
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha Inicio</label>
                <input type="date" [(ngModel)]="fechaInicio"
                  class="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100">
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-1">Fecha Fin</label>
                <input type="date" [(ngModel)]="fechaFin"
                  class="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm focus:border-[#00328b] focus:outline-none focus:ring-2 focus:ring-blue-100">
              </div>
            </div>

            <!-- Error / info messages -->
            <div *ngIf="reporteError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {{ reporteError }}
            </div>

            <!-- Action buttons -->
            <div class="flex gap-3 pt-4 border-t border-slate-200">
              <button (click)="generarReporte()" [disabled]="generandoReporte" class="px-6 py-2.5 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <!-- FileText icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                {{ generandoReporte ? 'Generando...' : 'Generar Reporte' }}
              </button>
              <button (click)="vistaPrevia()" [disabled]="generandoReporte" class="px-6 py-2.5 border-2 border-[#00328b] text-[#00328b] hover:bg-blue-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <!-- Eye icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Vista Previa
              </button>
              <button (click)="exportarPDF()" class="px-6 py-2.5 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3M6 20h12a2 2 0 002-2V8l-6-6H6a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
                Exportar PDF
              </button>
              <button (click)="exportarExcel()" class="px-6 py-2.5 border-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                Exportar Excel
              </button>
            </div>
          </div>

          <!-- Report Results Section -->
          <div *ngIf="reporteData && reporteData.length > 0" class="bg-white rounded-xl shadow-lg border-2 border-slate-200 p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="bg-emerald-500 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-800">Resultados del Reporte</h2>
                  <p class="text-slate-500 text-sm">{{ getReporteTipoLabel() }} - {{ reporteData.length }} registros</p>
                </div>
              </div>
              <button (click)="limpiarReporte()" class="text-sm font-semibold text-slate-500 hover:text-red-500 cursor-pointer">Limpiar</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th *ngFor="let col of reporteColumnas" class="text-left px-5 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {{ col }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let row of reporteData" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td *ngFor="let col of reporteColumnas" class="px-5 py-3 text-sm text-slate-700">
                      {{ row[col] }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- SECTION 2: Visualizacion de Graficas -->
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg border-2 border-[#00328b] p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div class="flex items-center gap-3">
                <div class="bg-[#00328b] p-2 rounded-lg">
                  <!-- BarChart3 icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3v18h18"/>
                    <path d="M18 17V9"/>
                    <path d="M13 17V5"/>
                    <path d="M8 17v-3"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-slate-800">Visualizacion de Graficas</h2>
                  <p class="text-slate-500 text-sm">Selecciona indicadores para visualizar en pantalla</p>
                </div>
              </div>
              <div class="flex gap-2 flex-wrap">
                <button (click)="toggleModal()" class="px-4 py-2 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                  <!-- Plus icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19"/>
                    <line x1="5" x2="19" y1="12" y2="12"/>
                  </svg>
                  Agregar Graficas
                </button>
                <button (click)="limpiarGraficas()" class="px-4 py-2 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                  <!-- Trash icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Limpiar
                </button>
                <button (click)="imprimir()" class="px-4 py-2 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2 cursor-pointer">
                  <!-- Printer icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect width="12" height="8" x="6" y="14"/>
                  </svg>
                  Imprimir
                </button>
              </div>
            </div>

            <!-- Added charts compact list -->
            <div *ngIf="selectedCharts.length > 0" class="bg-white border-2 border-blue-300 rounded-lg p-4 mb-6">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold text-slate-700">Graficas seleccionadas:</span>
                <span *ngFor="let chart of selectedCharts"
                  class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  {{ getChartName(chart) }}
                  <button (click)="removeChart(chart)" class="ml-1 hover:text-red-600 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18"/>
                      <line x1="6" x2="18" y1="6" y2="18"/>
                    </svg>
                  </button>
                </span>
              </div>
            </div>

            <!-- Empty state -->
            <div *ngIf="selectedCharts.length === 0" class="text-center py-16 bg-white rounded-lg border-2 border-dashed border-slate-300">
              <div class="flex justify-center mb-4">
                <!-- Big chart icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9"/>
                  <path d="M13 17V5"/>
                  <path d="M8 17v-3"/>
                </svg>
              </div>
              <h3 class="text-lg font-bold text-slate-700 mb-2">No hay graficas para visualizar</h3>
              <p class="text-slate-500 text-sm mb-6">Agrega indicadores para generar graficas y visualizar los datos</p>
              <button (click)="toggleModal()" class="px-6 py-2.5 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors inline-flex items-center gap-2 cursor-pointer">
                <!-- Plus icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" x2="12" y1="5" y2="19"/>
                  <line x1="5" x2="19" y1="12" y2="12"/>
                </svg>
                Agregar Graficas
              </button>
            </div>

            <!-- Chart cards grid -->
            <div *ngIf="selectedCharts.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div *ngFor="let chart of selectedCharts" class="bg-white rounded-xl shadow border-2 border-slate-200 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-bold text-slate-800">{{ getChartName(chart) }}</h3>
                  <button (click)="removeChart(chart)" class="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18"/>
                      <line x1="6" x2="18" y1="6" y2="18"/>
                    </svg>
                  </button>
                </div>
                <!-- Loading -->
                <div *ngIf="!chartData[chart]" class="h-48 flex items-center justify-center text-slate-400 text-sm">Cargando datos...</div>
                <!-- No data -->
                <div *ngIf="chartData[chart] && chartData[chart].length === 0" class="h-48 flex items-center justify-center text-slate-400 text-sm">Sin datos disponibles</div>
                <!-- Bar chart -->
                <div *ngIf="chartData[chart] && chartData[chart].length > 0" class="space-y-3">
                  <div *ngFor="let item of chartData[chart]; let i = index" class="flex items-center gap-3">
                    <span class="text-xs text-slate-600 font-semibold w-28 truncate text-right" [title]="item.label">{{ item.label }}</span>
                    <div class="flex-1 bg-slate-100 rounded-full h-7 relative overflow-hidden">
                      <div class="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                        [style.width.%]="item.pct"
                        [style.background]="chartColors[i % chartColors.length]">
                        <span class="text-[11px] font-bold text-white drop-shadow" *ngIf="item.pct > 12">{{ item.value }}</span>
                      </div>
                      <span class="text-[11px] font-bold text-slate-600 absolute left-2 top-1/2 -translate-y-1/2" *ngIf="item.pct <= 12">{{ item.value }}</span>
                    </div>
                    <span class="text-xs text-slate-400 font-semibold w-10 text-right">{{ item.pct | number:'1.0-0' }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <app-footer></app-footer>

      <!-- Modal: Add Charts -->
      <div *ngIf="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" (click)="toggleModal()">
        <div class="bg-white rounded-xl shadow-2xl border-2 border-slate-200 w-full max-w-md mx-4 p-6" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-slate-800">Agregar Graficas</h3>
            <button (click)="toggleModal()" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" x2="6" y1="6" y2="18"/>
                <line x1="6" x2="18" y1="6" y2="18"/>
              </svg>
            </button>
          </div>
          <p class="text-slate-500 text-sm mb-4">Selecciona los indicadores que deseas visualizar</p>
          <div class="space-y-2 max-h-72 overflow-y-auto">
            <button *ngFor="let option of indicadorOptions"
              (click)="toggleChart(option.id)"
              class="w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all flex items-center justify-between cursor-pointer"
              [ngClass]="{
                'bg-[#00328b] text-white border-[#00328b]': isChartSelected(option.id),
                'bg-white text-slate-700 border-slate-200 hover:border-[#00328b] hover:bg-blue-50': !isChartSelected(option.id)
              }">
              <span>{{ option.nombre }}</span>
              <svg *ngIf="isChartSelected(option.id)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
          <div class="flex gap-3 mt-6 pt-4 border-t border-slate-200">
            <button (click)="toggleModal()" class="flex-1 px-4 py-2.5 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer">
              Aceptar
            </button>
            <button (click)="toggleModal()" class="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-sm transition-colors cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <!-- Vista Previa Modal -->
      <div *ngIf="showVistaPrevia" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="closeVistaPrevia()">
        <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[#00328b] rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div>
                <h2 class="text-xl font-bold text-slate-900">Vista Previa del Reporte</h2>
                <p class="text-xs text-slate-500">{{ getReporteTipoLabel() }}</p>
              </div>
            </div>
            <button (click)="closeVistaPrevia()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

          <!-- Loading state -->
          <div *ngIf="generandoReporte" class="text-center py-12">
            <p class="text-slate-500 text-sm">Cargando datos...</p>
          </div>

          <!-- Preview error -->
          <div *ngIf="vistaPreviaError" class="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
            {{ vistaPreviaError }}
          </div>

          <!-- Preview table -->
          <div *ngIf="!generandoReporte && vistaPreviaData && vistaPreviaData.length > 0" class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th *ngFor="let col of vistaPreviaColumnas" class="text-left px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of vistaPreviaData" class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td *ngFor="let col of vistaPreviaColumnas" class="px-4 py-3 text-sm text-slate-700">
                    {{ row[col] }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p class="text-xs text-slate-400 mt-3 text-right">{{ vistaPreviaData.length }} registros</p>
          </div>

          <!-- Empty -->
          <div *ngIf="!generandoReporte && vistaPreviaData && vistaPreviaData.length === 0" class="text-center py-12">
            <p class="text-slate-400 text-sm">No se encontraron datos para los filtros seleccionados.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ReportesComponent {
  selectedPeriod = 'ultimo-mes';
  fechaInicio = '';
  fechaFin = '';
  tipoReporte = '';
  selectedCharts: string[] = [];
  showModal = false;

  // Report results
  reporteData: any[] | null = null;
  reporteColumnas: string[] = [];
  reporteError = '';
  generandoReporte = false;

  // Vista previa
  showVistaPrevia = false;
  vistaPreviaData: any[] | null = null;
  vistaPreviaColumnas: string[] = [];
  vistaPreviaError = '';

  periods = [
    { id: 'ultimo-mes', label: 'Ultimo Mes' },
    { id: 'ultimos-3-meses', label: 'Ultimos 3 Meses' },
    { id: 'ultimo-trimestre', label: 'Ultimo Trimestre' },
    { id: 'ultimos-6-meses', label: 'Ultimos 6 Meses' },
    { id: 'ultimo-ano', label: 'Ultimo Ano' },
    { id: 'personalizado', label: 'Personalizado' }
  ];

  indicadorOptions: IndicadorOption[] = [
    { id: 'beneficiarios-activos', nombre: 'Beneficiarios Activos' },
    { id: 'beneficiarios-genero', nombre: 'Distribución por Género' },
    { id: 'beneficiarios-estado', nombre: 'Distribución por Estado' },
    { id: 'beneficiarios-edad', nombre: 'Distribución por Edad' },
    { id: 'tipo-espina', nombre: 'Por Tipo de Espina Bífida' },
    { id: 'tipo-sangre', nombre: 'Por Tipo de Sangre' },
    { id: 'uso-valvula', nombre: 'Uso de Válvula' },
    { id: 'membresia-estatus', nombre: 'Estatus de Membresía' },
    { id: 'tipo-cuota', nombre: 'Por Tipo de Cuota' },
  ];

  // Chart data
  chartData: Record<string, { label: string; value: number; pct: number }[]> = {};
  chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1'];
  private dashboardCache: any = null;

  constructor(private api: ApiService) {}

  selectPeriod(id: string): void {
    this.selectedPeriod = id;
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  toggleChart(id: string): void {
    const index = this.selectedCharts.indexOf(id);
    if (index === -1) {
      this.selectedCharts.push(id);
      this.loadChartData(id);
    } else {
      this.selectedCharts.splice(index, 1);
    }
  }

  isChartSelected(id: string): boolean {
    return this.selectedCharts.includes(id);
  }

  removeChart(id: string): void {
    this.selectedCharts = this.selectedCharts.filter(c => c !== id);
  }

  getChartName(id: string): string {
    const option = this.indicadorOptions.find(o => o.id === id);
    return option ? option.nombre : id;
  }

  limpiarGraficas(): void {
    this.selectedCharts = [];
    this.chartData = {};
  }

  private loadChartData(chartId: string): void {
    // Charts that come from the dashboard stats endpoint
    const dashboardCharts = [
      'beneficiarios-activos', 'beneficiarios-genero', 'beneficiarios-estado',
      'beneficiarios-edad', 'membresia-estatus',
    ];

    if (dashboardCharts.includes(chartId)) {
      if (this.dashboardCache) {
        this.chartData[chartId] = this.extractDashboardChart(chartId, this.dashboardCache);
      } else {
        this.api.getDashboardStats().subscribe({
          next: (stats: any) => {
            this.dashboardCache = stats;
            // Process all pending dashboard charts
            this.selectedCharts.filter(c => dashboardCharts.includes(c)).forEach(c => {
              this.chartData[c] = this.extractDashboardChart(c, stats);
            });
          },
          error: () => { this.chartData[chartId] = []; },
        });
      }
      return;
    }

    // Charts that come from specific report endpoints
    const reportMap: Record<string, any> = {
      'tipo-espina': this.api.getReportePorTipoEspina({}),
      'tipo-cuota': this.api.getReportePagosExentos({}),
    };

    if (reportMap[chartId]) {
      reportMap[chartId].subscribe({
        next: (resp: any) => {
          this.chartData[chartId] = this.extractReportChart(chartId, resp);
        },
        error: () => { this.chartData[chartId] = []; },
      });
      return;
    }

    // Fallback: fetch from beneficiarios stats
    if (chartId === 'tipo-sangre' || chartId === 'uso-valvula') {
      this.api.getBeneficiariosStats().subscribe({
        next: (stats: any) => {
          this.chartData[chartId] = this.extractBeneficiariosChart(chartId, stats);
        },
        error: () => { this.chartData[chartId] = []; },
      });
      return;
    }

    this.chartData[chartId] = [];
  }

  private toBarData(obj: Record<string, number>): { label: string; value: number; pct: number }[] {
    const total = Object.values(obj).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(obj).map(([label, value]) => ({
      label,
      value,
      pct: (value / total) * 100,
    }));
  }

  private extractDashboardChart(chartId: string, stats: any): { label: string; value: number; pct: number }[] {
    switch (chartId) {
      case 'beneficiarios-activos':
        return this.toBarData({ Activos: stats.activos ?? 0, Inactivos: stats.inactivos ?? 0 });
      case 'beneficiarios-genero':
        return this.toBarData(stats.por_genero ?? {});
      case 'beneficiarios-estado':
        return this.toBarData(stats.por_procedencia ?? {});
      case 'beneficiarios-edad':
        return this.toBarData(stats.por_etapa_vida ?? {});
      case 'membresia-estatus':
        return this.toBarData({ Activos: stats.activos ?? 0, Inactivos: stats.inactivos ?? 0 });
      default:
        return [];
    }
  }

  private extractReportChart(chartId: string, resp: any): { label: string; value: number; pct: number }[] {
    const data = Array.isArray(resp) ? resp : (resp?.data ?? resp?.resultados ?? []);
    if (data.length === 0) return [];

    // Build a key-value map from the report data
    const obj: Record<string, number> = {};
    for (const row of data) {
      const keys = Object.keys(row);
      const labelKey = keys.find(k => typeof row[k] === 'string') ?? keys[0];
      const valueKey = keys.find(k => typeof row[k] === 'number' && k !== labelKey) ?? keys[1];
      if (labelKey && valueKey) {
        obj[String(row[labelKey]).trim()] = Number(row[valueKey]) || 0;
      }
    }
    return this.toBarData(obj);
  }

  private extractBeneficiariosChart(chartId: string, stats: any): { label: string; value: number; pct: number }[] {
    // These stats may have grouped data; if not, return empty
    if (chartId === 'tipo-sangre' && stats.por_tipo_sangre) {
      return this.toBarData(stats.por_tipo_sangre);
    }
    if (chartId === 'uso-valvula' && stats.por_valvula) {
      return this.toBarData(stats.por_valvula);
    }
    // Fallback: try to fetch from report endpoints
    if (chartId === 'tipo-sangre') {
      return this.toBarData({ 'Sin datos': 0 });
    }
    if (chartId === 'uso-valvula') {
      return this.toBarData({ 'Sin datos': 0 });
    }
    return [];
  }

  getReporteTipoLabel(): string {
    const labels: Record<string, string> = {
      'genero': 'Reporte por Genero',
      'etapa-vida': 'Reporte por Etapa de Vida',
      'tipo-espina': 'Reporte por Tipo de Espina',
      'estado': 'Reporte por Estado',
      'resumen': 'Reporte Resumen'
    };
    return labels[this.tipoReporte] || 'Reporte';
  }

  private buildFilters(): any {
    const filters: any = { periodo: this.selectedPeriod };
    if (this.selectedPeriod === 'personalizado') {
      if (this.fechaInicio) filters.fecha_inicio = this.fechaInicio;
      if (this.fechaFin) filters.fecha_fin = this.fechaFin;
    }
    return filters;
  }

  private getApiCall(filters: any) {
    switch (this.tipoReporte) {
      case 'genero': return this.api.getReportePorGenero(filters);
      case 'etapa-vida': return this.api.getReportePorEtapaVida(filters);
      case 'tipo-espina': return this.api.getReportePorTipoEspina(filters);
      case 'estado': return this.api.getReportePorEstado(filters);
      case 'resumen': return this.api.getReporteResumen(filters);
      default: return null;
    }
  }

  private extractColumnsAndData(response: any): { columnas: string[]; data: any[] } {
    // Handle different response shapes
    let data: any[] = [];
    if (Array.isArray(response)) {
      data = response;
    } else if (response && Array.isArray(response.data)) {
      data = response.data;
    } else if (response && Array.isArray(response.resultados)) {
      data = response.resultados;
    } else if (response && typeof response === 'object') {
      // Single object - wrap it
      data = [response];
    }

    const columnas = data.length > 0 ? Object.keys(data[0]) : [];
    return { columnas, data };
  }

  generarReporte(): void {
    if (!this.tipoReporte) {
      this.reporteError = 'Selecciona un tipo de reporte.';
      return;
    }
    if (this.selectedPeriod === 'personalizado' && (!this.fechaInicio || !this.fechaFin)) {
      this.reporteError = 'Ingresa ambas fechas para el periodo personalizado.';
      return;
    }

    this.reporteError = '';
    this.generandoReporte = true;
    const filters = this.buildFilters();
    const apiCall = this.getApiCall(filters);

    if (!apiCall) {
      this.reporteError = 'Tipo de reporte no valido.';
      this.generandoReporte = false;
      return;
    }

    apiCall.subscribe({
      next: (response: any) => {
        const { columnas, data } = this.extractColumnsAndData(response);
        this.reporteColumnas = columnas;
        this.reporteData = data;
        this.generandoReporte = false;
      },
      error: (err: any) => {
        this.reporteError = err?.error?.detail || 'Error al generar el reporte. Intenta de nuevo.';
        this.generandoReporte = false;
        console.error('Error al generar reporte:', err);
      }
    });
  }

  limpiarReporte(): void {
    this.reporteData = null;
    this.reporteColumnas = [];
  }

  vistaPrevia(): void {
    if (!this.tipoReporte) {
      this.vistaPreviaError = 'Selecciona un tipo de reporte.';
      this.showVistaPrevia = true;
      this.vistaPreviaData = null;
      return;
    }
    if (this.selectedPeriod === 'personalizado' && (!this.fechaInicio || !this.fechaFin)) {
      this.vistaPreviaError = 'Ingresa ambas fechas para el periodo personalizado.';
      this.showVistaPrevia = true;
      this.vistaPreviaData = null;
      return;
    }

    this.vistaPreviaError = '';
    this.generandoReporte = true;
    this.showVistaPrevia = true;
    this.vistaPreviaData = null;

    const filters = this.buildFilters();
    const apiCall = this.getApiCall(filters);

    if (!apiCall) {
      this.vistaPreviaError = 'Tipo de reporte no valido.';
      this.generandoReporte = false;
      return;
    }

    apiCall.subscribe({
      next: (response: any) => {
        const { columnas, data } = this.extractColumnsAndData(response);
        this.vistaPreviaColumnas = columnas;
        this.vistaPreviaData = data;
        this.generandoReporte = false;
      },
      error: (err: any) => {
        this.vistaPreviaError = err?.error?.detail || 'Error al cargar vista previa.';
        this.generandoReporte = false;
        console.error('Error en vista previa:', err);
      }
    });
  }

  closeVistaPrevia(): void {
    this.showVistaPrevia = false;
    this.vistaPreviaData = null;
    this.vistaPreviaColumnas = [];
    this.vistaPreviaError = '';
  }

  exportarPDF(): void {
    const tipo = this.tipoReporte || 'resumen';
    const filters = this.buildExportFilters();

    this.api.exportarReportePdf(tipo, filters).subscribe({
      next: (blob) => this.descargarArchivo(blob, `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.pdf`),
      error: () => alert('Error al generar PDF'),
    });
  }

  exportarExcel(): void {
    const tipo = this.tipoReporte || 'resumen';
    const filters = this.buildExportFilters();

    this.api.exportarReporteExcel(tipo, filters).subscribe({
      next: (blob) => this.descargarArchivo(blob, `reporte_${tipo}_${new Date().toISOString().slice(0, 10)}.xlsx`),
      error: () => alert('Error al generar Excel'),
    });
  }

  private buildExportFilters(): any {
    const filters: any = {};
    if (this.selectedPeriod === 'personalizado') {
      if (this.fechaInicio) filters.fecha_inicio = this.fechaInicio;
      if (this.fechaFin) filters.fecha_fin = this.fechaFin;
    } else {
      const { inicio, fin } = this.calcularRangoFechas(this.selectedPeriod);
      filters.fecha_inicio = inicio;
      filters.fecha_fin = fin;
    }
    return filters;
  }

  private calcularRangoFechas(periodo: string): { inicio: string; fin: string } {
    const hoy = new Date();
    const fin = hoy.toISOString().slice(0, 10);
    let inicio = new Date(hoy);

    switch (periodo) {
      case 'ultimo-mes': inicio.setMonth(hoy.getMonth() - 1); break;
      case 'ultimos-3-meses': inicio.setMonth(hoy.getMonth() - 3); break;
      case 'ultimo-trimestre': inicio.setMonth(hoy.getMonth() - 3); break;
      case 'ultimos-6-meses': inicio.setMonth(hoy.getMonth() - 6); break;
      case 'ultimo-ano': inicio.setFullYear(hoy.getFullYear() - 1); break;
      default: inicio.setMonth(hoy.getMonth() - 1);
    }

    return { inicio: inicio.toISOString().slice(0, 10), fin };
  }

  private descargarArchivo(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  imprimir(): void {
    window.print();
  }
}
