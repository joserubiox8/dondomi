export const FORBIDDEN_DEMO_CREDENTIALS = new Set([
  '1234',
  '0000',
  '1111',
  'domi1234',
  '123456',
  'password',
  'admin',
]);

export function validateDriverPasswordPolicy(rawPassword: string): {
  valid: boolean;
  error?: string;
} {
  const clean = rawPassword.trim();
  if (clean.length < 6) {
    return {
      valid: false,
      error: 'La contraseña del domiciliario debe tener al menos 6 caracteres.',
    };
  }
  if (FORBIDDEN_DEMO_CREDENTIALS.has(clean.toLowerCase())) {
    return {
      valid: false,
      error: 'No se permite usar credenciales de prueba o valores triviales como contraseña.',
    };
  }
  return { valid: true };
}
