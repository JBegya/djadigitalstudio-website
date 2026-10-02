import { VideoJobDetailScreen } from '@/components/videos/VideoJobDetailScreen';

export default function Page({ params }: { params: { id: string } }) {
  return <VideoJobDetailScreen jobId={params.id} />;
}
