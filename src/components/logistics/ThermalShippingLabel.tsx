import React from 'react';
import { Order } from '../../types';
import { StandardThermalShippingLabel } from '../admin/StandardThermalShippingLabel';

interface ThermalShippingLabelProps {
  order: Order;
  packageIndex?: number;
  onClose: () => void;
}

/**
 * Standard Apollo A6 Thermal Shipping Label Wrapper
 * Standardized across entire logistics and dispatch pipeline (104mm × 148mm).
 */
export const ThermalShippingLabel: React.FC<ThermalShippingLabelProps> = ({ order, onClose }) => {
  return <StandardThermalShippingLabel order={order} onClose={onClose} />;
};
