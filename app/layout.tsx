import './globals.css';
import type { Metadata } from 'next';
import { Kanit } from 'next/font/google';
import clsx from 'clsx';

const kanit = Kanit({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'India From Space — Video Generator',
  description:
    'Generate a cinematic orbital video over India with an interactive WebGL experience.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={clsx(kanit.className, 'page-body')}>{children}</body>
    </html>
  );
}
