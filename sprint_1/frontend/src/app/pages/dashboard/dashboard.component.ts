import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
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

          <!-- Loading Skeleton -->
          <div *ngIf="loading" class="space-y-6">
            <div class="animate-pulse">
              <div class="h-36 bg-slate-200 rounded-2xl"></div>
            </div>
            <div class="animate-pulse grid grid-cols-3 gap-6">
              <div class="col-span-1 space-y-3">
                <div *ngFor="let _ of [1,2,3]" class="h-20 bg-slate-200 rounded-2xl"></div>
              </div>
              <div class="col-span-2 space-y-3">
                <div class="h-44 bg-slate-200 rounded-2xl"></div>
                <div class="h-44 bg-slate-200 rounded-2xl"></div>
              </div>
            </div>
          </div>

          <!-- 2. Doctor del Día -->
          <div *ngIf="!loading" class="bg-gradient-to-br from-[#007BFF] to-[#0056b3] rounded-2xl shadow-2xl overflow-hidden">
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
          <div *ngIf="!loading" class="grid grid-cols-3 gap-6">

            <!-- Left Column: Acciones Rápidas -->
            <div class="col-span-1 space-y-3">
              <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <div class="w-1 h-4 bg-[#00328b] rounded-full"></div>
                Acciones Rápidas
              </h3>
              <div class="space-y-3">
                <!-- Pre-registro -->
                <button (click)="navigateTo('/preregistro')"
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
                    <p class="font-bold">Pre-Registro</p>
                    <p class="text-xs text-white/70">Formulario de solicitud</p>
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

                <!-- (Reportes, Beneficiarios, Citas y Recibos disponibles en sprints posteriores) -->
              </div>
            </div>

            <!-- Right 2 Columns: Cola de Pacientes -->
            <div class="col-span-2">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  Siguiente en Cola
                </h3>
                <button class="text-xs text-slate-400 font-bold bg-transparent border-0 flex items-center gap-1">
                  Citas del dia
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

          <!-- 4. Panorama General — fusiona KPIs + Actividad + Resumen (RF-D-01..06) -->
          <div *ngIf="!loading" class="grid grid-cols-3 gap-6">

            <!-- Panel Izquierdo: Pulso del Día -->
            <div class="col-span-2 bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-6">
              <h4 class="text-sm font-bold text-slate-700 flex items-center gap-2 mb-5">
                <div class="w-1 h-4 bg-[#00328b] rounded-full"></div>
                Pulso del D&iacute;a
              </h4>
              <div class="grid grid-cols-3 gap-4">
                <!-- Beneficiarios Activos -->
                <div class="flex items-center gap-4 p-4 bg-blue-50/60 rounded-xl">
                  <div class="p-2.5 bg-blue-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-black text-slate-900">{{ statBeneficiariosActivos }}</p>
                    <p class="text-xs text-slate-500 font-semibold">Beneficiarios</p>
                    <p class="text-[11px] mt-0.5" [ngClass]="deltaBeneficiarios >= 0 ? 'text-emerald-600' : 'text-red-500'">
                      <span *ngIf="deltaBeneficiarios > 0">+{{ deltaBeneficiarios }}</span><span *ngIf="deltaBeneficiarios === 0">=</span><span *ngIf="deltaBeneficiarios < 0">{{ deltaBeneficiarios }}</span>
                      <span class="text-slate-400 ml-0.5">vs sem. ant.</span>
                    </p>
                  </div>
                </div>
                <!-- Citas Hoy -->
                <div class="flex items-center gap-4 p-4 bg-amber-50/60 rounded-xl">
                  <div class="p-2.5 bg-amber-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-black text-slate-900">{{ statCitas }}</p>
                    <p class="text-xs text-slate-500 font-semibold">Citas Hoy</p>
                    <p class="text-[11px] mt-0.5" [ngClass]="deltaCitas >= 0 ? 'text-emerald-600' : 'text-red-500'">
                      <span *ngIf="deltaCitas > 0">+{{ deltaCitas }}</span><span *ngIf="deltaCitas === 0">=</span><span *ngIf="deltaCitas < 0">{{ deltaCitas }}</span>
                      <span class="text-slate-400 ml-0.5">vs ayer</span>
                    </p>
                  </div>
                </div>
                <!-- Cobros Hoy -->
                <div class="flex items-center gap-4 p-4 bg-emerald-50/60 rounded-xl">
                  <div class="p-2.5 bg-emerald-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-black text-slate-900">{{ statCobros }}</p>
                    <p class="text-xs text-slate-500 font-semibold">Cobros Hoy</p>
                    <p class="text-[11px] mt-0.5" [ngClass]="deltaRecibos >= 0 ? 'text-emerald-600' : 'text-red-500'">
                      <span *ngIf="deltaRecibos > 0">+{{ deltaRecibos }}</span><span *ngIf="deltaRecibos === 0">=</span><span *ngIf="deltaRecibos < 0">{{ deltaRecibos }}</span>
                      <span class="text-slate-400 ml-0.5">vs ayer</span>
                    </p>
                  </div>
                </div>
                <!-- Pendientes -->
                <div class="flex items-center gap-4 p-4 rounded-xl" [ngClass]="statPendientes > 0 ? 'bg-red-50 border border-red-200' : 'bg-slate-50'">
                  <div class="p-2.5 rounded-xl" [ngClass]="statPendientes > 0 ? 'bg-red-100' : 'bg-slate-200'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" [attr.stroke]="statPendientes > 0 ? '#ef4444' : '#94a3b8'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-black" [ngClass]="statPendientes > 0 ? 'text-red-600' : 'text-slate-900'">{{ statPendientes }}</p>
                    <p class="text-xs font-semibold" [ngClass]="statPendientes > 0 ? 'text-red-500' : 'text-slate-500'">Pendientes</p>
                  </div>
                </div>
                <!-- Comodatos Activos -->
                <div class="flex items-center gap-4 p-4 bg-cyan-50/60 rounded-xl">
                  <div class="p-2.5 bg-cyan-100 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-black text-slate-900">{{ statComodatosActivos }}</p>
                    <p class="text-xs text-slate-500 font-semibold">Comodatos</p>
                  </div>
                </div>
                <!-- Alertas Inventario -->
                <div class="flex items-center gap-4 p-4 rounded-xl" [ngClass]="statBajoStock > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'">
                  <div class="p-2.5 rounded-xl" [ngClass]="statBajoStock > 0 ? 'bg-amber-100' : 'bg-slate-200'">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" [attr.stroke]="statBajoStock > 0 ? '#f59e0b' : '#94a3b8'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-2xl font-black" [ngClass]="statBajoStock > 0 ? 'text-amber-600' : 'text-slate-900'">{{ statBajoStock }}</p>
                    <p class="text-xs font-semibold" [ngClass]="statBajoStock > 0 ? 'text-amber-500' : 'text-slate-500'">Alertas Inv.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Panel Derecho: Tendencia Semanal -->
            <div class="col-span-1 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl shadow-xl p-6 text-white">
              <div class="flex items-center justify-between mb-5">
                <h4 class="text-sm font-bold text-blue-200 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                  Semana
                </h4>
                <span class="text-[11px] text-blue-300">{{ resumenSemanaLabel }}</span>
              </div>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-blue-300"></div>
                    <span class="text-sm text-blue-100">Nuevos Benef.</span>
                  </div>
                  <span class="text-lg font-black">{{ resumenNuevosBeneficiarios }}</span>
                </div>
                <div class="border-t border-white/10"></div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span class="text-sm text-blue-100">Citas Completadas</span>
                  </div>
                  <span class="text-lg font-black">{{ resumenCitasCompletadas }}</span>
                </div>
                <div class="border-t border-white/10"></div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span class="text-sm text-blue-100">Recibos</span>
                  </div>
                  <span class="text-lg font-black">{{ resumenRecibosGenerados }}</span>
                </div>
                <div class="border-t border-white/10"></div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span class="text-sm text-blue-100">Recaudado</span>
                  </div>
                  <span class="text-lg font-black">\${{ resumenMontoRecaudado | number:'1.0-0' }}</span>
                </div>
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
  loading = true;
  todayFormatted = '';
  pacientes: any[] = [];

  // Stats
  statCobros = 0;
  statPendientes = 0;
  statCitas = 0;
  statBajoStock = 0;
  statBeneficiariosActivos = 0;
  statComodatosActivos = 0;

  // RF-D-06: Deltas de comparación
  deltaBeneficiarios = 0;
  deltaCitas = 0;
  deltaRecibos = 0;

  // Resumen semanal (RF-D-05)
  resumenSemanaLabel = '';
  resumenNuevosBeneficiarios = 0;
  resumenCitasCompletadas = 0;
  resumenRecibosGenerados = 0;
  resumenMontoRecaudado = 0;

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

    // Fire all API calls in parallel; mark loading=false when all complete
    forkJoin({
      citasHoy: this.api.getCitasHoy(),
      recibosStats: this.api.getRecibosStats(),
      citasStats: this.api.getCitasStats(),
      almacenStats: this.api.getAlmacenStats(),
      doctor: this.api.getDoctorHoy(),
      benefStats: this.api.getDashboardStats(),
      resumen: this.api.getReporteConsolidadoMensual(today.getMonth() + 1, today.getFullYear()),
    }).subscribe({
      next: (res) => {
        this.processCitasHoy(res.citasHoy);
        this.processRecibosStats(res.recibosStats);
        this.processCitasStats(res.citasStats);
        this.processAlmacenStats(res.almacenStats);
        this.processDoctor(res.doctor);
        this.processBenefStats(res.benefStats);
        this.processResumen(res.resumen);
        this.loading = false;
      },
      error: () => {
        // Even if some fail, show what we have
        this.loading = false;
      },
    });

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    this.resumenSemanaLabel = `${startOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} - ${endOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`;
  }

  private processCitasHoy(resp: any): void {
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
  }

  private processRecibosStats(stats: any): void {
    this.statCobros = stats.total_hoy ?? stats.total ?? 0;
    this.statPendientes = stats.pendientes ?? 0;
    const ayer = stats.total_ayer ?? 0;
    this.deltaRecibos = this.statCobros - ayer;
  }

  private processCitasStats(stats: any): void {
    this.statCitas = stats.total_hoy ?? stats.total ?? 0;
    const ayer = stats.total_ayer ?? 0;
    this.deltaCitas = this.statCitas - ayer;
  }

  private processAlmacenStats(stats: any): void {
    this.statBajoStock = (stats.alertas_stock_bajo ?? 0) + (stats.alertas_caducidad ?? 0);
    this.statComodatosActivos = stats.comodatos_activos ?? 0;
  }

  private processBenefStats(stats: any): void {
    this.statBeneficiariosActivos = stats.activos ?? stats.total ?? 0;
    const estaSemana = stats.nuevos_esta_semana ?? 0;
    const semanaAnt = stats.nuevos_semana_anterior ?? 0;
    this.deltaBeneficiarios = estaSemana - semanaAnt;
  }

  private processResumen(data: any): void {
    this.resumenNuevosBeneficiarios = data.pacientes_atendidos ?? 0;
    this.resumenCitasCompletadas = data.citas_por_estatus?.COMPLETADA ?? 0;
    this.resumenRecibosGenerados = data.total_ventas ?? 0;
    this.resumenMontoRecaudado = data.monto_ventas ?? 0;
  }

  private processDoctor(resp: any): void {
    const doctor = resp.doctor;
    if (doctor) {
      const nombre = doctor.nombre || '';
      const apellido = doctor.apellido_paterno || '';
      this.doctorNombre = `Dr. ${nombre} ${apellido}`.trim();
      this.doctorEspecialidad = doctor.especialidad || '';
      this.doctorIniciales = (nombre.charAt(0) + apellido.charAt(0)).toUpperCase();
      const formatTime = (ts: string) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
      };
      const inicio = formatTime(resp.hora_inicio);
      const fin = formatTime(resp.hora_fin);
      this.doctorHorario = inicio && fin ? `${inicio} - ${fin}` : '—';
    }
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
