import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LAIT — Local Area Intelligence Tool',
  description: 'Explore transport, amenities, and safety data for any UK postcode',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
