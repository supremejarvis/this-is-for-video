/**
 * Apollo Engineering — Authoritative Order Lifecycle State Machine
 * Strictly governs order status transitions and prevents illegal jumps.
 */

import { OrderLifecycleState } from './types';

const VALID_TRANSITIONS: Record<OrderLifecycleState, OrderLifecycleState[]> = {
  DRAFT: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'RECONCILIATION_PENDING', 'CANCELLED'],
  RECONCILIATION_PENDING: ['PAID', 'CANCELLED'], // Direct UPI: transitions to PAID only upon admin approval
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'REPLACEMENT_REQUESTED'],
  DELIVERED: ['REPLACEMENT_REQUESTED'],
  REPLACEMENT_REQUESTED: ['REPLACEMENT_APPROVED', 'DELIVERED'],
  REPLACEMENT_APPROVED: ['REPLACED'],
  REPLACED: [],
  CANCELLED: []
};

export class OrderStateMachine {
  public static canTransition(current: OrderLifecycleState, next: OrderLifecycleState): boolean {
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  public static transition(
    current: OrderLifecycleState,
    next: OrderLifecycleState,
    context?: { reason?: string; adminApproved?: boolean }
  ): OrderLifecycleState {
    if (!this.canTransition(current, next)) {
      throw new Error(
        `[Illegal State Transition]: Cannot transition order from state "${current}" to "${next}".`
      );
    }

    // Direct UPI strict guard: cannot mark PAID from RECONCILIATION_PENDING without explicit admin approval
    if (current === 'RECONCILIATION_PENDING' && next === 'PAID') {
      if (!context?.adminApproved) {
        throw new Error(
          '[Security Guard]: Direct UPI order requires explicit admin reconciliation before marking PAID.'
        );
      }
    }

    return next;
  }
}
