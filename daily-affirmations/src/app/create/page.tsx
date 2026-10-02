import { CreateAdvertisementScreen } from '@/components/editor/CreateAdvertisementScreen';

export default function Page({ searchParams }: { searchParams: { id?: string } }) {
  return <CreateAdvertisementScreen initialCreationId={searchParams.id} />;
}
