import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { TRPCReactProvider } from './trpc/client';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Provider } from 'jotai';

// Use bundled local font files so production builds do not depend on Google Fonts.
const geistSans = localFont({
  src: [
    {
      path: '../../node_modules/next/dist/esm/next-devtools/server/font/geist-latin.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
});

// Use bundled local mono font files for the same offline build path.
const geistMono = localFont({
  src: [
    {
      path: '../../node_modules/next/dist/esm/next-devtools/server/font/geist-mono-latin.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Miniflow',
  description: 'Workflow automation platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TRPCReactProvider>
          <NuqsAdapter>
            <Provider>
              {children}
              <Toaster />
            </Provider>
          </NuqsAdapter>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
