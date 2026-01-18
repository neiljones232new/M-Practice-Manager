import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { BrandingProvider } from '@/contexts/BrandingContext';
import MDJAppWrapper from '@/components/mdj-ui/MDJAppWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'M Practice Manager',
  description: 'Modern client CRM for professional practices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-app)', margin: 0, padding: 0 }}>
        <AuthProvider>
          <BrandingProvider>
            <MDJAppWrapper>
              {children}
            </MDJAppWrapper>
          </BrandingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
