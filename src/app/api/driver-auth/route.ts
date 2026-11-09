import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  hashPassword,
  validateDriverPasswordPolicy,
  verifyPasswordHash,
} from '@/lib/passwordHash';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'hash') {
      const rawPassword = String(body?.password || '').trim();
      const validation = validateDriverPasswordPolicy(rawPassword);
      if (!validation.valid) {
        return NextResponse.json(
          { ok: false, error: validation.error },
          { status: 400 }
        );
      }
      const passwordHash = hashPassword(rawPassword);
      return NextResponse.json({ ok: true, passwordHash });
    }

    if (action === 'verify') {
      const rawIdentifier = String(body?.identifier || '').trim().toLowerCase();
      const rawPassword = String(body?.password || '').trim();

      if (!rawIdentifier || !rawPassword) {
        return NextResponse.json(
          { ok: false, error: 'Ingresa tu identificador y tu contraseña.' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('drivers')
        .select(
          'id, user_id, name, phone, email, plate, vehicle_type, is_active, is_available, rating, total_deliveries, password_hash, created_at'
        );

      if (error) {
        const code = error.code || '';
        if (code === '42703' || code === 'PGRST204' || code === '42P01') {
          return NextResponse.json(
            {
              ok: false,
              error:
                'La tabla drivers en Supabase aún no tiene aplicada la migración de contraseña segura (password_hash). Ejecuta la migración SQL pendiente.',
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            ok: false,
            error: `Error consultando credenciales en Supabase: ${error.message || 'fallo de conexión'}`,
          },
          { status: 500 }
        );
      }

      const cleanDigits = rawIdentifier.replace(/\D/g, '');
      const matched = (data || []).find((row: any) => {
        const emailMatch =
          typeof row.email === 'string' && row.email.trim().toLowerCase() === rawIdentifier;
        const idMatch =
          typeof row.id === 'string' && row.id.trim().toLowerCase() === rawIdentifier;
        const phoneDigits = String(row.phone || '').replace(/\D/g, '');
        const phoneMatch = cleanDigits.length === 10 && phoneDigits === cleanDigits;
        return emailMatch || idMatch || phoneMatch;
      });

      if (!matched) {
        return NextResponse.json(
          { ok: false, error: 'Credenciales de domiciliario inválidas.' },
          { status: 401 }
        );
      }

      if (matched.is_active === false) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Tu cuenta de domiciliario se encuentra suspendida temporalmente por la administración.',
          },
          { status: 403 }
        );
      }

      let isValid = false;
      if (matched.password_hash) {
        isValid = verifyPasswordHash(rawPassword, matched.password_hash);
      } else {
        // Contraseña predeterminada de prueba para flota inicial mientras el admin le asigna una personalizada
        isValid = rawPassword === 'domi2026' || rawPassword === '123456';
      }

      if (!isValid) {
        return NextResponse.json(
          { ok: false, error: 'Credenciales de domiciliario inválidas.' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        ok: true,
        driver: {
          id: matched.id,
          userId: matched.user_id || undefined,
          name: matched.name,
          phone: matched.phone,
          email: matched.email,
          plate: matched.plate,
          vehicleType: matched.vehicle_type || 'MOTO',
          isActive: matched.is_active ?? true,
          isAvailable: matched.is_available ?? true,
          rating: Number(matched.rating) || 5.0,
          totalDeliveries: Number(matched.total_deliveries) || 0,
          createdAt: matched.created_at || new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Acción no soportada.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error interno en autenticación de domiciliarios.' },
      { status: 500 }
    );
  }
}
