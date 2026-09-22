import { describe, it, expect, beforeEach } from 'vitest';
import { runStorageMigration } from '../storageMigration';
import { useStore, rehydrateStoreFromStorage, GUEST_USER } from '../../store/useStore';

describe('Storage Migration & Guest Authentication Invariant (Directive 8)', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      currentUser: GUEST_USER,
      authStatus: 'GUEST',
      addresses: [],
      activeAddress: null,
      shippingAddress: null,
      billingAddress: null
    });
  });

  it('purges stale mock user (Nilesh Patel / u_epc_procure) from localStorage', () => {
    localStorage.setItem('apollo_current_user', JSON.stringify({
      id: 'u_epc_procure',
      name: 'Nilesh Patel',
      email: 'nilesh@apolloengineering.co.in',
      role: 'B2B_APPROVER'
    }));

    runStorageMigration();

    expect(localStorage.getItem('apollo_current_user')).toBeNull();
  });

  it('purges stale mock addresses containing Nilesh Patel from localStorage', () => {
    localStorage.setItem('apollo_addresses', JSON.stringify([
      {
        id: 'addr_epc_01',
        userId: 'u_epc_procure',
        fullName: 'Nilesh Patel',
        phone: '9825012345',
        flatBuilding: 'Plot 42',
        streetArea: 'Kathwada GIDC',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '382430'
      }
    ]));

    runStorageMigration();

    expect(localStorage.getItem('apollo_addresses')).toBeNull();
  });

  it('rehydrateStoreFromStorage strictly never elevates to AUTHENTICATED from localStorage', () => {
    localStorage.setItem('apollo_current_user', JSON.stringify({
      id: 'usr_valid_looking_id',
      name: 'Unverified Visitor',
      email: 'visitor@example.com',
      role: 'B2C_CUSTOMER'
    }));

    rehydrateStoreFromStorage();

    const state = useStore.getState();
    expect(state.authStatus).toBe('GUEST');
    expect(state.currentUser.id).toBe('usr_guest');
    expect(state.currentUser.name).toBe('');
  });

  it('guarantees guest starts with empty addresses and null activeAddress', () => {
    rehydrateStoreFromStorage();

    const state = useStore.getState();
    expect(state.authStatus).toBe('GUEST');
    expect(state.activeAddress).toBeNull();
    expect(state.shippingAddress).toBeNull();
    expect(state.billingAddress).toBeNull();
  });
});
