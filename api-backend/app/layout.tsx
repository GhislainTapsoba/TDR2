import React from 'react';

export const metadata = {
  title: 'TDR2 API Backend',
  description: 'API Backend for TDR2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
