import { Component, DestroyRef, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { AvatarInicialesComponent } from '../../../../shared/components/avatar-iniciales/avatar-iniciales.component';
import { DetalleBeneficiarioModalComponent } from '../activos-tab/modals/detalle-beneficiario-modal.component';
import { CredencialModalComponent } from '../activos-tab/modals/credencial-modal.component';
import { Beneficiario, Documento } from '../activos-tab/activos-tab.types';
import { getApiError } from '../../../../shared/utils/error.utils';

@Component({
  selector: 'app-inactivos-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarInicialesComponent, DetalleBeneficiarioModalComponent, CredencialModalComponent],
  templateUrl: './inactivos-tab.component.html',
})
export class InactivosTabComponent implements OnInit, OnDestroy {
  @Input() isAdmin = false;
  @Output() countChange = new EventEmitter<number>();
  @Output() reactivado = new EventEmitter<void>();

  loading = true;
  submittingFolio: string | null = null;
  error = '';
  searchTerm = '';
  beneficiarios: Beneficiario[] = [];
  filteredBeneficiarios: Beneficiario[] = [];
  beneficiarioParaDetalle: Beneficiario | null = null;
  beneficiarioParaCredencial: Beneficiario | null = null;
  beneficiarioParaReactivar: Beneficiario | null = null;

  private readonly fotoObjectUrls = new Map<number, string>();
  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadBeneficiarios();
  }

  ngOnDestroy(): void {
    this.revokeFotoObjectUrls();
  }

  loadBeneficiarios(): void {
    this.loading = true;
    this.error = '';
    this.revokeFotoObjectUrls();
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
        this.cargarFotosBeneficiarios(this.beneficiarios);
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

  verDetalle(b: Beneficiario): void {
    this.beneficiarioParaDetalle = b;
  }

  reactivar(b: Beneficiario): void {
    if (!this.isAdmin || this.submittingFolio) return;
    this.beneficiarioParaReactivar = b;
  }

  confirmarReactivar(): void {
    const b = this.beneficiarioParaReactivar;
    if (!b || !this.isAdmin || this.submittingFolio) return;
    this.submittingFolio = b.folio;
    this.error = '';
    this.api.reactivarBeneficiario(b.folio)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.submittingFolio = null;
        this.beneficiarioParaReactivar = null;
        this.loadBeneficiarios();
        this.reactivado.emit();
      },
      error: (err) => {
        this.submittingFolio = null;
        this.error = getApiError(err, 'No se pudo reactivar al beneficiario.');
      },
    });
  }

  private esFormatoImagen(formato: unknown): boolean {
    return ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(String(formato || '').trim().toUpperCase()); // NOSONAR
  }

  private obtenerFechaDocumento(valor: unknown): number {
    if (!valor) return 0;
    const ms = new Date(valor as string | number).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  }

  private seleccionarDocumentoFoto(documentos: Documento[]): Documento | null {
    if (!Array.isArray(documentos) || documentos.length === 0) return null;
    const imagenes = documentos.filter((doc) => this.esFormatoImagen(doc?.formato_archivo));
    if (!imagenes.length) return null;
    const fotosExplicitas = imagenes.filter((doc) => {
      const tipo = String(doc?.tipo_nombre || '').toLowerCase();
      const nombreArchivo = String(doc?.nombre_archivo || '').toLowerCase();
      return tipo.includes('foto') || tipo.includes('fotografia') || tipo.includes('imagen') || nombreArchivo.includes('foto');
    });
    const candidatas = fotosExplicitas.length ? fotosExplicitas : imagenes;
    return [...candidatas].sort(
      (a, b) => this.obtenerFechaDocumento(b?.fecha_carga) - this.obtenerFechaDocumento(a?.fecha_carga)
    )[0] || null;
  }

  private actualizarFotoEnVistas(idPaciente: number, fotoUrl: string | null): void {
    const previous = this.fotoObjectUrls.get(idPaciente);
    if (previous && previous !== fotoUrl) URL.revokeObjectURL(previous);
    if (fotoUrl?.startsWith('blob:')) this.fotoObjectUrls.set(idPaciente, fotoUrl);
    else this.fotoObjectUrls.delete(idPaciente);

    const update = (b: Beneficiario) => b.idPaciente === idPaciente ? { ...b, fotoUrl } : b;
    this.beneficiarios = this.beneficiarios.map(update);
    this.filteredBeneficiarios = this.filteredBeneficiarios.map(update);
    if (this.beneficiarioParaDetalle?.idPaciente === idPaciente) {
      this.beneficiarioParaDetalle = { ...this.beneficiarioParaDetalle, fotoUrl };
    }
    if (this.beneficiarioParaCredencial?.idPaciente === idPaciente) {
      this.beneficiarioParaCredencial = { ...this.beneficiarioParaCredencial, fotoUrl };
    }
  }

  private cargarFotosBeneficiarios(items: Beneficiario[]): void {
    if (!items.length) return;
    const requests = items.map((b) =>
      this.api.getDocumentos(b.idPaciente).pipe(
        switchMap((docs: Documento[]) => {
          const fotoDoc = this.seleccionarDocumentoFoto(docs || []);
          if (!fotoDoc?.id_documento) return of({ idPaciente: b.idPaciente, fotoUrl: null });
          return this.api.getDocumentoBlob(b.idPaciente, Number(fotoDoc.id_documento)).pipe(
            map((blob: Blob) => ({
              idPaciente: b.idPaciente,
              fotoUrl: URL.createObjectURL(blob),
            }))
          );
        }),
        catchError(() => of({ idPaciente: b.idPaciente, fotoUrl: null }))
      )
    );
    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => results.forEach((item) => this.actualizarFotoEnVistas(item.idPaciente, item.fotoUrl)),
      });
  }

  private revokeFotoObjectUrls(): void {
    this.fotoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.fotoObjectUrls.clear();
  }
}
