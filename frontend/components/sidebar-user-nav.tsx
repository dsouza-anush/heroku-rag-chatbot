"use client";

import { ChevronsUpDown, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import { stringToGradient } from "@/lib/utils";

export function SidebarUserNav() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const isGuest = guestRegex.test(user?.email ?? "");
  const displayName = isGuest ? "Guest" : (user?.name ?? user?.email ?? "User");
  const displayEmail = isGuest ? "guest@heroku.ai" : (user?.email ?? "");
  const avatarGradient = stringToGradient(user?.email ?? "guest");

  // Loading state
  if (status === "loading") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <div className="size-8 animate-pulse rounded-lg bg-muted" />
            <div className="grid flex-1 gap-1">
              <span className="h-4 w-20 animate-pulse rounded bg-muted" />
              <span className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Not logged in - show login button
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => router.push("/api/auth/guest")}
          >
            <div
              className="h-8 w-8 rounded-lg shrink-0 bg-muted"
            />
            <span className="text-sm font-medium">Sign in as Guest</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div
                className="h-8 w-8 rounded-lg shrink-0"
                style={{ background: avatarGradient }}
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div
                  className="h-8 w-8 rounded-lg shrink-0"
                  style={{ background: avatarGradient }}
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Theme Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Sun className="size-4" />
                Appearance
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="gap-2"
                  >
                    <Sun className="size-4" />
                    Light
                    {theme === "light" && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="gap-2"
                  >
                    <Moon className="size-4" />
                    Dark
                    {theme === "dark" && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className="gap-2"
                  >
                    <Monitor className="size-4" />
                    System
                    {theme === "system" && (
                      <span className="ml-auto text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* Login/Logout */}
            <DropdownMenuItem asChild>
              <button
                className="w-full gap-2"
                onClick={() => {
                  if (isGuest) {
                    // For now, guests clicking "Login" just signs out
                    // Real login can be implemented later
                    signOut({ redirectTo: "/" });
                  } else {
                    signOut({ redirectTo: "/" });
                  }
                }}
                type="button"
              >
                <LogOut className="size-4" />
                {isGuest ? "Sign out" : "Log out"}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
