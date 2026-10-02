import OrderTrackingView from './OrderTrackingView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderTrackingView orderParam={id} />;
}
