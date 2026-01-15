'use client';

import type { KeyboardEvent } from 'react';
import {
  Loader2Icon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { stringToGradient } from '@/lib/utils';
import type { Pipeline } from '@/lib/api';

interface PipelineHeaderProps {
  pipeline: Pipeline;
  isEditingName: boolean;
  editingName: string;
  isSavingName: boolean;
  onNameChange: (value: string) => void;
  onNameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSaveName: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDeletePipeline: () => void;
}

export function PipelineHeader({
  pipeline,
  isEditingName,
  editingName,
  isSavingName,
  onNameChange,
  onNameKeyDown,
  onSaveName,
  onCancelEdit,
  onStartEdit,
  onDeletePipeline,
}: PipelineHeaderProps) {
  return (
    <div className="bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="px-4 py-3">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={editingName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={onNameKeyDown}
              autoFocus
              className="h-8 text-sm font-medium max-w-xs"
              disabled={isSavingName}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSaveName}
              disabled={isSavingName}
              className="size-7"
            >
              {isSavingName ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCancelEdit}
              disabled={isSavingName}
              className="size-7"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-accent rounded-md px-2 py-1.5 transition-colors outline-none w-fit">
              <div
                className="size-6 rounded-md shrink-0"
                style={{ background: stringToGradient(pipeline.id) }}
              />
              <span className="text-sm font-medium text-foreground truncate max-w-36 sm:max-w-52">
                {pipeline.name}
              </span>
              <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={onStartEdit} className="cursor-pointer gap-2">
                <PencilIcon className="size-4" />
                <span>Edit title</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDeletePipeline}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
