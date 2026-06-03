import { Injectable } from '@angular/core';

export interface PaginationState {
  page: number;
  pageSize: number;
}

/**
 * Composing Method: pagination logic extracted from components.
 * Used by beneficiarios, recibos, citas, almacen and others.
 */
@Injectable({ providedIn: 'root' })
export class PaginationService {
  createState(pageSize = 20): PaginationState {
    return { page: 1, pageSize };
  }

  paginate<T>(items: T[], state: PaginationState): T[] {
    const start = (state.page - 1) * state.pageSize;
    return items.slice(start, start + state.pageSize);
  }

  startIndex(state: PaginationState): number {
    return (state.page - 1) * state.pageSize;
  }

  endIndex(items: unknown[], state: PaginationState): number {
    return Math.min(this.startIndex(state) + state.pageSize, items.length);
  }

  totalPages(items: unknown[], state: PaginationState): number {
    return Math.ceil(items.length / state.pageSize) || 1;
  }

  goTo(state: PaginationState, page: number, totalItems: number): PaginationState {
    const max = Math.ceil(totalItems / state.pageSize) || 1;
    return { ...state, page: Math.max(1, Math.min(page, max)) };
  }

  next(state: PaginationState, totalItems: number): PaginationState {
    return this.goTo(state, state.page + 1, totalItems);
  }

  prev(state: PaginationState): PaginationState {
    return { ...state, page: Math.max(1, state.page - 1) };
  }

  reset(state: PaginationState): PaginationState {
    return { ...state, page: 1 };
  }
}
