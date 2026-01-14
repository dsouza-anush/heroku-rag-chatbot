'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getPipelines, createPipeline, deletePipeline, Pipeline } from '@/lib/api';
import { toast } from 'sonner';

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPipelines = async () => {
    try {
      const data = await getPipelines();
      setPipelines(data);
    } catch (error) {
      console.error('Failed to fetch pipelines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();

    // Listen for pipeline updates from child pages
    const handlePipelineUpdate = () => {
      fetchPipelines();
    };
    window.addEventListener('pipeline-updated', handlePipelineUpdate);
    return () => {
      window.removeEventListener('pipeline-updated', handlePipelineUpdate);
    };
  }, []);

  const handleCreatePipeline = async () => {
    try {
      const name = `Pipeline ${pipelines.length + 1}`;
      const newPipeline = await createPipeline(name);
      setPipelines((prev) => [...prev, newPipeline]);
      router.push(`/pipelines/${newPipeline.id}/data-sources`);
    } catch (error) {
      console.error('Failed to create pipeline:', error);
    }
  };

  const handleDeletePipeline = async (pipeline: Pipeline) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${pipeline.name}"? This will remove all indexed data and cannot be undone.`);
    if (!confirmed) return;

    try {
      await deletePipeline(pipeline.id);
      setPipelines((prev) => prev.filter((p) => p.id !== pipeline.id));
      toast.success(`Deleted "${pipeline.name}"`);

      // Navigate away if we're on the deleted pipeline's page
      if (pathname.includes(pipeline.id)) {
        router.push('/pipelines');
      }
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
      toast.error('Failed to delete pipeline');
    }
  };

  const handleEditPipeline = (pipeline: Pipeline) => {
    // Navigate to data sources page where editing is available
    router.push(`/pipelines/${pipeline.id}/data-sources`);
  };

  return (
    <SidebarProvider>
      <AppSidebar
        pipelines={pipelines}
        isLoading={isLoading}
        onCreatePipeline={handleCreatePipeline}
        onDeletePipeline={handleDeletePipeline}
        onEditPipeline={handleEditPipeline}
      />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
