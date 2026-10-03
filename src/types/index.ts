// ============================================================================
// DonDomi - Data Models & Types
// Plataforma de Comida y Domicilios - Valledupar, Cesar, Colombia
// Diseñado para escalabilidad progresiva y compatibilidad con base de datos (PostgreSQL/Supabase)
// ============================================================================

export type UserRole = 'CLIENTE' | 'RESTAURANTE' | 'ADMINISTRADOR' | 'DOMICILIARIO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId?: string;
  label: string; // Ej: "Casa", "Trabajo", "Donde mi tía"
  street: string; // Ej: "Carrera 9 # 12-45"
  neighborhood: string; // Ej: "Los Cortijos", "Novalito", "Centro", "Alfonso López"
  city: string; // "Valledupar"
  reference?: string; // Ej: "Portón blanco frente al parque"
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface FoodCategory {
  id: string;
  name: string;
  slug: string;
  icon: string; // Emoji o nombre de icono Lucide
  imageUrl?: string;
  badge?: string; // Ej: "Top", "Nuevo"
}

export interface ProductOptionItem {
  id: string;
  name: string; // Ej: "Papas a la francesa", "Yuca frita", "Coca-Cola 400ml"
  additionalPrice: number; // en pesos COP
}

export interface ProductOptionGroup {
  id: string;
  name: string; // Ej: "Elige tu acompañamiento", "Bebida", "Término de la carne"
  required: boolean;
  minSelect: number;
  maxSelect: number;
  items: ProductOptionItem[];
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryName: string; // Ej: "Pollo Asado", "Hamburguesas", "Bebidas"
  name: string;
  description: string;
  price: number; // en COP, ej: 28000
  originalPrice?: number; // Para mostrar descuentos, ej: 32000
  imageUrl?: string; // Opcional, para permitir menús 100% textuales
  isAvailable: boolean;
  isPopular?: boolean;
  preparationTimeMin?: number;
  options?: ProductOptionGroup[];
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  rating: number; // Ej: 4.8
  reviewsCount: number;
  tags: string[]; // Ej: ["Pollo Asado", "Parrilla", "Tradicional"]
  address: string; // Ej: "Calle 12 # 8-30, Centro"
  neighborhood: string; // Ej: "Centro", "Novalito"
  phone: string;
  isOpen: boolean;
  openingHours: string; // Ej: "11:00 AM - 10:30 PM"
  estimatedTimeMin: number; // Ej: 25
  estimatedTimeMax: number; // Ej: 40
  deliveryFeeBase: number; // Base en COP, ej: 7000
  minOrderAmount: number; // Ej: 15000
  commissionRate: number; // Porcentaje, ej: 0 a 10%
  acceptsCash: boolean;
  acceptsNequi: boolean;
  acceptsDaviplata: boolean;
  acceptsBreb?: boolean; // Llave Bre-B (Transferencias interbancarias inmediatas)
  acceptsCard?: boolean; // Tarjetas crédito/débito (vía Wompi u otra pasarela)
  featured?: boolean;
  pin?: string; // PIN de 4 dígitos para acceso exclusivo de la cocina en /merchant
}

export type OrderStatus =
  | 'PENDING'            // Recibido, esperando confirmación del restaurante
  | 'CONFIRMED'          // Restaurante aceptó el pedido
  | 'PREPARING'          // En cocina / preparación
  | 'READY_FOR_PICKUP'   // Empacado, listo para domiciliario
  | 'ON_THE_WAY'         // En camino hacia el cliente
  | 'DELIVERED'          // Entregado con éxito
  | 'CANCELLED';         // Cancelado

export type PaymentMethod = 'EFECTIVO' | 'CASH' | 'NEQUI' | 'BRE_B' | 'DAVIPLATA' | 'CARD';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface SelectedOption {
  groupName: string;
  itemName: string;
  price: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: SelectedOption[];
  notes?: string; // Ej: "Sin cebolla por favor"
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string; // Ej: "DD-1042"
  customerId: string;
  customerName: string;
  customerPhone: string;
  restaurantId: string;
  restaurantName: string;
  driverId?: string;
  driverName?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: Address;
  customerNotes?: string;
  createdAt: string;
  estimatedDeliveryTime?: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  phone: string;
  vehicleType: 'MOTO' | 'BICICLETA';
  licensePlate?: string;
  isAvailable: boolean;
  currentZone: string; // Ej: "Norte - Novalito"
  rating: number;
  completedDeliveries: number;
  activeOrderId?: string;
}

export interface DeliveryAssignment {
  id: string;
  orderId: string;
  driverId: string;
  status: 'OFFERED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'REJECTED';
  assignedAt: string;
  acceptedAt?: string;
  deliveredAt?: string;
  feeAmount: number;
}

export interface Commission {
  id: string;
  orderId: string;
  restaurantId: string;
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  platformEarnings: number;
  createdAt: string;
}

export interface Settlement {
  id: string;
  restaurantId: string;
  periodStart: string;
  periodEnd: string;
  totalOrders: number;
  totalSales: number;
  totalCommissions: number;
  payoutAmount: number;
  status: 'PENDING' | 'PAID';
  paidAt?: string;
}
