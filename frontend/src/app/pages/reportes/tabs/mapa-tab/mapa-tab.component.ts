import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { ApiService } from '../../../../services/api.service';

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

@Component({
  selector: 'app-mapa-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa-tab.component.html',
})
export class MapaTabComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('mapaContainer') mapaContainer!: ElementRef<HTMLDivElement>;

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
    const display: Record<string, string> = {};
    for (const b of this.mapaBeneficiarios) {
      const raw = (b.ciudad || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      if (!display[key]) display[key] = raw.replace(/\b\w/g, c => c.toUpperCase());
    }
    return Object.entries(counts)
      .map(([key, count]) => ({ nombre: display[key], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this._mapNeedsInit = true;
    this.mapaCargarBeneficiarios();
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

  private mapaCargarBeneficiarios(): void {
    this.mapaLoading = true;
    this.mapaError = '';
    this.api.getMapaBeneficiarios().subscribe({
      next: (data: MapBeneficiario[]) => {
        this.mapaBeneficiarios = data;
        this.mapaEstados = [...new Set(
          data.map((b) => (b.estado || '').trim()).filter(Boolean)
        )].sort((a, b) => a.localeCompare(b));
        this.mapaLoading = false;
        if (this._map) this._renderMarkers();
        if (this.mapaPendientesGeocode > 0) this._startAutoPoll();
      },
      error: (err: unknown) => {
        this.mapaLoading = false;
        this.mapaError = (err as { error?: { detail?: string } })?.error?.detail || 'No se pudo cargar el mapa. Verifica que el servidor esté corriendo.';
      },
    });
  }

  mapaCargarBeneficiariosPublic(): void { this.mapaCargarBeneficiarios(); }

  mapaAplicarFiltro(): void { this._renderMarkers(); }

  private _startAutoPoll(): void {
    this._stopAutoPoll();
    this._pollInterval = setInterval(() => {
      this.api.getMapaBeneficiarios().subscribe({
        next: (data: MapBeneficiario[]) => {
          this.mapaBeneficiarios = data;
          this.mapaEstados = [...new Set(
            data.map((b) => (b.estado || '').trim()).filter(Boolean)
          )].sort((a, b) => a.localeCompare(b));
          this._addNewMarkers();
          if (this.mapaPendientesGeocode === 0) this._stopAutoPoll();
        },
      });
    }, 8000);
  }

  private _stopAutoPoll(): void {
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
  }

  private _cuotaColor(tipoCuota: string): string {
    return (tipoCuota || '').toUpperCase().includes('B') ? '#ea580c' : '#1d4ed8';
  }

  private _cuotaHoverColor(tipoCuota: string): string {
    return (tipoCuota || '').toUpperCase().includes('B') ? '#c2410c' : '#1e40af';
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
    const newlyGeocoded = this.mapaBeneficiarios.filter(b => {
      if (b.latitud == null || this._renderedIds.has(b.id_paciente)) return false;
      if (this.mapaFiltroCuota && b.tipo_cuota !== this.mapaFiltroCuota) return false;
      if (this.mapaFiltroEstado && (b.estado || '').trim() !== this.mapaFiltroEstado) return false;
      return true;
    });
    newlyGeocoded.forEach(b => this._addCircleToMap(b));
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
}
