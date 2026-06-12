import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../../../services/api.service';
import { Beneficiario } from '../activos-tab/activos-tab.types';
import { getApiError } from '../../../../shared/utils/error.utils';

@Component({
  selector: 'app-inactivos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inactivos-tab.component.html',
})
export class InactivosTabComponent implements OnInit {
  @Input() isAdmin = false;
  @Output() countChange = new EventEmitter<number>();
  @Output() reactivado = new EventEmitter<void>();

  loading = true;
  submittingFolio: string | null = null;
  error = '';
  searchTerm = '';
  beneficiarios: Beneficiario[] = [];
  filteredBeneficiarios: Beneficiario[] = [];

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadBeneficiarios();
  }

  loadBeneficiarios(): void {
    this.loading = true;
    this.error = '';
    this.api.getBeneficiarios({ activo: 'N', limit: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (data) => {
        this.beneficiarios = data.map((item, index) => ({
          idPaciente: item.id_paciente,
          folio: item.folio,
          nombre: item.nombre,
          apellidoPaterno: item.apellido_paterno,
          apellidoMaterno: item.apellido_materno || '',
          genero: item.genero || '',
          fechaNacimiento: item.fecha_nacimiento || '',
          curp: item.curp || '',
          nombrePadreMadre: item.nombre_padre_madre || '',
          direccion: item.direccion || '',
          colonia: item.colonia || '',
          ciudad: item.ciudad || '',
          estado: item.estado || '',
          codigoPostal: item.codigo_postal || '',
          telefonoCasa: item.telefono_casa || '',
          telefonoCelular: item.telefono_celular || '',
          correoElectronico: item.correo_electronico || '',
          enEmergenciaAvisarA: item.en_emergencia_avisar_a || '',
          telefonoEmergencia: item.telefono_emergencia || '',
          municipioNacimiento: item.municipio_nacimiento || '',
          estadoNacimiento: item.estado_nacimiento || '',
          hospitalNacimiento: item.hospital_nacimiento || '',
          tipoSangre: item.tipo_sangre || '',
          usaValvula: item.usa_valvula || '',
          notasAdicionales: item.notas_adicionales || '',
          fechaAlta: item.fecha_alta || '',
          membresiaEstatus: item.membresia_estatus || '',
          tipoCuota: item.tipo_cuota || '',
          activo: item.activo || 'N',
          tiposEspina: (item.tipos_espina || []).map((te) => ({
            idTipoEspina: te.id_tipo_espina,
            nombre: te.nombre,
          })),
          fechaInicioMembresia: item.fecha_inicio_membresia || null,
          fechaVencimientoMembresia: item.fecha_vencimiento_membresia || null,
          fotoUrl: null,
          iniciales: (item.nombre?.charAt(0) || '') + (item.apellido_paterno?.charAt(0) || ''),
          color: index % 2 === 0 ? 'bg-slate-400' : 'bg-slate-500',
        } as Beneficiario));
        this.filter();
        this.loading = false;
      },
      error: (err) => {
        this.error = getApiError(err, 'Error al cargar beneficiarios inactivos.');
        this.loading = false;
      },
    });
  }

  filter(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredBeneficiarios = this.beneficiarios.filter(b =>
      b.nombre.toLowerCase().includes(term) ||
      b.apellidoPaterno.toLowerCase().includes(term) ||
      b.apellidoMaterno.toLowerCase().includes(term) ||
      b.folio.toLowerCase().includes(term) ||
      b.curp.toLowerCase().includes(term)
    );
    this.countChange.emit(this.filteredBeneficiarios.length);
  }

  reactivar(b: Beneficiario): void {
    if (!this.isAdmin || this.submittingFolio) return;
    const nombre = `${b.nombre} ${b.apellidoPaterno}`.trim();
    if (!confirm(`¿Reactivar a ${nombre}?`)) return;
    this.submittingFolio = b.folio;
    this.error = '';
    this.api.reactivarBeneficiario(b.folio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.submittingFolio = null;
        this.loadBeneficiarios();
        this.reactivado.emit();
      },
      error: (err) => {
        this.submittingFolio = null;
        this.error = getApiError(err, 'No se pudo reactivar al beneficiario.');
      },
    });
  }
}
