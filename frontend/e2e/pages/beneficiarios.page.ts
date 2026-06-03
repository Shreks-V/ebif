import { Page, Locator, expect } from '@playwright/test';

export interface NuevoBeneficiarioForm {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  correo?: string;
  /** Fills "Telefono Celular" */
  telefono?: string;
  fechaNacimiento?: string;
  /** Value must match a select option, e.g. 'Masculino' | 'Femenino' */
  genero?: string;
  /** Value must match select option value, e.g. 'CUOTA A' | 'CUOTA B' */
  tipoCuota?: string;
  /** Value must match select option value, e.g. 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO' */
  membresiasEstatus?: string;
  curp?: string;
  estado?: string;
}

/**
 * Page Object for the Beneficiarios page (/registro-usuarios).
 * Wraps the activos-tab component which has the main table.
 */
export class BeneficiariosPage {
  readonly searchInput: Locator;
  readonly nuevoButton: Locator;
  readonly tableRows: Locator;

  constructor(private readonly page: Page) {
    // Search input: aria-label="Buscar por nombre, folio, CURP o membresía..."
    this.searchInput = page.getByRole('textbox', { name: /Buscar por nombre/i });
    // "Nuevo Beneficiario" button
    this.nuevoButton = page.getByRole('button', { name: /Nuevo Beneficiario/i });
    // Table body rows (data rows only)
    this.tableRows = page.locator('table tbody tr');
  }

  /** Navigate to the beneficiarios page. */
  async goto(): Promise<void> {
    await this.page.goto('/registro-usuarios');
    // Wait for Angular to bootstrap and render the page heading
    // (using element presence rather than URL to avoid timing race with auth guard)
    await this.page.waitForSelector('h1', { timeout: 12000 });
  }

  /** Type in the search box. */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Debounce — small wait for Angular's ngModelChange to fire
    await this.page.waitForTimeout(400);
  }

  /** Click "Nuevo Beneficiario" to open the modal. */
  async openNuevo(): Promise<void> {
    await this.nuevoButton.click();
    // Wait for the modal to appear
    await this.page.waitForSelector('text=Nuevo Beneficiario', { timeout: 5000 });
  }

  /**
   * Click the edit/detail button on a given row (0-indexed).
   * The activos-tab renders action buttons per row.
   */
  async openEdit(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    // Click the first action button (detail/edit icon) in that row
    const actionBtn = row.locator('button').first();
    await actionBtn.click();
  }

  /**
   * Fill the Nuevo Beneficiario modal form.
   * Field labels come from the nuevo-beneficiario-modal component.
   */
  async fillNuevoForm(data: NuevoBeneficiarioForm): Promise<void> {
    const modal = this.page.locator('app-nuevo-beneficiario-modal, [class*="modal"]').first();

    // Use .first() to guard against multiple label matches (strict mode safety)
    const fillField = async (label: string | RegExp, value: string) => {
      const field = modal.getByLabel(label).first();
      await field.fill(value);
    };

    // Select-element helper (fill() doesn't work on <select>)
    const selectField = async (label: string | RegExp, value: string) => {
      const field = modal.getByLabel(label).first();
      await field.selectOption(value);
    };

    // Use exact label text for "Nombre *" to avoid strict-mode violation
    // (the form also has "Nombre del Padre/Madre" which matches /nombre/i)
    const nombreField = modal.getByLabel('Nombre *', { exact: true });
    await nombreField.fill(data.nombre);
    await fillField(/apellido paterno/i, data.apellidoPaterno);

    if (data.apellidoMaterno) {
      await fillField(/apellido materno/i, data.apellidoMaterno);
    }
    if (data.genero) {
      // "Genero *" is a <select> — use selectOption with the option value
      await selectField(/genero/i, data.genero);
    }
    if (data.correo) {
      await fillField(/correo/i, data.correo);
    }
    if (data.telefono) {
      // Use exact label "Telefono Celular" to avoid matching Casa/Emergencia too
      await fillField('Telefono Celular', data.telefono);
    }
    if (data.fechaNacimiento) {
      await fillField(/fecha de nacimiento|nacimiento/i, data.fechaNacimiento);
    }
    if (data.curp) {
      await fillField(/curp/i, data.curp);
    }
    if (data.tipoCuota) {
      // "Tipo de Cuota *" is a <select>
      await selectField(/tipo de cuota/i, data.tipoCuota);
    }
    if (data.membresiasEstatus) {
      // "Estatus de Membresia *" is a <select>
      await selectField(/estatus de membresia/i, data.membresiasEstatus);
    }
  }

  /** Click the primary submit button inside the open nuevo-beneficiario modal. */
  async submit(): Promise<void> {
    // app-nuevo-beneficiario-modal host has 0×0 layout (fixed-position content).
    // Find the submit button inside the component (button type=submit or matching text).
    const submitBtn = this.page
      .locator('app-nuevo-beneficiario-modal button[type="submit"]')
      .first();
    await submitBtn.click();
  }

  /** Assert that at least one row contains the given text. */
  async expectRowContains(text: string): Promise<void> {
    await expect(this.page.locator('table tbody')).toContainText(text, { timeout: 5000 });
  }

  /** Assert the number of visible rows. */
  async expectRowCount(count: number): Promise<void> {
    await expect(this.tableRows).toHaveCount(count, { timeout: 5000 });
  }

  /** Click the "Renovar membresía" button on a row (found by text near beneficiario). */
  async openRenovarMembresia(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    const renovarBtn = row.getByRole('button', { name: /Renovar|renovar/i });
    await renovarBtn.click();
  }

  /** Click the historial button on a given row. */
  async openHistorial(rowIndex: number): Promise<void> {
    const row = this.tableRows.nth(rowIndex);
    // Historial button — may be labeled "Historial" or have a history icon
    const histBtn = row.getByRole('button', { name: /Historial|historial/i });
    if (await histBtn.count() > 0) {
      await histBtn.click();
    } else {
      // Fall back to the last action button in the row
      const btns = row.locator('button');
      await btns.last().click();
    }
  }
}
