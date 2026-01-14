'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusIcon, DatabaseIcon, MessageSquareIcon, ChevronRightIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { MiaLogo } from '@/components/icons/mia-logo';
import type { Pipeline } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';

interface AppSidebarProps {
  pipelines?: Pipeline[];
  isLoading?: boolean;
  onCreatePipeline?: () => void;
  onDeletePipeline?: (pipeline: Pipeline) => void;
  onEditPipeline?: (pipeline: Pipeline) => void;
}

export function AppSidebar({ pipelines = [], isLoading = false, onCreatePipeline, onDeletePipeline, onEditPipeline }: AppSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());

  const closeMobileOnNavigate = () => {
    setOpenMobile(false);
  };

  const togglePipelineExpanded = (pipelineId: string) => {
    setExpandedPipelines((prev) => {
      const next = new Set(prev);
      if (next.has(pipelineId)) {
        next.delete(pipelineId);
      } else {
        next.add(pipelineId);
      }
      return next;
    });
  };

  const isPipelineActive = (pipelineId: string) => {
    return pathname.startsWith(`/pipelines/${pipelineId}`);
  };

  const isChatActive = (pipelineId: string) => {
    return pathname === `/pipelines/${pipelineId}`;
  };

  const isDataSourcesActive = (pipelineId: string) => {
    return pathname === `/pipelines/${pipelineId}/data-sources`;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <div className="flex items-center justify-between px-2 py-1.5">
          <Link
            href="/pipelines"
            className="flex items-center gap-2.5 font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden tracking-tight"
            onClick={closeMobileOnNavigate}
          >
            <MiaLogo className="size-7" />
            <span>Heroku AI Search</span>
          </Link>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* New Pipeline Button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <Button
              onClick={onCreatePipeline}
              className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
              variant="outline"
            >
              <PlusIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">New Pipeline</span>
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Pipelines List */}
        <SidebarGroup>
          <SidebarGroupLabel>Pipelines</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : pipelines.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No pipelines yet
                </div>
              ) : (
                pipelines.map((pipeline) => {
                  const isExpanded = expandedPipelines.has(pipeline.id);
                  const isActive = isPipelineActive(pipeline.id);

                  return (
                    <SidebarMenuItem key={pipeline.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          {/* Pipeline Header - Expandable */}
                          <div className="flex items-center">
                            <button
                              onClick={() => togglePipelineExpanded(pipeline.id)}
                              className={cn(
                                'flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-sm transition-colors',
                                isActive
                                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                              )}
                            >
                              <ChevronRightIcon
                                className={cn(
                                  'size-3.5 text-muted-foreground transition-transform group-data-[collapsible=icon]:hidden',
                                  isExpanded && 'rotate-90'
                                )}
                              />
                              <DatabaseIcon className="size-4 shrink-0" />
                              <span className="truncate group-data-[collapsible=icon]:hidden">{pipeline.name}</span>
                            </button>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                          <ContextMenuItem
                            onClick={() => onEditPipeline?.(pipeline)}
                            className="gap-2"
                          >
                            <PencilIcon className="size-4" />
                            <span>Edit Pipeline</span>
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            onClick={() => onDeletePipeline?.(pipeline)}
                            variant="destructive"
                            className="gap-2"
                          >
                            <Trash2Icon className="size-4" />
                            <span>Delete Pipeline</span>
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>

                      {/* Child Items - Only visible when expanded and sidebar is not collapsed */}
                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border pl-2 group-data-[collapsible=icon]:hidden animate-fade-in">
                          {/* Data Sources */}
                          <Link
                            href={`/pipelines/${pipeline.id}/data-sources`}
                            onClick={closeMobileOnNavigate}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                              isDataSourcesActive(pipeline.id)
                                ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium'
                                : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <DatabaseIcon className="size-3.5" />
                            <span>Data Sources</span>
                          </Link>

                          {/* Chat */}
                          <Link
                            href={`/pipelines/${pipeline.id}`}
                            onClick={closeMobileOnNavigate}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
                              isChatActive(pipeline.id)
                                ? 'bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium'
                                : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                            )}
                          >
                            <MessageSquareIcon className="size-3.5" />
                            <span>Chat</span>
                          </Link>
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar">
        <SidebarUserNav />
      </SidebarFooter>
    </Sidebar>
  );
}
