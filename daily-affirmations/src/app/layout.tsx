import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import './globals.css';

const inter = localFont({
  src: [
    { path: '../../assets/fonts/Inter-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../assets/fonts/Inter-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../assets/fonts/Inter-SemiBold.otf', weight: '600', style: 'normal' },
    { path: '../../assets/fonts/Inter-Bold.otf', weight: '700', style: 'normal' },
    { path: '../../assets/fonts/Inter-ExtraBold.otf', weight: '800', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "DJ&A Daily Affirmations",
  description: "DJ&A Digital Studio's internal daily affirmation video production system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
