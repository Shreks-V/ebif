import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { ReportesTabComponent } from './tabs/reportes-tab/reportes-tab.component';
import { MapaTabComponent } from './tabs/mapa-tab/mapa-tab.component';
import { AnalisisTabComponent } from './tabs/analisis-tab/analisis-tab.component';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, ReportesTabComponent, MapaTabComponent, AnalisisTabComponent],
  templateUrl: './reportes.component.html',
  styles: [`
    @media print {
      app-navbar, app-footer, button { display: none !important; }
    }
  `]
})
export class ReportesComponent {
  activeSection: 'reportes' | 'mapa' | 'analisis' = 'reportes';
}
