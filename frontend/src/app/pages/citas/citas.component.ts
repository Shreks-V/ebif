import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

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
              <button class="px-4 py-2 bg-[#00328b] text-white text-sm font-semibold rounded-lg hover:bg-[#002a75] transition-colors flex items-center gap-2">
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

              <!-- Estado filters -->
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
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        Hora
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
                    <td class="px-6 py-4 font-medium text-slate-900">{{ getHora(cita.fechaHora) }}</td>
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
                      <button class="p-1.5 text-slate-400 hover:text-[#00328b] hover:bg-slate-100 rounded-lg transition-colors">
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
              <button class="px-4 py-2 bg-[#00328b] text-white text-sm font-semibold rounded-lg hover:bg-[#002a75] transition-colors flex items-center gap-2">
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
                      <button class="p-1.5 text-slate-400 hover:text-[#00328b] hover:bg-slate-100 rounded-lg transition-colors">
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
  `
})
export class CitasComponent {
  activeTab: 'citas' | 'medicos' = 'citas';

  searchCitas = '';
  searchMedicos = '';
  filtroEstado = 'Todas';
  filtroTipo = 'Todas';

  estadoFilters = ['Todas', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'];
  tipoFilters = ['Todas', 'Consulta Neurocirugía', 'Consulta Ortopédica', 'Consulta Urológica', 'Fisioterapia', 'Terapia Ocupacional'];

  citas = [
    { idCita: 1, idPaciente: 1, nombrePaciente: 'María Fernanda García López', folioPaciente: 'BEN-000001', fechaHora: '2026-03-25T09:00:00', estatus: 'COMPLETADA', notas: 'Revisión postquirúrgica', servicios: [{idServicio: 1, nombre: 'Consulta Neurocirugía', cantidad: 1, montoPagado: 350}] },
    { idCita: 2, idPaciente: 2, nombrePaciente: 'Carlos Eduardo Martínez Reyes', folioPaciente: 'BEN-000002', fechaHora: '2026-03-25T10:30:00', estatus: 'EN_CURSO', notas: 'Terapia física semanal', servicios: [{idServicio: 4, nombre: 'Fisioterapia', cantidad: 1, montoPagado: 200}] },
    { idCita: 3, idPaciente: 3, nombrePaciente: 'Sofía Rodríguez Hernández', folioPaciente: 'BEN-000003', fechaHora: '2026-03-25T11:00:00', estatus: 'PROGRAMADA', notas: '', servicios: [{idServicio: 2, nombre: 'Consulta Ortopédica', cantidad: 1, montoPagado: 300}] },
    { idCita: 4, idPaciente: 4, nombrePaciente: 'Diego Alejandro Treviño Garza', folioPaciente: 'BEN-000004', fechaHora: '2026-03-25T14:00:00', estatus: 'PROGRAMADA', notas: 'Seguimiento válvula', servicios: [{idServicio: 3, nombre: 'Consulta Urológica', cantidad: 1, montoPagado: 300}] },
    { idCita: 5, idPaciente: 5, nombrePaciente: 'Valentina Flores Mendoza', folioPaciente: 'BEN-000005', fechaHora: '2026-03-25T15:30:00', estatus: 'CANCELADA', notas: 'Paciente canceló', servicios: [{idServicio: 6, nombre: 'Terapia Ocupacional', cantidad: 1, montoPagado: 250}] },
  ];

  citasFiltradas = [...this.citas];

  medicos = [
    { idDoctor: 1, nombre: 'Alejandro', apellidoPaterno: 'Cavazos', apellidoMaterno: 'Garza', especialidad: 'Ortopedia', telefono: '8181234567', correo: 'a.cavazos@espinabifida.org', activo: 'S', servicios: [{idServicio: 1, nombre: 'Consulta Ortopédica'}], iniciales: 'AC' },
    { idDoctor: 2, nombre: 'Patricia', apellidoPaterno: 'Elizondo', apellidoMaterno: 'Leal', especialidad: 'Neurología', telefono: '8182345678', correo: 'p.elizondo@espinabifida.org', activo: 'S', servicios: [{idServicio: 2, nombre: 'Consulta Neurológica'}], iniciales: 'PE' },
    { idDoctor: 3, nombre: 'Ricardo', apellidoPaterno: 'Mendoza', apellidoMaterno: 'Treviño', especialidad: 'Urología', telefono: '8183456789', correo: 'r.mendoza@espinabifida.org', activo: 'S', servicios: [{idServicio: 3, nombre: 'Consulta Urológica'}], iniciales: 'RM' },
    { idDoctor: 4, nombre: 'Laura', apellidoPaterno: 'Garza', apellidoMaterno: 'Salinas', especialidad: 'Fisioterapia', telefono: '8184567890', correo: 'l.garza@espinabifida.org', activo: 'S', servicios: [{idServicio: 4, nombre: 'Fisioterapia'}], iniciales: 'LG' },
    { idDoctor: 5, nombre: 'Fernando', apellidoPaterno: 'Villarreal', apellidoMaterno: 'Cantú', especialidad: 'Pediatría', telefono: '8185678901', correo: 'f.villarreal@espinabifida.org', activo: 'S', servicios: [{idServicio: 5, nombre: 'Consulta Pediátrica'}], iniciales: 'FV' },
  ];

  medicosFiltrados = [...this.medicos];

  getHora(fechaHora: string): string {
    return fechaHora.split('T')[1]?.substring(0, 5) || '';
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

    if (this.filtroEstado !== 'Todas') {
      resultado = resultado.filter(c => c.estatus === this.filtroEstado);
    }

    if (this.filtroTipo !== 'Todas') {
      resultado = resultado.filter(c =>
        c.servicios.some(s => s.nombre === this.filtroTipo)
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
}
