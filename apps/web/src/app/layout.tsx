import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from './components/Sidebar';

export const metadata: Metadata = {
  title: 'Agentic Wallet — Devnet Observer',
  description: 'Monitor autonomous Solana agent activity on devnet',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-surface-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto grid-bg">{children}</main>
      </body>
    </html>
  );
}
