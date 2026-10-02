/**
 * DonDomi - Motor de Cálculo de Tarifas de Domicilio para Valledupar
 * 
 * En Valledupar, los domicilios varían principalmente por sectores:
 * - Sector Centro / Novalito / Los Cortijos (Zonas céntricas y norte tradicional)
 * - Sector La Nevada / Don Alberto / Villa Ligia (Zonas noroccidente / norte extendido)
 * - Sector Los Fundadores / Cinco de Noviembre / San Joaquín (Sur y centro-oriente)
 */

interface ZoneDistanceTier {
  extraFee: number;
  extraTimeMin: number;
}

const ZONE_DISTANCES: Record<string, Record<string, ZoneDistanceTier>> = {
  'Centro Histórico': {
    'Centro Histórico': { extraFee: 0, extraTimeMin: 0 },
    'Novalito': { extraFee: 1000, extraTimeMin: 5 },
    'Los Cortijos': { extraFee: 1500, extraTimeMin: 8 },
    'San Joaquín': { extraFee: 1500, extraTimeMin: 8 },
    'Alfonso López': { extraFee: 1000, extraTimeMin: 5 },
    'Cinco de Noviembre': { extraFee: 1500, extraTimeMin: 8 },
    'La Nevada': { extraFee: 3000, extraTimeMin: 15 },
    'Don Alberto': { extraFee: 3500, extraTimeMin: 15 },
    'Villa Ligia': { extraFee: 3000, extraTimeMin: 12 },
  },
  'Novalito': {
    'Novalito': { extraFee: 0, extraTimeMin: 0 },
    'Centro Histórico': { extraFee: 1000, extraTimeMin: 5 },
    'Los Cortijos': { extraFee: 1000, extraTimeMin: 5 },
    'San Joaquín': { extraFee: 1500, extraTimeMin: 7 },
    'Alfonso López': { extraFee: 1500, extraTimeMin: 8 },
    'La Nevada': { extraFee: 2500, extraTimeMin: 12 },
    'Don Alberto': { extraFee: 3000, extraTimeMin: 12 },
    'Villa Ligia': { extraFee: 2000, extraTimeMin: 10 },
  },
  'Los Cortijos': {
    'Los Cortijos': { extraFee: 0, extraTimeMin: 0 },
    'Novalito': { extraFee: 1000, extraTimeMin: 5 },
    'Centro Histórico': { extraFee: 1500, extraTimeMin: 8 },
    'San Joaquín': { extraFee: 1000, extraTimeMin: 5 },
    'La Nevada': { extraFee: 2500, extraTimeMin: 10 },
    'Don Alberto': { extraFee: 2500, extraTimeMin: 10 },
  },
};

export function calculateDeliveryEstimate(
  restaurantNeighborhood: string,
  customerNeighborhood: string,
  baseFee: number = 5000,
  baseMinTime: number = 25,
  baseMaxTime: number = 35
) {
  // Si coinciden los barrios
  if (restaurantNeighborhood === customerNeighborhood) {
    return {
      fee: baseFee,
      timeMin: baseMinTime,
      timeMax: baseMaxTime,
      isSameZone: true,
    };
  }

  // Buscar recargo de matriz
  const tier =
    ZONE_DISTANCES[restaurantNeighborhood]?.[customerNeighborhood] ||
    ZONE_DISTANCES[customerNeighborhood]?.[restaurantNeighborhood];

  if (tier) {
    return {
      fee: baseFee + tier.extraFee,
      timeMin: baseMinTime + tier.extraTimeMin,
      timeMax: baseMaxTime + tier.extraTimeMin,
      isSameZone: false,
    };
  }

  // Tarifa por defecto para barrios periféricos
  return {
    fee: baseFee + 2000,
    timeMin: baseMinTime + 10,
    timeMax: baseMaxTime + 10,
    isSameZone: false,
  };
}
