'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RestaurantDirectRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const restaurantId = searchParams.get('restaurant') || searchParams.get('r');
      if (restaurantId && restaurantId.trim()) {
        router.replace(`/restaurant/${restaurantId.trim()}`);
      }
    } catch (e) {
      console.warn('Error reading restaurant param:', e);
    }
  }, [router]);

  return null;
}
