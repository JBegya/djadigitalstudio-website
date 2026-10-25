import localFont from 'next/font/local';

// Extracted out of layout.tsx so any client component (notably the Fabric.js editor canvas,
// which needs the real browser-registered font-family string, not the CSS custom property
// next/font scopes onto <html>) can reference the same loaded font.
export const inter = localFont({
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
