import { Component, DestroyRef, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';
import { GEOCODING_DELAY_MS, SI } from '../../shared/constants/app.constants';

interface MapBeneficiario {
  id: number;
  folio: string;
  nombre: string;
  ciudad: string;
  estado: string;
  tipoCuota: string;
  tieneComodato: boolean;
  lat?: number;
  lng?: number;
  geocodingFailed?: boolean;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './mapa.component.html',
})
export class MapaComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private map!: L.Map;
  private markers: L.Marker[] = [];
  beneficiarios: MapBeneficiario[] = [];
  loading = true;
  geocodingProgress = 0;
  geocodingTotal = 0;
  filtroCuota: '' | 'CUOTA A' | 'CUOTA B' = '';
  filtroEstado = '';
  filtroComodato: '' | 'con-comodato' | 'sin-comodato' = '';
  estados: string[] = [];
  private geocodeCache: Record<string, { lat: number; lng: number }> = {};
  private _geocodingTimer: ReturnType<typeof setTimeout> | null = null;
  private pacientesConComodato = new Set<number>();

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly api: ApiService, private readonly router: Router) {}

  ngOnInit(): void {
    try {
      const cached = sessionStorage.getItem('mapa_geocode_cache');
      if (cached) this.geocodeCache = JSON.parse(cached);
    } catch {}
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadComodatosYBeneficiarios();
  }

  ngOnDestroy(): void {
    if (this._geocodingTimer) clearTimeout(this._geocodingTimer);
    if (this.map) this.map.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [23.6, -102.5],
      zoom: 5,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);
  }

  private loadComodatosYBeneficiarios(): void {
    this.api.getComodatos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comodatos) => {
          this.pacientesConComodato = new Set(
            comodatos
              .filter((c: { estatus?: string; id_paciente?: number }) => c.estatus === 'PRESTADO' && c.id_paciente)
              .map((c: { id_paciente: number }) => c.id_paciente)
          );
          this.loadBeneficiarios();
        },
        error: () => { this.loadBeneficiarios(); },
      });
  }

  private loadBeneficiarios(): void {
    this.api.getBeneficiarios({ activo: SI, limit: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.beneficiarios = data.map((b) => ({
            id: b.id_paciente ?? b.idPaciente,
            folio: b.folio_paciente ?? b.folio ?? '',
            nombre: `${b.nombre ?? ''} ${b.apellido_paterno ?? b.apellidoPaterno ?? ''} ${b.apellido_materno ?? b.apellidoMaterno ?? ''}`.trim(),
            ciudad: b.ciudad ?? '',
            estado: b.estado ?? '',
            tipoCuota: b.tipo_cuota ?? b.tipoCuota ?? '',
            tieneComodato: this.pacientesConComodato.has(b.id_paciente ?? b.idPaciente),
          }));
          this.estados = [...new Set(this.beneficiarios.map(b => b.estado).filter(Boolean))].sort((a, b) => a.localeCompare(b));
          this.loading = false;
          this.geocodeAll();
        },
        error: (err) => { console.error(err); this.loading = false; }
      });
  }

  private async geocodeAll(): Promise<void> {
    const toGeocode = this.beneficiarios.filter(b => b.ciudad || b.estado);
    this.geocodingTotal = toGeocode.length;
    this.geocodingProgress = 0;

    for (const b of toGeocode) {
      const key = `${b.ciudad},${b.estado},Mexico`.toLowerCase();
      if (this.geocodeCache[key]) {
        b.lat = this.geocodeCache[key].lat;
        b.lng = this.geocodeCache[key].lng;
        this.geocodingProgress++;
        this.addMarker(b);
        continue;
      }
      await this.delay(GEOCODING_DELAY_MS);
      try {
        const query = encodeURIComponent(`${b.ciudad}, ${b.estado}, Mexico`);
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'es', 'User-Agent': 'EBIF-Espina-Bifida/1.0' } }
        );
        const results = await resp.json() as { lat: string; lon: string }[];
        if (results.length > 0) {
          b.lat = Number.parseFloat(results[0].lat);
          b.lng = Number.parseFloat(results[0].lon);
          this.geocodeCache[key] = { lat: b.lat, lng: b.lng };
          this.addMarker(b);
        } else {
          b.geocodingFailed = true;
        }
      } catch {
        b.geocodingFailed = true;
      }
      this.geocodingProgress++;
    }
    try {
      sessionStorage.setItem('mapa_geocode_cache', JSON.stringify(this.geocodeCache));
    } catch {}
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => { this._geocodingTimer = setTimeout(resolve, ms); });
  }

  private createMarkerIcon(tipoCuota: string, tieneComodato: boolean): L.DivIcon {
    const esCuotaB = tipoCuota === 'CUOTA B';
    const esPorDefinir = !tipoCuota || tipoCuota === 'POR DEFINIR';
    let color = '#00328b';
    if (esCuotaB) color = '#7c3aed';
    else if (esPorDefinir) color = '#64748b';

    const ring = tieneComodato
      ? `outline: 3px solid #059669; outline-offset: 2px; border-radius: 50%;`
      : '';
    return L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);${ring}"></div>`,
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10],
    });
  }

  private addMarker(b: MapBeneficiario): void {
    if (b.lat == null || b.lng == null) return;
    const jitter = () => (Math.random() - 0.5) * 0.01; // NOSONAR: jitter visual de marcadores en el mapa, sin uso criptográfico
    const cuotaLabel = b.tipoCuota === 'CUOTA B' ? 'Cuota B' : b.tipoCuota === 'CUOTA A' ? 'Cuota A' : 'Por definir';
    const comodatoTag = b.tieneComodato
      ? '<span style="background:#059669;color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;margin-left:4px">Material prestado</span>'
      : '';
    const marker = L.marker([b.lat + jitter(), b.lng + jitter()], { icon: this.createMarkerIcon(b.tipoCuota, b.tieneComodato) })
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <p style="font-weight:800;font-size:14px;margin:0 0 4px">${b.nombre}</p>
          <p style="color:#666;font-size:12px;margin:0 0 2px">Folio: <b>${b.folio}</b></p>
          <p style="color:#666;font-size:12px;margin:0 0 6px">${b.ciudad}${b.ciudad && b.estado ? ', ' : ''}${b.estado}</p>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            <span style="background:#00328b;color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">${cuotaLabel}</span>
            ${comodatoTag}
          </div>
        </div>
      `)
      .addTo(this.map);
    this.markers.push(marker);
  }

  applyFilter(): void {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
    const filtered = this.beneficiarios.filter(b => {
      if (this.filtroCuota && b.tipoCuota !== this.filtroCuota) return false;
      if (this.filtroEstado && b.estado !== this.filtroEstado) return false;
      if (this.filtroComodato === 'con-comodato' && !b.tieneComodato) return false;
      if (this.filtroComodato === 'sin-comodato' && b.tieneComodato) return false;
      return b.lat != null && b.lng != null;
    });
    filtered.forEach(b => this.addMarker(b));
  }

  get geocodingPct(): number {
    return this.geocodingTotal > 0 ? Math.round((this.geocodingProgress / this.geocodingTotal) * 100) : 0;
  }

  get beneficiariosConUbicacion(): number {
    return this.beneficiarios.filter(b => b.lat != null).length;
  }

  get beneficiariosSinUbicacion(): number {
    return this.beneficiarios.filter(b => b.geocodingFailed).length;
  }

  get beneficiariosConComodato(): number {
    return this.beneficiarios.filter(b => b.tieneComodato).length;
  }
}
