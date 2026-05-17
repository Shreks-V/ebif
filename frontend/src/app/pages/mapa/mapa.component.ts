import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ApiService } from '../../services/api.service';

// Fix default Leaflet marker icons (broken with bundlers)
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = iconDefault;

interface MapBeneficiario {
  id: number;
  folio: string;
  nombre: string;
  ciudad: string;
  estado: string;
  tipoCuota: string;
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
  estados: string[] = [];
  private geocodeCache: Record<string, { lat: number; lng: number }> = {};
  private _geocodingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    try {
      const cached = sessionStorage.getItem('mapa_geocode_cache');
      if (cached) this.geocodeCache = JSON.parse(cached);
    } catch {}
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.loadBeneficiarios();
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

  private loadBeneficiarios(): void {
    this.api.getBeneficiarios({ activo: 'S', limit: 500 }).subscribe({
      next: (data: any[]) => {
        this.beneficiarios = data.map((b: any) => ({
          id: b.id_paciente ?? b.idPaciente,
          folio: b.folio_paciente ?? b.folio ?? '',
          nombre: `${b.nombre ?? ''} ${b.apellido_paterno ?? b.apellidoPaterno ?? ''} ${b.apellido_materno ?? b.apellidoMaterno ?? ''}`.trim(),
          ciudad: b.ciudad ?? '',
          estado: b.estado ?? '',
          tipoCuota: b.tipo_cuota ?? b.tipoCuota ?? '',
        }));
        this.estados = [...new Set(this.beneficiarios.map(b => b.estado).filter(Boolean))].sort();
        this.loading = false;
        this.geocodeAll();
      },
      error: () => { this.loading = false; }
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
      await this.delay(1100);
      try {
        const query = encodeURIComponent(`${b.ciudad}, ${b.estado}, Mexico`);
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'es', 'User-Agent': 'EBIF-Espina-Bifida/1.0' } }
        );
        const results: any[] = await resp.json();
        if (results.length > 0) {
          b.lat = parseFloat(results[0].lat);
          b.lng = parseFloat(results[0].lon);
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

  private addMarker(b: MapBeneficiario): void {
    if (b.lat == null || b.lng == null) return;
    const jitter = () => (Math.random() - 0.5) * 0.01;
    const marker = L.marker([b.lat + jitter(), b.lng + jitter()])
      .bindPopup(`
        <div style="font-family:sans-serif;min-width:160px">
          <p style="font-weight:800;font-size:14px;margin:0 0 4px">${b.nombre}</p>
          <p style="color:#666;font-size:12px;margin:0 0 2px">Folio: <b>${b.folio}</b></p>
          <p style="color:#666;font-size:12px;margin:0 0 6px">${b.ciudad}${b.ciudad && b.estado ? ', ' : ''}${b.estado}</p>
          <span style="background:#00328b;color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">
            ${b.tipoCuota === 'CUOTA B' ? 'Cuota B' : 'Cuota A'}
          </span>
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
}
