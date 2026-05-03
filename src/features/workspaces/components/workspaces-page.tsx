'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRightIcon, PlusIcon, UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { LoadingView, ErrorView } from '@/components/entity-components';
import {
  useAcceptWorkspaceInvite,
  useCreateWorkspace,
  useSuspenseCurrentWorkspace,
  useSuspenseWorkspaces,
  useSwitchWorkspace,
} from '@/features/workspaces/hooks/use-workspaces';

export const WorkspacesLoading = () => <LoadingView message="Loading workspaces..." />;
export const WorkspacesError = () => <ErrorView message="Error loading workspaces..." />;

const WorkspaceCreateDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createWorkspace = useCreateWorkspace();

  const handleCreate = () => {
    createWorkspace.mutate(
      { name },
      {
        onSuccess: () => {
          setName('');
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Add a workspace for workflows, credentials, and executions.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          placeholder="Workspace name"
          onChange={event => setName(event.target.value)}
        />
        <DialogFooter>
          <Button disabled={!name.trim() || createWorkspace.isPending} onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AcceptInviteCard = () => {
  const [token, setToken] = useState('');
  const acceptInvite = useAcceptWorkspaceInvite();

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Accept invite</CardTitle>
        <CardDescription>Paste a workspace invite token to join a team.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={token}
          placeholder="Invite token"
          onChange={event => setToken(event.target.value)}
        />
        <Button
          disabled={!token.trim() || acceptInvite.isPending}
          onClick={() => acceptInvite.mutate({ token })}
        >
          Accept
        </Button>
      </CardContent>
    </Card>
  );
};

export const WorkspacesPage = () => {
  const workspaces = useSuspenseWorkspaces();
  const currentWorkspace = useSuspenseCurrentWorkspace();
  const switchWorkspace = useSwitchWorkspace();

  return (
    <div className="p-4 md:px-10 md:py-6">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Workspaces</h1>
            <p className="text-sm text-muted-foreground">
              Manage tenant access and default workspace.
            </p>
          </div>
          <WorkspaceCreateDialog />
        </div>
        <div className="grid gap-4">
          <AcceptInviteCard />
          {workspaces.data.map(workspace => {
            const role = workspace.members[0]?.role ?? 'VIEWER';
            const isCurrent = currentWorkspace.data.id === workspace.id;

            return (
              <Card key={workspace.id} className="shadow-none">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {workspace.name}
                      {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                    </CardTitle>
                    <CardDescription>
                      Updated {formatDistanceToNow(workspace.updatedAt, { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{role}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={isCurrent ? 'secondary' : 'outline'}
                    disabled={isCurrent || switchWorkspace.isPending}
                    onClick={() => switchWorkspace.mutate({ workspaceId: workspace.id })}
                  >
                    {isCurrent ? 'Default workspace' : 'Set as default'}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/workspaces/${workspace.id}/members`} prefetch>
                      <UsersIcon className="size-4" />
                      Members
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/workspaces/${workspace.id}/invites`} prefetch>
                      Invites
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
