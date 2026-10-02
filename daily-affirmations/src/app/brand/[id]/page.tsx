import { ProductDetailScreen } from '@/components/brand/ProductDetailScreen';

export default function Page({ params }: { params: { id: string } }) {
  return <ProductDetailScreen productId={params.id} />;
}
