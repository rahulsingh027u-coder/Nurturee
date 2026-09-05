import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Nurturee - Patient Portal', description: 'Book healthcare services.' };
export default function PatientLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
