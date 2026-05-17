import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import * as L from 'leaflet';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

interface MapBeneficiario {
  id_paciente: number;
  folio_paciente: string;
  nombre_completo: string;
  ciudad: string;
  estado: string;
  tipo_cuota: string;
  latitud: number | null;
  longitud: number | null;
  geocodificado: 'S' | 'N' | 'F';
}

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
  templateUrl: './reportes.component.html',
  styles: [`
    @media print {
      app-navbar, app-footer, button { display: none !important; }
    }
  `]
})
export class ReportesComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('mapaContainer') mapaContainer!: ElementRef<HTMLDivElement>;
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
  sec1PagosPorMetodo: { metodo: string; num_pagos: number; monto: number; porcentaje: number }[] = [];
  sec1TotalPagado = 0;

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

  // ─── Mapa state ───
  activeSection: 'reportes' | 'mapa' = 'reportes';
  private _map: L.Map | null = null;
  private _mapCircles: L.CircleMarker[] = [];
  private _mapInitialized = false;
  private _mapNeedsInit = false;
  private _pollInterval: ReturnType<typeof setInterval> | null = null;
  private _renderedIds = new Set<number>();
  mapaBeneficiarios: MapBeneficiario[] = [];
  mapaLoading = false;
  mapaError = '';
  mapaFiltroCuota: '' | 'CUOTA A' | 'CUOTA B' = '';
  mapaFiltroEstado = '';
  mapaEstados: string[] = [];

  get mapaTotalUbicados(): number {
    return this.mapaBeneficiarios.filter(b => b.latitud != null).length;
  }
  get mapaPendientesGeocode(): number {
    return this.mapaBeneficiarios.filter(b => b.geocodificado === 'N' || b.geocodificado == null).length;
  }
  get mapaCuotaA(): number {
    return this.mapaBeneficiarios.filter(b => !(b.tipo_cuota || '').toUpperCase().includes('B')).length;
  }
  get mapaCuotaB(): number {
    return this.mapaBeneficiarios.filter(b => (b.tipo_cuota || '').toUpperCase().includes('B')).length;
  }
  get mapaTopCiudades(): { nombre: string; count: number }[] {
    const counts: Record<string, number> = {};
    for (const b of this.mapaBeneficiarios) {
      const ciudad = (b.ciudad || '').trim();
      if (ciudad) counts[ciudad] = (counts[ciudad] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }
  private _cuotaColor(tipoCuota: string): string {
    return (tipoCuota || '').toUpperCase().includes('B') ? '#ea580c' : '#1d4ed8';
  }
  private _cuotaHoverColor(tipoCuota: string): string {
    return (tipoCuota || '').toUpperCase().includes('B') ? '#c2410c' : '#1e40af';
  }

  irAlMapa(): void {
    this.activeSection = 'mapa';
    this._mapNeedsInit = true;
    if (!this.mapaBeneficiarios.length && !this.mapaLoading) {
      this.mapaCargarBeneficiarios();
    } else if (this.mapaBeneficiarios.length && this.mapaPendientesGeocode > 0) {
      this._startAutoPoll();
    }
  }

  irAReportes(): void {
    this.activeSection = 'reportes';
    this._stopAutoPoll();
  }

  mapaCargarBeneficiariosPublic(): void { this.mapaCargarBeneficiarios(); }

  private mapaCargarBeneficiarios(): void {
    this.mapaLoading = true;
    this.mapaError = '';
    this.api.getMapaBeneficiarios().subscribe({
      next: (data: any[]) => {
        this.mapaBeneficiarios = data;
        this.mapaEstados = [...new Set(
          data.map((b: any) => (b.estado || '').trim()).filter(Boolean)
        )].sort();
        this.mapaLoading = false;
        if (this._map) this._renderMarkers();
        if (this.mapaPendientesGeocode > 0) this._startAutoPoll();
      },
      error: (err: any) => {
        this.mapaLoading = false;
        this.mapaError = err?.error?.detail || 'No se pudo cargar el mapa. Verifica que el servidor esté corriendo.';
      },
    });
  }

  private _startAutoPoll(): void {
    this._stopAutoPoll();
    this._pollInterval = setInterval(() => {
      this.api.getMapaBeneficiarios().subscribe({
        next: (data: any[]) => {
          this.mapaBeneficiarios = data;
          this.mapaEstados = [...new Set(
            data.map((b: any) => (b.estado || '').trim()).filter(Boolean)
          )].sort();
          this._addNewMarkers();
          if (this.mapaPendientesGeocode === 0) this._stopAutoPoll();
        },
      });
    }, 8000);
  }

  private _stopAutoPoll(): void {
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
  }

  private _buildPopupHtml(b: MapBeneficiario): string {
    const loc = [(b.ciudad || '').trim(), (b.estado || '').trim()].filter(Boolean).join(', ');
    const cuota = (b.tipo_cuota || '').toUpperCase().includes('B') ? 'Cuota B' : 'Cuota A';
    const color = this._cuotaColor(b.tipo_cuota);
    return `
      <div style="font-family:system-ui,-apple-system,sans-serif;min-width:190px;padding:2px 0">
        <div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.3;margin-bottom:6px">
          ${b.nombre_completo}
        </div>
        <div style="color:#64748b;font-size:11px;line-height:1.9">
          <span style="color:#94a3b8;text-transform:uppercase;font-size:9px;letter-spacing:.05em;font-weight:600">Folio</span><br>
          <span style="color:#334155;font-weight:600">${b.folio_paciente}</span>
        </div>
        <div style="color:#64748b;font-size:11px;line-height:1.9;margin-top:4px">
          <span style="color:#94a3b8;text-transform:uppercase;font-size:9px;letter-spacing:.05em;font-weight:600">Ubicación</span><br>
          <span style="color:#334155">${loc || 'Sin dato'}</span>
        </div>
        <div style="margin-top:10px">
          <span style="background:${color};color:#fff;padding:3px 11px;border-radius:99px;font-size:11px;font-weight:700">
            ${cuota}
          </span>
        </div>
      </div>`;
  }

  private _addCircleToMap(b: MapBeneficiario): void {
    if (!this._map || b.latitud == null || b.longitud == null) return;
    const jitter = () => (Math.random() - 0.5) * 0.008;
    const color = this._cuotaColor(b.tipo_cuota);
    const hoverColor = this._cuotaHoverColor(b.tipo_cuota);
    const circle = L.circleMarker(
      [b.latitud + jitter(), b.longitud + jitter()],
      { radius: 9, fillColor: color, color: '#ffffff', weight: 2.5, opacity: 1, fillOpacity: 0.88 }
    ).bindPopup(this._buildPopupHtml(b), { maxWidth: 240 });
    circle.on('mouseover', function(this: L.CircleMarker) {
      this.setStyle({ fillColor: hoverColor, radius: 13, fillOpacity: 1 });
      this.openPopup();
    });
    circle.on('mouseout', function(this: L.CircleMarker) {
      this.setStyle({ fillColor: color, radius: 9, fillOpacity: 0.88 });
    });
    circle.addTo(this._map!);
    this._mapCircles.push(circle);
    this._renderedIds.add(b.id_paciente);
  }

  private _addNewMarkers(): void {
    if (!this._map) return;
    const newlyGeooded = this.mapaBeneficiarios.filter(b => {
      if (b.latitud == null || this._renderedIds.has(b.id_paciente)) return false;
      if (this.mapaFiltroCuota && b.tipo_cuota !== this.mapaFiltroCuota) return false;
      if (this.mapaFiltroEstado && (b.estado || '').trim() !== this.mapaFiltroEstado) return false;
      return true;
    });
    newlyGeooded.forEach(b => this._addCircleToMap(b));
  }

  private _renderMarkers(): void {
    if (!this._map) return;
    this._mapCircles.forEach(c => c.remove());
    this._mapCircles = [];
    this._renderedIds.clear();

    const visible = this.mapaBeneficiarios.filter(b => {
      if (b.latitud == null || b.longitud == null) return false;
      if (this.mapaFiltroCuota && b.tipo_cuota !== this.mapaFiltroCuota) return false;
      if (this.mapaFiltroEstado && (b.estado || '').trim() !== this.mapaFiltroEstado) return false;
      return true;
    });

    visible.forEach(b => this._addCircleToMap(b));

    if (visible.length > 0) {
      const bounds = L.latLngBounds(
        visible.map(b => [b.latitud!, b.longitud!] as L.LatLngTuple)
      );
      this._map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }
  }

  mapaAplicarFiltro(): void {
    this._renderMarkers();
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    const today = new Date();
    this.sec1FechaInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.sec1FechaFin = lastDay.toISOString().slice(0, 10);
    this.setIndicPeriod('3m');
  }

  ngAfterViewChecked(): void {
    if (this._mapNeedsInit && this.mapaContainer?.nativeElement) {
      this._mapNeedsInit = false;
      this._initMap();
    }
  }

  ngOnDestroy(): void {
    this._stopAutoPoll();
    if (this._map) { this._map.remove(); this._map = null; }
  }

  private _initMap(): void {
    if (this._mapInitialized) return;
    this._mapInitialized = true;
    this._map = L.map(this.mapaContainer.nativeElement, {
      center: [25.6866, -100.3161],
      zoom: 9,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(this._map);

    const legendControl = new L.Control({ position: 'bottomright' });
    legendControl.onAdd = (_map: L.Map): HTMLElement => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <div style="background:white;border-radius:10px;padding:10px 14px;box-shadow:0 2px 10px rgba(0,0,0,.15);font-family:system-ui,-apple-system,sans-serif">
          <p style="margin:0 0 7px;font-weight:700;color:#0f172a;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Tipo de cuota</p>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <div style="width:11px;height:11px;border-radius:50%;background:#1d4ed8;border:2px solid white;box-shadow:0 0 0 1.5px #1d4ed8;flex-shrink:0"></div>
            <span style="color:#334155;font-size:12px">Cuota A</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:11px;height:11px;border-radius:50%;background:#ea580c;border:2px solid white;box-shadow:0 0 0 1.5px #ea580c;flex-shrink:0"></div>
            <span style="color:#334155;font-size:12px">Cuota B</span>
          </div>
        </div>`;
      return div;
    };
    legendControl.addTo(this._map);

    if (this.mapaBeneficiarios.length) this._renderMarkers();
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
      pagosPorMetodo: this.api.getReportePagosPorMetodo(this.sec1FechaInicio || undefined, this.sec1FechaFin || undefined),
    }).subscribe({
      next: ({ servicios, pagos, estudios, stats, ciudades, pagosPorMetodo }) => {
        this.sec1Credenciales = stats.activos ?? 0;
        this.sec1TotalServicios = servicios.total ?? 0;
        this.sec1Exentos = pagos.total_exentos ?? 0;
        this.sec1Cuotas = pagos.total_cuotas ?? 0;

        const pg: Record<string, number> = stats.por_genero ?? {};
        const pp: Record<string, number> = stats.por_procedencia ?? {};
        const pe: Record<string, number> = stats.por_etapa_vida ?? {};
        const getVal = (source: Record<string, number>, ...keys: string[]) =>
          keys.reduce<number | null>((found, key) => found ?? source[key] ?? null, null) ?? 0;
        this.sec1Hombres = pg['Hombre'] ?? pg['Masculino'] ?? pg['H'] ?? 0;
        this.sec1Mujeres = pg['Mujer'] ?? pg['Femenino'] ?? pg['M'] ?? 0;
        this.sec1Nl = getVal(pp, 'Nuevo León', 'N.L.', 'NL');
        this.sec1Foraneos = getVal(pp, 'Foráneos', 'Foraneos', 'Viven en otros estados');
        this.sec1Lactantes = getVal(pe, 'Primera Infancia (0-5)', 'Primera Infancia');
        this.sec1Ninos = getVal(pe, 'Infancia (6-11)', 'Infancia');
        this.sec1Adolescentes = getVal(pe, 'Adolescencia (12-17)', 'Adolescencia');
        this.sec1Adultos =
          getVal(pe, 'Juventud (18-29)', 'Juventud') +
          getVal(pe, 'Adultez (30-59)', 'Adultez') +
          getVal(pe, 'Adulto Mayor (60+)', 'Adulto Mayor');

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

        this.sec1PagosPorMetodo = pagosPorMetodo.detalle ?? [];
        this.sec1TotalPagado = pagosPorMetodo.total ?? 0;

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

  exportarPDFIndicadores(): void {
    this.api.exportarReportePdf('indicadores', {
      fecha_inicio: this.indicFechaInicio,
      fecha_fin: this.indicFechaFin,
    }).subscribe({
      next: (blob) => this.descargar(blob, `indicadores_${this.indicFechaInicio}_${this.indicFechaFin}.pdf`),
      error: () => alert('Error al generar PDF de indicadores'),
    });
  }

  exportarPDFConsolidado(): void {
    this.api.exportarReportePdf('consolidado-mensual', {
      mes: this.consol4Mes,
      anio: this.consol4Anio,
    }).subscribe({
      next: (blob) => this.descargar(blob, `consolidado_${this.consol4NombreMes(this.consol4Mes)}_${this.consol4Anio}.pdf`),
      error: () => alert('Error al generar PDF del consolidado'),
    });
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
