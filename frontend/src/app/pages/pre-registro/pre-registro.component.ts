import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-pre-registro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-[#b9e5fb] via-white to-[#e0f2ff] py-8 px-4">
      <div class="max-w-4xl mx-auto">

        <!-- Back button -->
        <button (click)="router.navigate(['/'])" class="flex items-center gap-2 text-slate-600 hover:text-[#00328b] mb-6 font-semibold transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          Volver al inicio
        </button>

        <!-- Header -->
        <div class="flex items-center gap-4 mb-8">
          <div class="w-14 h-14 bg-gradient-to-br from-[#00328b] to-[#0052cc] rounded-2xl flex items-center justify-center shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          </div>
          <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">Pre-registro de Beneficiario</h1>
            <p class="text-slate-600 font-semibold">Completa el formulario para solicitar tu registro</p>
          </div>
        </div>

        <!-- Success Screen -->
        <div *ngIf="submitted" class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-12 text-center">
          <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 class="text-3xl font-black text-slate-900 mb-3">¡Pre-registro Enviado!</h2>
          <p class="text-slate-600 text-lg mb-8 max-w-md mx-auto">Tu solicitud ha sido recibida. Un administrador revisará tu información y te contactará pronto.</p>
          <button (click)="router.navigate(['/'])" class="px-8 py-3 bg-[#00328b] hover:bg-[#00246d] text-white rounded-2xl font-bold shadow-lg transition-all">
            Volver al Inicio
          </button>
        </div>

        <!-- Form -->
        <div *ngIf="!submitted">
          <!-- Progress Steps -->
          <div class="flex items-center justify-between mb-8 px-4">
            <ng-container *ngFor="let s of steps; let i = index">
              <div class="flex flex-col items-center" [class.flex-1]="true">
                <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all"
                     [ngClass]="{
                       'bg-emerald-500 text-white': currentStep > i + 1,
                       'bg-[#00328b] text-white shadow-lg scale-110': currentStep === i + 1,
                       'bg-slate-200 text-slate-500': currentStep < i + 1
                     }">
                  <svg *ngIf="currentStep > i + 1" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span *ngIf="currentStep <= i + 1">{{ i + 1 }}</span>
                </div>
                <span class="text-xs font-semibold mt-2 text-center" [ngClass]="currentStep >= i + 1 ? 'text-[#00328b]' : 'text-slate-400'">{{ s }}</span>
              </div>
              <div *ngIf="i < steps.length - 1" class="flex-1 h-1 rounded-full mx-2 mt-[-20px]"
                   [ngClass]="currentStep > i + 1 ? 'bg-emerald-400' : 'bg-slate-200'"></div>
            </ng-container>
          </div>

          <!-- Step Content Card -->
          <div class="bg-white rounded-3xl shadow-xl border-2 border-slate-100 p-8">

            <!-- Step 1: Datos Personales -->
            <div *ngIf="currentStep === 1">
              <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Datos Personales
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Nombre <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.nombre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all" placeholder="Nombre(s)">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Apellido Paterno <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.apellidoPaterno" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Apellido Materno <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.apellidoMaterno" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento <span class="text-red-500">*</span></label>
                  <input type="date" [(ngModel)]="formData.fechaNacimiento" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Sexo <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="formData.sexo" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all bg-white">
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">CURP <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.curp" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all uppercase" maxlength="18" placeholder="18 caracteres">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Nombre del Padre/Madre <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.nombrePadreMadre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Fotografía</label>
                  <div class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#00328b] transition-colors cursor-pointer" (click)="fileInput.click()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <p class="text-sm text-slate-500 font-semibold" *ngIf="!fotografiaName">Haz clic para subir una fotografía</p>
                    <p class="text-sm text-emerald-600 font-bold" *ngIf="fotografiaName">{{ fotografiaName }}</p>
                    <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFileSelected($event)">
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 2: Dirección -->
            <div *ngIf="currentStep === 2">
              <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Dirección
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Calle <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.calle" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Número Exterior <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.numeroExterior" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Número Interior</label>
                  <input type="text" [(ngModel)]="formData.numeroInterior" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Colonia <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.colonia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Municipio <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.municipio" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Ciudad <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.ciudad" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Estado <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="formData.estado" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all bg-white">
                    <option value="">Seleccionar...</option>
                    <option *ngFor="let e of estados" [value]="e">{{ e }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Código Postal <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.codigoPostal" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all" maxlength="5">
                </div>
              </div>
            </div>

            <!-- Step 3: Contacto y Emergencia -->
            <div *ngIf="currentStep === 3">
              <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Contacto y Emergencia
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Teléfono Casa</label>
                  <input type="tel" [(ngModel)]="formData.telefonoCasa" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Teléfono Celular <span class="text-red-500">*</span></label>
                  <input type="tel" [(ngModel)]="formData.telefonoCelular" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input type="email" [(ngModel)]="formData.correoElectronico" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>

                <div class="md:col-span-2 border-t-2 border-slate-100 pt-5 mt-2">
                  <h3 class="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                    Contacto de Emergencia
                  </h3>
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">En Emergencia Avisar a <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="formData.enEmergenciaAvisarA" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Teléfono de Emergencia <span class="text-red-500">*</span></label>
                  <input type="tel" [(ngModel)]="formData.telefonoEmergencia" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                </div>

                <div class="md:col-span-2 mt-4">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="formData.requiereTutor" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]">
                    <span class="text-sm font-bold text-slate-700">¿Requiere tutor?</span>
                  </label>
                </div>

                <ng-container *ngIf="formData.requiereTutor">
                  <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Nombre del Tutor <span class="text-red-500">*</span></label>
                    <input type="text" [(ngModel)]="formData.nombreTutor" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                  </div>
                  <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Teléfono del Tutor <span class="text-red-500">*</span></label>
                    <input type="tel" [(ngModel)]="formData.telefonoTutor" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all">
                  </div>
                  <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Relación con el beneficiario <span class="text-red-500">*</span></label>
                    <input type="text" [(ngModel)]="formData.relacionTutor" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all" placeholder="Ej: Padre, Madre, Tío...">
                  </div>
                </ng-container>
              </div>
            </div>

            <!-- Step 4: Información Médica -->
            <div *ngIf="currentStep === 4">
              <h2 class="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00328b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Información Médica
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Tipo de Sangre <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="formData.tipoSangre" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all bg-white">
                    <option value="">Seleccionar...</option>
                    <option *ngFor="let t of tiposSangre" [value]="t">{{ t }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-bold text-slate-700 mb-1">Tipo de Espina Bífida <span class="text-red-500">*</span></label>
                  <select [(ngModel)]="formData.tipoEspinaBifida" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all bg-white">
                    <option value="">Seleccionar...</option>
                    <option *ngFor="let t of tiposEspinaBifida" [value]="t">{{ t }}</option>
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="formData.usaValvula" class="w-5 h-5 rounded border-2 border-slate-300 text-[#00328b] focus:ring-[#00328b]">
                    <span class="text-sm font-bold text-slate-700">¿Usa válvula?</span>
                  </label>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Alergias</label>
                  <textarea [(ngModel)]="formData.alergias" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all resize-none" placeholder="Describe alergias conocidas..."></textarea>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Medicamentos Actuales</label>
                  <textarea [(ngModel)]="formData.medicamentosActuales" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all resize-none" placeholder="Lista de medicamentos que toma actualmente..."></textarea>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-bold text-slate-700 mb-1">Notas Adicionales</label>
                  <textarea [(ngModel)]="formData.notasAdicionales" rows="3" class="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-[#00328b] focus:ring-4 focus:ring-[#00328b]/10 transition-all resize-none" placeholder="Información adicional relevante..."></textarea>
                </div>
              </div>
            </div>

            <!-- Navigation Buttons -->
            <div class="flex justify-between mt-8 pt-6 border-t-2 border-slate-100">
              <button *ngIf="currentStep > 1" (click)="prevStep()"
                      class="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                Anterior
              </button>
              <div *ngIf="currentStep === 1"></div>

              <button *ngIf="currentStep < 4" (click)="nextStep()"
                      class="px-8 py-3 bg-[#00328b] hover:bg-[#00246d] text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                Siguiente
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>

              <button *ngIf="currentStep === 4" (click)="submitForm()"
                      class="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Enviar Pre-registro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PreRegistroComponent {
  router = inject(Router);
  private api = inject(ApiService);
  currentStep = 1;
  submitted = false;
  fotografiaName = '';

  steps = ['Datos Personales', 'Dirección', 'Contacto y Emergencia', 'Info. Médica'];

  tiposSangre = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  tiposEspinaBifida = ['Espina Bífida Oculta', 'Meningocele', 'Mielomeningocele', 'Lipomeningocele', 'Otro'];

  estados = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
    'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato',
    'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
    'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
    'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  formData: any = {
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    fechaNacimiento: '', sexo: '', curp: '', nombrePadreMadre: '',
    calle: '', numeroExterior: '', numeroInterior: '',
    colonia: '', municipio: '', ciudad: '', estado: '', codigoPostal: '',
    telefonoCasa: '', telefonoCelular: '', correoElectronico: '',
    enEmergenciaAvisarA: '', telefonoEmergencia: '',
    requiereTutor: false, nombreTutor: '', telefonoTutor: '', relacionTutor: '',
    tipoSangre: '', tipoEspinaBifida: '', usaValvula: false,
    alergias: '', medicamentosActuales: '', notasAdicionales: ''
  };

  nextStep() {
    if (this.currentStep < 4) this.currentStep++;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fotografiaName = input.files[0].name;
    }
  }

  submitForm() {
    const notasParts = [];
    if (this.formData.tipoEspinaBifida) notasParts.push(`Tipo EB: ${this.formData.tipoEspinaBifida}`);
    if (this.formData.alergias) notasParts.push(`Alergias: ${this.formData.alergias}`);
    if (this.formData.medicamentosActuales) notasParts.push(`Medicamentos: ${this.formData.medicamentosActuales}`);
    if (this.formData.notasAdicionales) notasParts.push(this.formData.notasAdicionales);

    const payload = {
      nombre: this.formData.nombre,
      apellido_paterno: this.formData.apellidoPaterno,
      apellido_materno: this.formData.apellidoMaterno,
      fecha_nacimiento: this.formData.fechaNacimiento,
      genero: this.formData.sexo,
      curp: this.formData.curp,
      estado_nacimiento: this.formData.estado,
      hospital_nacimiento: '',
      nombre_padre_madre: this.formData.nombrePadreMadre,
      direccion: [this.formData.calle, this.formData.numeroExterior, this.formData.numeroInterior].filter(Boolean).join(' '),
      colonia: this.formData.colonia,
      ciudad: this.formData.ciudad,
      estado: this.formData.estado,
      codigo_postal: this.formData.codigoPostal,
      telefono_casa: this.formData.telefonoCasa,
      telefono_celular: this.formData.telefonoCelular,
      correo_electronico: this.formData.correoElectronico,
      en_emergencia_avisar_a: this.formData.enEmergenciaAvisarA,
      telefono_emergencia: this.formData.telefonoEmergencia,
      tipo_sangre: this.formData.tipoSangre,
      usa_valvula: this.formData.usaValvula ? 'S' : 'N',
      tipo_cuota: 'A',
      notas_adicionales: notasParts.join(' | '),
      paso_actual: 4,
    };

    this.api.createPreRegistro(payload).subscribe({
      next: () => {
        this.submitted = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error('Error al enviar pre-registro:', err);
        this.submitted = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
