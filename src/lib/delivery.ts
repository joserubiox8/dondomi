/**
 * DonDomi - Motor de Tarifas de Domicilio para Valledupar
 * 
 * Tarifa plana fija inicial: $7.000 COP para todo Valledupar.
 * Garantiza total transparencia comercial y elimina asunciones de distancia en el MVP.
 */

export const FLAT_DELIVERY_FEE = 7000;

export function calculateDeliveryEstimate(
  restaurantNeighborhood: string,
  customerNeighborhood: string,
  baseFee: number = 7000,
  baseMinTime: number = 25,
  baseMaxTime: number = 40
) {
  const isSameZone = restaurantNeighborhood === customerNeighborhood;

  return {
    fee: FLAT_DELIVERY_FEE,
    timeMin: isSameZone ? baseMinTime : baseMinTime + 5,
    timeMax: isSameZone ? baseMaxTime : baseMaxTime + 10,
    isSameZone,
    label: 'Tarifa fija Valledupar',
  };
}
