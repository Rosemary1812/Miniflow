'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { WorkspaceRole } from '@prisma/client';
import { ArrowLeftIcon, PlusIcon } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErrorView, LoadingView } from '@/components/entity-components';
import {
  useInviteWorkspaceMember,
  useSuspenseWorkspaces,
  useWorkspaceInvites,
} from '@/features/workspaces/hooks/use-workspaces';

export const WorkspaceInvitesLoading = () => <LoadingView message="Loading invites..." />;
export const WorkspaceInvitesError = () => <ErrorView message="Error loading invites..." />;

const InviteDialog = ({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.EDITOR);
  const invite = useInviteWorkspaceMember();

  const handleInvite = () => {
    invite.mutate(
      { workspaceId, email, role },
      {
        onSuccess: () => {
          setEmail('');
          setRole(WorkspaceRole.EDITOR);
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!canManage}>
          <PlusIcon className="size-4" />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create invite</DialogTitle>
          <DialogDescription>Invite a teammate into this workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            type="email"
            value={email}
            placeholder="teammate@example.com"
            onChange={event => setEmail(event.target.value)}
          />
          <Select value={role} onValueChange={value => setRole(value as WorkspaceRole)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={WorkspaceRole.EDITOR}>EDITOR</SelectItem>
              <SelectItem value={WorkspaceRole.VIEWER}>VIEWER</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button disabled={!email.trim() || invite.isPending} onClick={handleInvite}>
            Create invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const WorkspaceInvitesPage = ({ workspaceId }: { workspaceId: string }) => {
  const invites = useWorkspaceInvites(workspaceId);
  const workspaces = useSuspenseWorkspaces();
  const workspace = workspaces.data.find(item => item.id === workspaceId);
  const currentRole = workspace?.members[0]?.role ?? WorkspaceRole.VIEWER;
  const canManage = currentRole === WorkspaceRole.OWNER;

  return (
    <div className="p-4 md:px-10 md:py-6">
      <div className="mx-auto flex w-full max-w-screen-lg flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
              <Link href="/workspaces" prefetch>
                <ArrowLeftIcon className="size-4" />
                Workspaces
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Invites</h1>
            <p className="text-sm text-muted-foreground">
              Pending and accepted workspace invitations.
            </p>
          </div>
          <InviteDialog workspaceId={workspaceId} canManage={canManage} />
        </div>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Invite list</CardTitle>
            <CardDescription>Share the token or build an invite link from it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.data.map(invite => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{invite.token}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(invite.expiresAt, { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {invite.acceptedAt ? (
                        <Badge variant="secondary">
                          Accepted {formatDistanceToNow(invite.acceptedAt, { addSuffix: true })}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {invites.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No invites yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
