import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { AuthService } from '../../services/auth.service';
import { CitasTabComponent } from './tabs/citas-tab/citas-tab.component';
import { MedicosTabComponent } from './tabs/medicos-tab/medicos-tab.component';

@Component({
  selector: 'app-citas',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, CitasTabComponent, MedicosTabComponent],
  templateUrl: './citas.component.html',
})
export class CitasComponent implements OnInit {
  activeTab: 'citas' | 'medicos' = 'citas';

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly route: ActivatedRoute, private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['tab'] === 'medicos') this.activeTab = 'medicos';
      });
  }
}
