import { Page, Locator, expect } from '@playwright/test';

type NavModule =
  | 'dashboard'
  | 'recibos'
  | 'beneficiarios'
  | 'citas'
  | 'almacen'
  | 'reportes'
  | 'perfil'
  | 'usuarios-sistema'
  | 'bitacora';

const NAV_ROUTES: Record<NavModule, string> = {
  dashboard: '/dashboard',
  recibos: '/recibos',
  beneficiarios: '/registro-usuarios',
  citas: '/citas',
  almacen: '/almacen',
  reportes: '/reportes',
  perfil: '/perfil',
  'usuarios-sistema': '/usuarios-sistema',
  bitacora: '/bitacora',
};

/**
 * Page Object for the shared Navbar component (navbar.component.html).
 */
export class NavPage {
  /** The user name/button in the top-right user menu trigger */
  readonly userMenuButton: Locator;

  constructor(private readonly page: Page) {
    // The user menu trigger is a button containing the user's initials + name
    this.userMenuButton = page
      .locator('nav button')
      .filter({ hasText: /Admin|Recepcionista/i })
      .first();
  }

  /**
   * Click a nav link by module name and wait for URL to update.
   * Uses routerLink text matching from the navbar HTML.
   */
  async navigateTo(module: NavModule): Promise<void> {
    const route = NAV_ROUTES[module];

    const linkTexts: Record<NavModule, string | RegExp> = {
      dashboard: /^Inicio$/i,
      recibos: /^Recibos$/i,
      beneficiarios: /^Beneficiarios$/i,
      citas: /^Citas$/i,
      almacen: /Almac[eé]n/i,
      reportes: /^Reportes$/i,
      perfil: /Mi Perfil/i,
      'usuarios-sistema': /Gestión de usuarios|Usuarios del Sistema/i,
      bitacora: /Bit[aá]cora/i,
    };

    const navBar = this.page.locator('nav').first();
    const link = navBar.getByRole('link', { name: linkTexts[module] }).first();

    await Promise.all([
      this.page.waitForURL(`**${route}**`, { timeout: 10000 }),
      link.click(),
    ]);
  }

  /**
   * Open the user dropdown menu and click "Cerrar sesión".
   */
  async logout(): Promise<void> {
    // Open the user menu
    const userMenuTrigger = this.page
      .locator('nav div.hidden.lg\\:block button')
      .filter({ has: this.page.locator('div.w-8.h-8.rounded-lg') })
      .first();

    await userMenuTrigger.click();

    // Click logout button
    const logoutBtn = this.page.getByRole('button', { name: /Cerrar sesión|Salir/i }).first();
    await logoutBtn.waitFor({ state: 'visible', timeout: 5000 });

    await Promise.all([
      this.page.waitForURL('**/', { timeout: 10000 }),
      logoutBtn.click(),
    ]);
  }

  /**
   * Assert that the navbar displays the given user name.
   */
  async expectUserName(name: string | RegExp): Promise<void> {
    const nav = this.page.locator('nav').first();
    await expect(nav).toContainText(name, { timeout: 5000 });
  }

  /**
   * Assert that we are on the given route.
   */
  async expectRoute(route: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(route.replace('/', '\\/')), { timeout: 8000 });
  }
}
