'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { MonitorIcon, SunIcon, MoonIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// SSR-safe mounted check using useSyncExternalStore
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
        <div className="size-7 rounded-full" />
        <div className="size-7 rounded-full" />
        <div className="size-7 rounded-full" />
      </div>
    );
  }

  const themes = [
    { value: 'system', icon: MonitorIcon, label: 'System' },
    { value: 'light', icon: SunIcon, label: 'Light' },
    { value: 'dark', icon: MoonIcon, label: 'Dark' },
  ] as const;

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex size-7 items-center justify-center rounded-full transition-all duration-200',
            theme === value
              ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
          title={label}
          aria-label={`Switch to ${label} theme`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
