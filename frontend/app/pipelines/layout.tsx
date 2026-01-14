'use client';

import { SidebarLayout } from '@/components/sidebar-layout';

export default function PipelinesLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
