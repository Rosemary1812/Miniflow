'use client';

import Link from 'next/link';
import { Building2Icon, SettingsIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  useCurrentWorkspace,
  useSwitchWorkspace,
  useWorkspaces,
} from '@/features/workspaces/hooks/use-workspaces';

export const WorkspaceSwitcher = () => {
  const { state } = useSidebar();
  const workspaces = useWorkspaces();
  const currentWorkspace = useCurrentWorkspace();
  const switchWorkspace = useSwitchWorkspace();
  const currentId = currentWorkspace.data?.id;

  if (state === 'collapsed') {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton tooltip={currentWorkspace.data?.name ?? 'Workspace'}>
            <Building2Icon className="size-4" />
            <span>{currentWorkspace.data?.name ?? 'Workspace'}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="space-y-2 px-2 pb-2">
      <Select
        value={currentId}
        disabled={workspaces.isLoading || switchWorkspace.isPending}
        onValueChange={workspaceId => switchWorkspace.mutate({ workspaceId })}
      >
        <SelectTrigger className="h-10 w-full justify-start gap-2 px-3">
          <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent align="start">
          {workspaces.data?.map(workspace => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Manage workspaces" className="h-8 gap-x-3 px-3">
            <Link href="/workspaces" prefetch>
              <SettingsIcon className="size-4" />
              <span>Manage workspaces</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
};
