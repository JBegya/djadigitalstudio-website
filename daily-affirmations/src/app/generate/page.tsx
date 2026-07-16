import { Suspense } from 'react';
import { GenerateScreen } from '@/components/generation/GenerateScreen';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GenerateScreen />
    </Suspense>
  );
}
