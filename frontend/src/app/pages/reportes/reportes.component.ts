import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

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
                <p class="text-slate-500 text-sm">Selecciona el periodo y genera un reporte en formato PDF</p>
              </div>
            </div>

            <!-- Period selector grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <button
                *ngFor="let period of periods"
                (click)="selectPeriod(period.id)"
                class="px-4 py-3 rounded-lg border-2 font-semibold text-sm flex flex-col items-center gap-1 transition-all"
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

            <!-- Action buttons -->
            <div class="flex gap-3 pt-4 border-t border-slate-200">
              <button (click)="generarReporte()" class="px-6 py-2.5 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                <!-- FileText icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                Generar Reporte
              </button>
              <button (click)="vistaPrevia()" class="px-6 py-2.5 border-2 border-[#00328b] text-[#00328b] hover:bg-blue-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                <!-- Eye icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Vista Previa
              </button>
              <button (click)="exportarPDF()" class="px-6 py-2.5 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                <!-- Download icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                Exportar PDF
              </button>
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
                <button (click)="toggleModal()" class="px-4 py-2 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                  <!-- Plus icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" x2="12" y1="5" y2="19"/>
                    <line x1="5" x2="19" y1="12" y2="12"/>
                  </svg>
                  Agregar Graficas
                </button>
                <button (click)="limpiarGraficas()" class="px-4 py-2 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
                  <!-- Trash icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Limpiar
                </button>
                <button (click)="imprimir()" class="px-4 py-2 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-sm transition-colors flex items-center gap-2">
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
                  <button (click)="removeChart(chart)" class="ml-1 hover:text-red-600 transition-colors">
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
              <button (click)="toggleModal()" class="px-6 py-2.5 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors inline-flex items-center gap-2">
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
                  <button (click)="removeChart(chart)" class="text-slate-400 hover:text-red-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" x2="6" y1="6" y2="18"/>
                      <line x1="6" x2="18" y1="6" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div class="h-48 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <!-- Chart placeholder icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2">
                    <path d="M3 3v18h18"/>
                    <path d="M18 17V9"/>
                    <path d="M13 17V5"/>
                    <path d="M8 17v-3"/>
                  </svg>
                  <span class="text-sm font-medium">Grafica de {{ getChartName(chart) }}</span>
                  <span class="text-xs text-slate-300 mt-1">Integrar ng2-charts para visualizar datos</span>
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
            <button (click)="toggleModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
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
              class="w-full text-left px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all flex items-center justify-between"
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
            <button (click)="toggleModal()" class="flex-1 px-4 py-2.5 bg-[#00328b] hover:bg-[#00246d] text-white font-bold rounded-lg text-sm transition-colors">
              Aceptar
            </button>
            <button (click)="toggleModal()" class="flex-1 px-4 py-2.5 border-2 border-slate-300 text-slate-600 hover:bg-slate-50 font-bold rounded-lg text-sm transition-colors">
              Cancelar
            </button>
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
  selectedCharts: string[] = [];
  showModal = false;

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
    { id: 'beneficiarios-genero', nombre: 'Beneficiarios por Genero' },
    { id: 'beneficiarios-municipio', nombre: 'Beneficiarios por Municipio' },
    { id: 'beneficiarios-edad', nombre: 'Beneficiarios por Edad' },
    { id: 'beneficiarios-locales', nombre: 'Usuarios Locales' },
    { id: 'beneficiarios-foraneos', nombre: 'Usuarios Foraneos' },
    { id: 'beneficiarios-origen', nombre: 'Usuarios por Origen' }
  ];

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
  }

  generarReporte(): void {
    // TODO: integrate with API to generate report
  }

  vistaPrevia(): void {
    // TODO: integrate with API for preview
  }

  exportarPDF(): void {
    // TODO: integrate PDF export
  }

  imprimir(): void {
    window.print();
  }
}
