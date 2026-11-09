import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { INITIAL_DRIVERS } from '@/data/mockData';
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
      const localDriver = body?.localDriver || null;

      if (!rawIdentifier || !rawPassword) {
        return NextResponse.json(
          { ok: false, error: 'Ingresa tu identificador y tu contraseña.' },
          { status: 400 }
        );
      }

      const { data } = await supabase.from('drivers').select('*');

      const cleanDigits = rawIdentifier.replace(/\D/g, '');
      let matched = (data || []).find((row: any) => {
        const emailMatch =
          typeof row.email === 'string' && row.email.trim().toLowerCase() === rawIdentifier;
        const idMatch =
          typeof row.id === 'string' && row.id.trim().toLowerCase() === rawIdentifier;
        const phoneDigits = String(row.phone || '').replace(/\D/g, '');
        const phoneMatch = cleanDigits.length === 10 && phoneDigits === cleanDigits;
        return emailMatch || idMatch || phoneMatch;
      });

      if (!matched && localDriver) {
        matched = {
          id: localDriver.id,
          user_id: localDriver.userId,
          name: localDriver.name,
          phone: localDriver.phone,
          email: localDriver.email,
          plate: localDriver.plate,
          vehicle_type: localDriver.vehicleType || 'MOTO',
          is_active: localDriver.isActive ?? true,
          is_available: localDriver.isAvailable ?? true,
          rating: localDriver.rating ?? 5.0,
          total_deliveries: localDriver.totalDeliveries ?? 0,
          password_hash: localDriver.passwordHash,
          created_at: localDriver.createdAt,
        };
      }

      if (!matched) {
        const seedMatch = INITIAL_DRIVERS.find((d) => {
          const emailMatch = d.email.trim().toLowerCase() === rawIdentifier;
          const idMatch = d.id.trim().toLowerCase() === rawIdentifier;
          const phoneDigits = String(d.phone || '').replace(/\D/g, '');
          const phoneMatch = cleanDigits.length === 10 && phoneDigits === cleanDigits;
          return emailMatch || idMatch || phoneMatch;
        });
        if (seedMatch) {
          matched = {
            id: seedMatch.id,
            name: seedMatch.name,
            phone: seedMatch.phone,
            email: seedMatch.email,
            plate: seedMatch.plate,
            vehicle_type: seedMatch.vehicleType || 'MOTO',
            is_active: seedMatch.isActive ?? true,
            is_available: seedMatch.isAvailable ?? true,
            rating: seedMatch.rating ?? 5.0,
            total_deliveries: seedMatch.totalDeliveries ?? 0,
            created_at: seedMatch.createdAt,
          };
        }
      }

      if (!matched) {
        return NextResponse.json(
          { ok: false, error: 'Credenciales de domiciliario inválidas.' },
          { status: 401 }
        );
      }

      const effectiveIsActive =
        localDriver && typeof localDriver.isActive === 'boolean'
          ? localDriver.isActive
          : matched.is_active !== false;

      if (!effectiveIsActive) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'Tu cuenta de domiciliario se encuentra inhabilitada por la administración.',
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
