/**
 * DonDomi - Motor de Tarifas de Domicilio para Valledupar
 * 
 * Tarifa plana fija inicial: $7.000 COP para todo Valledupar.
 * Garantiza total transparencia comercial y elimina asunciones de distancia en el MVP.
 * Permite actualización dinámica respetando la tarifa global establecida por la plataforma.
 */

import { DEFAULT_VALLEDUPAR_DELIVERY_FEE } from './pricing';

export const FLAT_DELIVERY_FEE = DEFAULT_VALLEDUPAR_DELIVERY_FEE;

export function calculateDeliveryEstimate(
  restaurantNeighborhood: string,
  customerNeighborhood: string,
  baseFee: number = DEFAULT_VALLEDUPAR_DELIVERY_FEE,
  baseMinTime: number = 25,
  baseMaxTime: number = 40
) {
  const isSameZone = restaurantNeighborhood === customerNeighborhood;
  const effectiveFee = typeof baseFee === 'number' && !isNaN(baseFee) && baseFee > 0
    ? baseFee
    : DEFAULT_VALLEDUPAR_DELIVERY_FEE;

  return {
    fee: effectiveFee,
    timeMin: isSameZone ? baseMinTime : baseMinTime + 5,
    timeMax: isSameZone ? baseMaxTime : baseMaxTime + 10,
    isSameZone,
    label: 'Tarifa fija Valledupar',
  };
}
