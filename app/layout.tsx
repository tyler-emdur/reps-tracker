import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rep Tracker',
  description: 'Your fashion rep haul spreadsheet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
