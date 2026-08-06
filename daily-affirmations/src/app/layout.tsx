import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { inter } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'DJ&A Ad Studio',
  description: "DJ&A Digital Studio's internal tool for producing marketing assets for its apps in under a minute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans">
        <div className="flex min-h-screen">
          <AppSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
