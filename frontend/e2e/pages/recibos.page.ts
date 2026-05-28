import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Recibos page (/recibos) and the Nuevo Cobro modal
 * (app-nuevo-cobro component).
 */
export class RecibosPage {
  readonly nuevoCobroButton: Locator;
  readonly searchInput: Locator;
  readonly tableRows: Locator;

  constructor(private readonly page: Page) {
    this.nuevoCobroButton = page.getByRole('button', { name: /Nuevo Cobro|nuevo cobro/i });
    this.searchInput = page.getByRole('textbox', { name: /buscar|folio|search/i }).first();
    this.tableRows = page.locator('table tbody tr');
  }

  /** Navigate to the recibos page. */
  async goto(): Promise<void> {
    await this.page.goto('/recibos');
    await this.page.waitForURL('**/recibos**', { timeout: 10000 });
  }

  /** Click "Nuevo Cobro" to open the nuevo-cobro modal. */
  async openNuevoCobro(): Promise<void> {
    await this.nuevoCobroButton.click();
    // app-nuevo-cobro host element has 0×0 layout (content is fixed-positioned),
    // so Playwright reports it as "hidden". Wait for the inner white panel instead.
    await this.page.locator('app-nuevo-cobro .bg-white.rounded-3xl, app-nuevo-cobro [class*="rounded-3xl"]').first().waitFor({ state: 'visible', timeout: 8000 });
  }

  /**
   * Interact with the beneficiario combobox inside the Nuevo Cobro modal.
   * - Types `searchText` in the combobox input
   * - Waits for the dropdown to appear
   * - Clicks the option whose folio matches `folioToClick`
   *
   * After clicking the selected item, the input should have green border (emerald-400).
   */
  async selectBeneficiario(searchText: string, folioToClick: string): Promise<void> {
    const modal = this.page.locator('app-nuevo-cobro');
    const combobox = modal.locator('app-beneficiario-combobox input[type="text"]');

    await combobox.fill(searchText);

    // Wait for dropdown items to appear
    const dropdown = modal.locator('app-beneficiario-combobox button[type="button"]').first();
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Click the option matching the folio
    const option = modal
      .locator('app-beneficiario-combobox button[type="button"]')
      .filter({ hasText: folioToClick });
    await option.first().click();

    // Verify the input now has the green border class (emerald-400)
    await expect(combobox).toHaveClass(/border-emerald-400/, { timeout: 3000 });
  }

  /**
   * Inside the Nuevo Cobro modal catalog:
   * - Click the given tab ("Servicios", "Laboratorio", or "Productos")
   * - Find the item by name
   * - Set its quantity
   */
  async addServiceFromCatalog(tabName: string, itemName: string, quantity: number): Promise<void> {
    const modal = this.page.locator('app-nuevo-cobro');

    // Click the catalog tab
    const tab = modal.getByRole('button', { name: new RegExp(tabName, 'i') });
    await tab.click();

    // Wait for the catalog items to load/show
    await this.page.waitForTimeout(300);

    // Find the row for this item and set quantity
    const itemRow = modal.locator('[class*="catalog"], div, tr').filter({ hasText: itemName }).first();

    // Click the + button `quantity` times (or use the quantity input)
    const quantityInput = itemRow.locator('input[type="number"]');
    if (await quantityInput.count() > 0) {
      await quantityInput.fill(String(quantity));
    } else {
      // Use + button
      const plusBtn = itemRow.getByRole('button', { name: /\+/ });
      for (let i = 0; i < quantity; i++) {
        await plusBtn.click();
      }
    }

    // Check the checkbox if present
    const checkbox = itemRow.locator('input[type="checkbox"]');
    if (await checkbox.count() > 0 && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  /**
   * Click "Agregar N conceptos al cobro" button.
   */
  async clickAgregarSeleccionados(): Promise<void> {
    const modal = this.page.locator('app-nuevo-cobro');
    const agregarBtn = modal.getByRole('button', { name: /Agregar.*conceptos|Agregar al cobro/i });
    await agregarBtn.click();
  }

  /**
   * Set a payment row (0-indexed) in the Nuevo Cobro modal.
   * - `methodId`: value for the <select> (the string value, e.g. "1" for EFECTIVO)
   * - `monto`: amount to enter in the monto input
   */
  async setMetodoPago(index: number, methodId: string, monto: number): Promise<void> {
    const modal = this.page.locator('app-nuevo-cobro');

    // Payment rows have class "items-end flex gap-3" or similar
    const paymentRows = modal.locator('div').filter({ has: modal.locator('select') });

    // If no payment rows exist yet, click "Agregar método de pago" first
    const addPaymentBtn = modal.getByRole('button', { name: /Agregar m[eé]todo|a[ñn]adir m[eé]todo/i });
    if (index === 0 && (await addPaymentBtn.count()) > 0) {
      // Try clicking add button only if rows are less than needed
      const currentRows = await paymentRows.count();
      if (currentRows <= index) {
        await addPaymentBtn.click();
        await this.page.waitForTimeout(200);
      }
    }

    // Re-query after possible addition
    const selects = modal.locator('select');
    const inputs = modal.locator('input[type="number"][placeholder*="onto"], input[type="number"]').filter({ hasNot: modal.locator('[aria-hidden]') });

    if (index < (await selects.count())) {
      await selects.nth(index).selectOption(methodId);
    }
    if (index < (await inputs.count())) {
      await inputs.nth(index).fill(String(monto));
      await inputs.nth(index).press('Tab');
    }
  }

  /**
   * Click the guardar/submit button in the Nuevo Cobro modal.
   */
  async submitCobro(): Promise<void> {
    const modal = this.page.locator('app-nuevo-cobro');
    const guardarBtn = modal.getByRole('button', { name: /Guardar|Registrar cobro|Cobrar/i });
    await guardarBtn.click();
  }

  /** Assert that the modal is open (checks inner panel, not host element). */
  async expectModalOpen(): Promise<void> {
    await expect(
      this.page.locator('app-nuevo-cobro .bg-white.rounded-3xl, app-nuevo-cobro [class*="rounded-3xl"]').first()
    ).toBeVisible({ timeout: 5000 });
  }

  /** Assert that the modal is closed. */
  async expectModalClosed(): Promise<void> {
    // When @if removes app-nuevo-cobro from DOM, the inner panel disappears too
    await expect(
      this.page.locator('app-nuevo-cobro .bg-white.rounded-3xl, app-nuevo-cobro [class*="rounded-3xl"]').first()
    ).toBeHidden({ timeout: 5000 });
  }

  /** Assert that the recibos table contains the given text. */
  async expectRecibosContain(text: string): Promise<void> {
    await expect(this.page.locator('table')).toContainText(text, { timeout: 5000 });
  }
}
