'use client';

import { HostelProvider } from '@/context/HostelContext';
import Sidebar from '@/components/layout/Sidebar';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HostelProvider>
      <div className="flex bg-[#FDFDFF] min-h-screen">
        <Sidebar role="owner" />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </HostelProvider>
  );
}