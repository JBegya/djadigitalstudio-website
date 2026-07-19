import { Suspense } from 'react';
import { PreviewScreen } from '@/components/preview/PreviewScreen';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PreviewScreen />
    </Suspense>
  );
}
