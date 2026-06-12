import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer.component';
import { AuthService } from '../../services/auth.service';
import { ActivosTabComponent } from './tabs/activos-tab/activos-tab.component';
import { InactivosTabComponent } from './tabs/inactivos-tab/inactivos-tab.component';
import { PreregistrosTabComponent } from './tabs/preregistros-tab/preregistros-tab.component';

@Component({
  selector: 'app-beneficiarios',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, ActivosTabComponent, InactivosTabComponent, PreregistrosTabComponent],
  templateUrl: './beneficiarios.component.html',
})
export class BeneficiariosComponent implements OnInit {
  currentTab: 'activos' | 'inactivos' | 'preregistros' = 'activos';
  beneficiariosCount = 0;
  inactivosCount = 0;
  preregistrosCount = 0;
  refreshActivosKey = 0;

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  private readonly destroyRef = inject(DestroyRef);

  constructor(private readonly route: ActivatedRoute, private readonly auth: AuthService) {}

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        if (params['action'] === 'nuevo') this.currentTab = 'activos';
      });
  }

  onBeneficiarioReactivado(): void {
    this.refreshActivosKey++;
  }
}
