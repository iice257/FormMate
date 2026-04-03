import { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const NAV_ITEMS = [
  ['dashboard', 'Dashboard', 'dashboard'],
  ['new', 'New Form', 'add_circle'],
  ['workspace', 'Workspace', 'edit_document'],
  ['history', 'History', 'history'],
  ['ai-chat', 'AI Chat', 'smart_toy'],
  ['vault', 'Vault', 'inventory_2'],
  ['analytics', 'Analytics', 'query_stats'],
  ['docs', 'Docs', 'menu_book'],
  ['pricing', 'Pricing', 'workspace_premium'],
  ['examples', 'Examples', 'explore'],
  ['help', 'Help', 'help'],
] as const;

function initials(value?: string) {
  return String(value || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function avatarSrc(userProfile?: Record<string, any>) {
  if (userProfile?.avatar) return userProfile.avatar;
  const name = userProfile?.name || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2298da&color=fff&bold=true`;
}

export function AppShell({
  children,
  currentScreen,
  onNavigate,
  onOpenAccount,
  tier,
  userProfile,
}: {
  children: ReactNode
  currentScreen: string
  onNavigate: (screen: string) => void
  onOpenAccount: (tab?: 'profile' | 'settings' | 'help') => void
  tier: string
  userProfile: Record<string, any>
}) {
  const currentLabel = NAV_ITEMS.find(([id]) => id === currentScreen)?.[1] || 'Workspace';

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="px-3 py-4">
          <button className="flex items-center gap-3 bg-transparent text-left" onClick={() => onNavigate('dashboard')} type="button">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <img alt="FormMate" className="size-6 object-contain" src="/logo.png" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight">FormMate</div>
              <div className="text-xs text-muted-foreground">Luma shell</div>
            </div>
          </button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(([id, label, icon]) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton asChild isActive={currentScreen === id}>
                      <button id={id === 'dashboard' ? 'nav-dashboard' : undefined} onClick={() => onNavigate(id)} type="button">
                        <span className="material-symbols-outlined" data-icon="inline-start">{icon}</span>
                        <span>{label}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="gap-3 p-3">
          <button className="flex w-full items-center gap-3 rounded-3xl border bg-background px-3 py-3 text-left" onClick={() => onOpenAccount('profile')} type="button">
            <Avatar className="size-10 border">
              <AvatarImage alt={userProfile?.name || 'User'} src={avatarSrc(userProfile)} />
              <AvatarFallback>{initials(userProfile?.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{userProfile?.name || 'User'}</div>
              <div className="truncate text-xs text-muted-foreground">{userProfile?.email || 'Local account'}</div>
            </div>
            <Badge variant="outline">{tier || 'free'}</Badge>
          </button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-h-screen bg-muted/30">
        <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>Workspace</BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <p className="mt-1 text-sm text-muted-foreground">Every active route now renders through shadcn components.</p>
            </div>
            <Button id="btn-profile-header" onClick={() => onOpenAccount('profile')} size="icon" type="button" variant="outline">
              <span className="material-symbols-outlined">person</span>
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
