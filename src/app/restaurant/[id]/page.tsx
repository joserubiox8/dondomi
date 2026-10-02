import RestaurantView from './RestaurantView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RestaurantPage({ params }: PageProps) {
  const { id } = await params;
  return <RestaurantView restaurantId={id} />;
}
