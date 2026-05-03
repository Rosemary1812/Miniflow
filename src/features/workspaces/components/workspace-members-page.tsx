'use client';

import Link from 'next/link';
import { WorkspaceRole } from '@prisma/client';
import { ArrowLeftIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  useRemoveWorkspaceMember,
  useSuspenseWorkspaces,
  useUpdateWorkspaceMemberRole,
  useWorkspaceMembers,
} from '@/features/workspaces/hooks/use-workspaces';

export const WorkspaceMembersLoading = () => <LoadingView message="Loading members..." />;
export const WorkspaceMembersError = () => <ErrorView message="Error loading members..." />;

export const WorkspaceMembersPage = ({ workspaceId }: { workspaceId: string }) => {
  const members = useWorkspaceMembers(workspaceId);
  const workspaces = useSuspenseWorkspaces();
  const updateRole = useUpdateWorkspaceMemberRole();
  const removeMember = useRemoveWorkspaceMember();
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
            <h1 className="text-xl font-semibold">Members</h1>
            <p className="text-sm text-muted-foreground">Workspace roles and access.</p>
          </div>
          <Button asChild>
            <Link href={`/workspaces/${workspaceId}/invites`} prefetch>
              Manage invites
            </Link>
          </Button>
        </div>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Member table</CardTitle>
            <CardDescription>Only owners can change roles or remove members.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.data.map(member => (
                  <TableRow key={member.id}>
                    <TableCell>{member.user.name ?? 'Unnamed user'}</TableCell>
                    <TableCell>{member.user.email}</TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          value={member.role}
                          onValueChange={role =>
                            updateRole.mutate({
                              workspaceId,
                              userId: member.userId,
                              role: role as WorkspaceRole,
                            })
                          }
                        >
                          <SelectTrigger size="sm" className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(WorkspaceRole).map(role => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{member.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={removeMember.isPending}
                          onClick={() =>
                            removeMember.mutate({ workspaceId, userId: member.userId })
                          }
                        >
                          Remove
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">No access</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
