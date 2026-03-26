import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';

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
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  curp: string;
  tipoEspinaBifida: string;
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
                  placeholder="Buscar por nombre, folio, CURP o membresía..."
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
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Folio</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Espina</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cuota</th>
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membresía</th>
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
                  <td class="px-6 py-4 text-sm text-slate-600">{{ b.tiposEspina[0]?.nombre || 'N/A' }}</td>
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
                  <th class="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Espina Bífida</th>
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
                  <td class="px-6 py-4 text-sm text-slate-600">{{ p.tipoEspinaBifida }}</td>
                  <td class="px-6 py-4">
                    <span [class]="getCuotaBadgeClass(p.tipoCuota)">Cuota {{ p.tipoCuota }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">{{ p.fechaSolicitud }}</td>
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
    {
      idPaciente: 1, folio: 'BEN-000001', nombre: 'María', apellidoPaterno: 'González', apellidoMaterno: 'López',
      genero: 'F', fechaNacimiento: '2014-03-15', curp: 'GOLM140315MDFLPR01',
      nombrePadreMadre: 'Laura López Martínez', direccion: 'Av. Insurgentes Sur 1234', colonia: 'Del Valle',
      ciudad: 'Ciudad de México', estado: 'Ciudad de México', codigoPostal: '03100',
      telefonoCasa: '5555123456', telefonoCelular: '5512345678', correoElectronico: 'laura.lopez@email.com',
      enEmergenciaAvisarA: 'Carlos González Ruiz', telefonoEmergencia: '5598765432',
      municipioNacimiento: 'Benito Juárez', estadoNacimiento: 'Ciudad de México',
      hospitalNacimiento: 'Hospital General de México', tipoSangre: 'O+', usaValvula: 'S',
      notasAdicionales: 'Requiere seguimiento neurológico trimestral', fechaAlta: '15/01/2025',
      membresiaEstatus: 'ACTIVO', tipoCuota: 'A', activo: 'S',
      tiposEspina: [{idTipoEspina: 1, nombre: 'Mielomeningocele'}],
      iniciales: 'MG', color: 'bg-pink-400'
    },
    {
      idPaciente: 2, folio: 'BEN-000002', nombre: 'Juan Carlos', apellidoPaterno: 'Martínez', apellidoMaterno: 'Pérez',
      genero: 'M', fechaNacimiento: '2017-07-22', curp: 'MAPJ170722HDFRRS02',
      nombrePadreMadre: 'Rosa Pérez Hernández', direccion: 'Calle Morelos 567', colonia: 'Centro',
      ciudad: 'Guadalajara', estado: 'Jalisco', codigoPostal: '44100',
      telefonoCasa: '3331234567', telefonoCelular: '3345678901', correoElectronico: 'rosa.perez@email.com',
      enEmergenciaAvisarA: 'Miguel Martínez Díaz', telefonoEmergencia: '3356789012',
      municipioNacimiento: 'Guadalajara', estadoNacimiento: 'Jalisco',
      hospitalNacimiento: 'Hospital Civil de Guadalajara', tipoSangre: 'A+', usaValvula: 'N',
      notasAdicionales: '', fechaAlta: '22/01/2025',
      membresiaEstatus: 'ACTIVO', tipoCuota: 'B', activo: 'S',
      tiposEspina: [{idTipoEspina: 2, nombre: 'Meningocele'}],
      iniciales: 'JM', color: 'bg-blue-400'
    },
    {
      idPaciente: 3, folio: 'BEN-000003', nombre: 'Ana Patricia', apellidoPaterno: 'Rodríguez', apellidoMaterno: 'Hernández',
      genero: 'F', fechaNacimiento: '2010-11-05', curp: 'ROHA101105MDFDRN03',
      nombrePadreMadre: 'Patricia Hernández Flores', direccion: 'Blvd. Adolfo López Mateos 890', colonia: 'Lindavista',
      ciudad: 'Monterrey', estado: 'Nuevo León', codigoPostal: '64000',
      telefonoCasa: '8187654321', telefonoCelular: '8112349876', correoElectronico: 'patricia.hdez@email.com',
      enEmergenciaAvisarA: 'Fernando Rodríguez Soto', telefonoEmergencia: '8198761234',
      municipioNacimiento: 'Monterrey', estadoNacimiento: 'Nuevo León',
      hospitalNacimiento: 'Hospital Universitario de Nuevo León', tipoSangre: 'B+', usaValvula: 'S',
      notasAdicionales: 'Alérgica a penicilina', fechaAlta: '10/12/2024',
      membresiaEstatus: 'VENCIDO', tipoCuota: 'A', activo: 'S',
      tiposEspina: [{idTipoEspina: 3, nombre: 'Espina bífida oculta'}],
      iniciales: 'AR', color: 'bg-purple-400'
    },
    {
      idPaciente: 4, folio: 'BEN-000004', nombre: 'Diego', apellidoPaterno: 'Ramírez', apellidoMaterno: 'Torres',
      genero: 'M', fechaNacimiento: '2016-01-30', curp: 'RATD160130HDFMRG04',
      nombrePadreMadre: 'Gabriela Torres Vega', direccion: 'Calle 5 de Febrero 321', colonia: 'Constitución',
      ciudad: 'Puebla', estado: 'Puebla', codigoPostal: '72000',
      telefonoCasa: '2221234567', telefonoCelular: '2229876543', correoElectronico: 'gabriela.torres@email.com',
      enEmergenciaAvisarA: 'Alejandro Ramírez Mora', telefonoEmergencia: '2225678901',
      municipioNacimiento: 'Puebla', estadoNacimiento: 'Puebla',
      hospitalNacimiento: 'Hospital General de Puebla', tipoSangre: 'AB+', usaValvula: 'S',
      notasAdicionales: 'Rehabilitación física dos veces por semana', fechaAlta: '05/02/2025',
      membresiaEstatus: 'ACTIVO', tipoCuota: 'A', activo: 'S',
      tiposEspina: [{idTipoEspina: 1, nombre: 'Mielomeningocele'}],
      iniciales: 'DR', color: 'bg-green-400'
    },
    {
      idPaciente: 5, folio: 'BEN-000005', nombre: 'Sofía', apellidoPaterno: 'Hernández', apellidoMaterno: 'Díaz',
      genero: 'F', fechaNacimiento: '2019-06-12', curp: 'HEDS190612MDFRFZ05',
      nombrePadreMadre: 'Claudia Díaz Mendoza', direccion: 'Av. Universidad 456', colonia: 'Narvarte',
      ciudad: 'Ciudad de México', estado: 'Ciudad de México', codigoPostal: '03020',
      telefonoCasa: '5556789012', telefonoCelular: '5543218765', correoElectronico: 'claudia.diaz@email.com',
      enEmergenciaAvisarA: 'Jorge Hernández Luna', telefonoEmergencia: '5587654321',
      municipioNacimiento: 'Coyoacán', estadoNacimiento: 'Ciudad de México',
      hospitalNacimiento: 'Instituto Nacional de Pediatría', tipoSangre: 'O-', usaValvula: 'N',
      notasAdicionales: '', fechaAlta: '18/03/2025',
      membresiaEstatus: 'ACTIVO', tipoCuota: 'B', activo: 'S',
      tiposEspina: [{idTipoEspina: 4, nombre: 'Lipomielomeningocele'}],
      iniciales: 'SH', color: 'bg-rose-400'
    },
    {
      idPaciente: 6, folio: 'BEN-000006', nombre: 'Carlos Eduardo', apellidoPaterno: 'López', apellidoMaterno: 'García',
      genero: 'M', fechaNacimiento: '2012-09-08', curp: 'LOGC120908HDFPRC06',
      nombrePadreMadre: 'María García Olvera', direccion: 'Calle Hidalgo 789', colonia: 'San Ángel',
      ciudad: 'Querétaro', estado: 'Querétaro', codigoPostal: '76000',
      telefonoCasa: '4421234567', telefonoCelular: '4429871234', correoElectronico: 'maria.garcia@email.com',
      enEmergenciaAvisarA: 'Eduardo López Castillo', telefonoEmergencia: '4425671234',
      municipioNacimiento: 'Querétaro', estadoNacimiento: 'Querétaro',
      hospitalNacimiento: 'Hospital General de Querétaro', tipoSangre: 'A-', usaValvula: 'S',
      notasAdicionales: 'Control urológico semestral', fechaAlta: '02/11/2024',
      membresiaEstatus: 'SUSPENDIDO', tipoCuota: 'A', activo: 'N',
      tiposEspina: [{idTipoEspina: 2, nombre: 'Meningocele'}, {idTipoEspina: 3, nombre: 'Espina bífida oculta'}],
      iniciales: 'CL', color: 'bg-indigo-400'
    }
  ];

  preregistros: Preregistro[] = [
    {
      id: 101, nombre: 'Roberto', apellidoPaterno: 'Sánchez', apellidoMaterno: 'Cruz',
      fechaNacimiento: '2016-05-20', curp: 'SACR160520HDFNRB01',
      tipoEspinaBifida: 'Mielomeningocele', nombrePadreMadre: 'Elena Cruz Vargas',
      tipoCuota: 'A', fechaSolicitud: '01/03/2025', estatus: 'PENDIENTE',
      iniciales: 'RS', color: 'bg-orange-400'
    },
    {
      id: 102, nombre: 'Elena', apellidoPaterno: 'Torres', apellidoMaterno: 'Ramírez',
      fechaNacimiento: '2014-08-14', curp: 'TORE140814MDFRML02',
      tipoEspinaBifida: 'Espina bífida oculta', nombrePadreMadre: 'Guadalupe Ramírez Solís',
      tipoCuota: 'B', fechaSolicitud: '28/02/2025', estatus: 'PENDIENTE',
      iniciales: 'ET', color: 'bg-teal-400'
    },
    {
      id: 103, nombre: 'Fernando', apellidoPaterno: 'López', apellidoMaterno: 'García',
      fechaNacimiento: '2018-12-03', curp: 'LOGF181203HDFPRC03',
      tipoEspinaBifida: 'Meningocele', nombrePadreMadre: 'Isabel García Navarro',
      tipoCuota: 'A', fechaSolicitud: '25/02/2025', estatus: 'PENDIENTE',
      iniciales: 'FL', color: 'bg-indigo-400'
    }
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
