import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-gradient-to-br from-[#b9e5fb]/30 via-white to-[#e0f2ff]/50">
      <app-navbar></app-navbar>

      <main class="flex-1">
        <div class="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

          <!-- 1. Header -->
          <div>
            <h1 class="text-3xl font-black text-slate-900">Dashboard</h1>
            <p class="text-sm text-slate-600 flex items-center gap-2 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ todayFormatted }}
            </p>
          </div>

          <!-- 2. Doctor del Día -->
          <div class="bg-gradient-to-br from-[#007BFF] to-[#0056b3] rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-6">
              <div class="flex items-start justify-between mb-6">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur border-2 border-white/30 text-white">
                    {{ doctorIniciales }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-200">
                        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                        <circle cx="20" cy="10" r="2"/>
                      </svg>
                      <span class="text-xs text-blue-200 font-bold uppercase tracking-wide">Consultorio Hoy</span>
                    </div>
                    <h2 class="text-2xl font-black text-white">{{ doctorNombre }}</h2>
                    <p class="text-sm text-blue-200">{{ doctorEspecialidad }}</p>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
              <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div class="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-200">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p class="text-xs text-blue-200 font-bold">Horario</p>
                </div>
                <p class="text-lg font-black text-white">{{ doctorHorario }}</p>
              </div>
              <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div class="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-200">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  <p class="text-xs text-blue-200 font-bold">Atendidos</p>
                </div>
                <p class="text-lg font-black text-white">{{ doctorAtendidos }} / {{ doctorTotalHoy }}</p>
              </div>
              </div>
            </div>
          </div>

          <!-- 3. Grid Principal -->
          <div class="grid grid-cols-3 gap-6">

            <!-- Left Column: Acciones Rápidas -->
            <div class="col-span-1 space-y-3">
              <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <div class="w-1 h-4 bg-[#00328b] rounded-full"></div>
                Acciones Rápidas
              </h3>
              <div class="space-y-3">
                <!-- Nuevo Recibo -->
                <button (click)="navigateTo('/recibos')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-all cursor-pointer border-0">
                  <div class="p-3 bg-white/20 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                      <path d="M12 17.5v-11"/>
                    </svg>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="font-bold">Nuevo Recibo</p>
                    <p class="text-xs text-white/70">Generar comprobante</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <!-- Nuevo Paciente -->
                <button (click)="navigateTo('/registro-usuarios')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-[#007BFF] to-[#0056b3] text-white hover:shadow-xl transition-all cursor-pointer border-0">
                  <div class="p-3 bg-white/20 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <line x1="19" x2="19" y1="8" y2="14"/>
                      <line x1="22" x2="16" y1="11" y2="11"/>
                    </svg>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="font-bold">Nuevo Paciente</p>
                    <p class="text-xs text-white/70">Registrar beneficiario</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <!-- Agendar Cita -->
                <button (click)="navigateTo('/citas')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-[#f3ad1c] to-[#ffb84d] text-white hover:shadow-xl transition-all cursor-pointer border-0">
                  <div class="p-3 bg-white/20 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="font-bold">Agendar Cita</p>
                    <p class="text-xs text-white/70">Programar consulta</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <!-- Inventario -->
                <button (click)="navigateTo('/almacen')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-xl transition-all cursor-pointer border-0">
                  <div class="p-3 bg-white/20 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m7.5 4.27 9 5.15"/>
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                      <path d="m3.3 7 8.7 5 8.7-5"/>
                      <path d="M12 22V12"/>
                    </svg>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="font-bold">Inventario</p>
                    <p class="text-xs text-white/70">Gestionar almacén</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <!-- Comodato -->
                <button (click)="navigateTo('/almacen')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-gradient-to-br from-cyan-500 to-cyan-600 text-white hover:shadow-xl transition-all cursor-pointer border-0">
                  <div class="p-3 bg-white/20 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                      <circle cx="20" cy="10" r="2"/>
                    </svg>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="font-bold">Comodato</p>
                    <p class="text-xs text-white/70">Préstamo de equipos</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>

                <!-- Reportes -->
                <button (click)="navigateTo('/reportes')"
                  class="w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg bg-white border-2 border-slate-200 text-slate-700 hover:shadow-xl transition-all cursor-pointer">
                  <div class="p-3 bg-slate-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="m19 9-5 5-4-4-3 3"/>
                    </svg>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="font-bold">Reportes</p>
                    <p class="text-xs text-slate-400">Estadísticas y datos</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Right 2 Columns: Cola de Pacientes -->
            <div class="col-span-2">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  Siguiente en Cola
                </h3>
                <button (click)="navigateTo('/citas')" class="text-xs text-[#00328b] font-bold hover:underline cursor-pointer bg-transparent border-0 flex items-center gap-1">
                  Ver todas
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              <div class="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden">
                <div *ngFor="let paciente of pacientes; let i = index"
                  class="flex items-center gap-4 p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-all"
                  [class.bg-emerald-50]="i === 0">
                  <!-- Avatar -->
                  <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    [ngClass]="paciente.color">
                    {{ paciente.iniciales }}
                  </div>
                  <!-- Time -->
                  <div class="flex flex-col items-center justify-center min-w-[60px]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 mb-1">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span class="text-sm font-bold text-slate-900">{{ paciente.hora }}</span>
                  </div>
                  <!-- Name + Folio -->
                  <div class="flex-1 min-w-0">
                    <p class="font-bold text-slate-900">{{ paciente.nombre + ' ' + paciente.apellido }}</p>
                    <p class="text-xs text-slate-400 font-mono">{{ paciente.folio }}</p>
                  </div>
                  <!-- Type Badge -->
                  <span class="px-3 py-1.5 bg-[#00328b]/10 rounded-lg text-[#00328b] text-xs font-semibold flex-shrink-0">{{ paciente.servicio }}</span>
                  <!-- Atender Button -->
                  <button (click)="atenderAhora(paciente)" [disabled]="paciente.atendiendo" class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all cursor-pointer border-0 flex-shrink-0 whitespace-nowrap disabled:opacity-50">
                    {{ paciente.atendiendo ? 'Atendiendo...' : 'Atender Ahora' }}
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- 4. Actividad del Día -->
          <div class="bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl p-6 text-white shadow-xl">
            <h4 class="text-sm text-[#b9e5fb] font-bold mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                <path d="M12 17.5v-11"/>
              </svg>
              Actividad del Día
            </h4>
            <div class="grid grid-cols-4 gap-4">
              <!-- Cobros -->
              <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div class="flex items-center gap-3 mb-2">
                  <div class="p-2 bg-emerald-500/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2"/>
                      <line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                  </div>
                  <span class="text-xs text-blue-200 font-semibold">Cobros</span>
                </div>
                <p class="text-2xl font-black">{{ statCobros }}</p>
                <p class="text-xs text-blue-200">recibos</p>
              </div>
              <!-- Citas -->
              <div class="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div class="flex items-center gap-3 mb-2">
                  <div class="p-2 bg-amber-500/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" x2="16" y1="2" y2="6"/>
                      <line x1="8" x2="8" y1="2" y2="6"/>
                      <line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  </div>
                  <span class="text-xs text-blue-200 font-semibold">Citas</span>
                </div>
                <p class="text-2xl font-black">{{ statCitas }}</p>
                <p class="text-xs text-blue-200">programadas</p>
              </div>
              <!-- Pendientes -->
              <div class="bg-red-500/20 backdrop-blur rounded-xl p-4 border-2 border-red-400">
                <div class="flex items-center gap-3 mb-2">
                  <div class="p-2 bg-red-500/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                      <line x1="12" x2="12" y1="9" y2="13"/>
                      <line x1="12" x2="12.01" y1="17" y2="17"/>
                    </svg>
                  </div>
                  <span class="text-xs text-red-200 font-semibold">Pendientes</span>
                </div>
                <p class="text-2xl font-black">{{ statPendientes }}</p>
                <p class="text-xs text-red-200">cobros pendientes</p>
              </div>
              <!-- Bajo Stock -->
              <div class="bg-amber-500/20 backdrop-blur rounded-xl p-4 border-2 border-amber-400">
                <div class="flex items-center gap-3 mb-2">
                  <div class="p-2 bg-amber-500/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m7.5 4.27 9 5.15"/>
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                      <path d="m3.3 7 8.7 5 8.7-5"/>
                      <path d="M12 22V12"/>
                    </svg>
                  </div>
                  <span class="text-xs text-amber-200 font-semibold">Bajo Stock</span>
                </div>
                <p class="text-2xl font-black">{{ statBajoStock }}</p>
                <p class="text-xs text-amber-200">productos</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <app-footer></app-footer>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  todayFormatted = '';
  pacientes: any[] = [];

  // Stats
  statCobros = 0;
  statPendientes = 0;
  statCitas = 0;
  statBajoStock = 0;

  // Doctor del día
  doctorNombre = 'Sin doctor asignado';
  doctorEspecialidad = '';
  doctorIniciales = '--';
  doctorAtendidos = 0;
  doctorTotalHoy = 0;
  doctorHorario = '—';

  private colors = [
    'bg-pink-400', 'bg-blue-400', 'bg-purple-400',
    'bg-emerald-400', 'bg-amber-400', 'bg-rose-400',
    'bg-cyan-400', 'bg-indigo-400', 'bg-teal-400',
  ];

  constructor(private router: Router, private api: ApiService) {}

  ngOnInit(): void {
    const today = new Date();
    this.todayFormatted = today.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.todayFormatted = this.todayFormatted.charAt(0).toUpperCase() + this.todayFormatted.slice(1);

    this.loadCitasHoy();
    this.loadRecibosStats();
    this.loadCitasStats();
    this.loadAlmacenStats();
    this.loadDoctor();
  }

  private loadCitasHoy(): void {
    this.api.getCitasHoy().subscribe({
      next: (resp: any) => {
        // Backend returns {fecha, total, programadas, completadas, ..., citas: [...]}
        const citas = resp.citas || resp || [];
        this.doctorTotalHoy = resp.total || citas.length || 0;
        this.doctorAtendidos = resp.completadas || 0;

        this.pacientes = citas
          .filter((c: any) => c.estatus === 'PROGRAMADA')
          .map((cita: any, i: number) => {
            const fullName = cita.nombre_paciente || '';
            const parts = fullName.trim().split(/\s+/);
            const nombre = parts[0] || '';
            const apellido = parts.slice(1).join(' ') || '';
            const iniciales = (nombre.charAt(0) + (apellido.charAt(0) || '')).toUpperCase();
            let hora = '';
            if (cita.fecha_hora) {
              const date = new Date(cita.fecha_hora);
              hora = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
            }
            const servicio = cita.servicios?.[0]?.nombre || 'Consulta';
            return {
              idCita: cita.id_cita,
              nombre,
              apellido,
              folio: cita.folio_paciente || '',
              hora,
              iniciales,
              servicio,
              color: this.colors[i % this.colors.length],
              atendiendo: false,
            };
          });
      },
      error: () => {
        this.pacientes = [];
      },
    });
  }

  private loadRecibosStats(): void {
    this.api.getRecibosStats().subscribe({
      next: (stats: any) => {
        this.statCobros = stats.total_hoy ?? stats.total ?? 0;
        this.statPendientes = stats.pendientes ?? 0;
      },
      error: () => {
        this.statCobros = 0;
        this.statPendientes = 0;
      },
    });
  }

  private loadCitasStats(): void {
    this.api.getCitasStats().subscribe({
      next: (stats: any) => {
        this.statCitas = stats.total_hoy ?? stats.total ?? 0;
      },
      error: () => {
        this.statCitas = 0;
      },
    });
  }

  private loadAlmacenStats(): void {
    this.api.getAlmacenStats().subscribe({
      next: (stats: any) => {
        this.statBajoStock = stats.bajo_stock ?? stats.productos_bajo_stock ?? 0;
      },
      error: () => {
        this.statBajoStock = 0;
      },
    });
  }

  private loadDoctor(): void {
    this.api.getDoctorHoy().subscribe({
      next: (resp: any) => {
        const doctor = resp.doctor;
        if (doctor) {
          const nombre = doctor.nombre || '';
          const apellido = doctor.apellido_paterno || '';
          this.doctorNombre = `Dr. ${nombre} ${apellido}`.trim();
          this.doctorEspecialidad = doctor.especialidad || '';
          this.doctorIniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
          // Parse horario from timestamps
          const formatTime = (ts: string) => {
            if (!ts) return '';
            const d = new Date(ts);
            return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
          };
          const inicio = formatTime(resp.hora_inicio);
          const fin = formatTime(resp.hora_fin);
          this.doctorHorario = inicio && fin ? `${inicio} - ${fin}` : '—';
        }
      },
      error: () => {
        // Keep defaults
      },
    });
  }

  atenderAhora(paciente: any): void {
    if (!paciente.idCita) return;
    paciente.atendiendo = true;
    this.api.completarCita(paciente.idCita).subscribe({
      next: () => {
        // Remove from queue
        this.pacientes = this.pacientes.filter(p => p.idCita !== paciente.idCita);
        this.doctorAtendidos++;
      },
      error: () => {
        paciente.atendiendo = false;
      },
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
