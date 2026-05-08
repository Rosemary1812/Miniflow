'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { McpAuthType } from '@prisma/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateMcpServer, useUpdateMcpServer } from '../hooks/use-mcp-servers';

const baseFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('A valid MCP server URL is required'),
  authType: z.enum(McpAuthType),
  secret: z.string().optional(),
  authHeaderName: z.string().optional(),
  enabled: z.boolean(),
});

const createFormSchema = baseFormSchema.superRefine((values, ctx) => {
  if (values.authType !== McpAuthType.NONE && !values.secret) {
    ctx.addIssue({
      code: 'custom',
      path: ['secret'],
      message: 'Secret is required for authenticated MCP servers',
    });
  }
  if (values.authType === McpAuthType.HEADER && !values.authHeaderName) {
    ctx.addIssue({
      code: 'custom',
      path: ['authHeaderName'],
      message: 'Header name is required',
    });
  }
});

const editFormSchema = baseFormSchema.superRefine((values, ctx) => {
  if (values.authType === McpAuthType.HEADER && !values.authHeaderName) {
    ctx.addIssue({
      code: 'custom',
      path: ['authHeaderName'],
      message: 'Header name is required',
    });
  }
});

export type McpServerFormValues = z.infer<typeof baseFormSchema>;

type McpServerInitialData = {
  id?: string;
  name: string;
  url: string;
  authType: McpAuthType;
  authHeaderName?: string | null;
  enabled: boolean;
};

export const McpServerForm = ({ initialData }: { initialData?: McpServerInitialData }) => {
  const router = useRouter();
  const createMcpServer = useCreateMcpServer();
  const updateMcpServer = useUpdateMcpServer();
  const isEdit = Boolean(initialData?.id);

  const form = useForm<McpServerFormValues>({
    resolver: zodResolver(isEdit ? editFormSchema : createFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      url: initialData?.url || '',
      authType: initialData?.authType || McpAuthType.NONE,
      secret: '',
      authHeaderName: initialData?.authHeaderName || '',
      enabled: initialData?.enabled ?? true,
    },
  });

  const authType = form.watch('authType');

  const onSubmit = async (values: McpServerFormValues) => {
    const payload = {
      ...values,
      secret: values.secret || undefined,
      authHeaderName: values.authHeaderName || undefined,
    };

    if (isEdit && initialData?.id) {
      await updateMcpServer.mutateAsync({
        id: initialData.id,
        ...payload,
      });
    } else {
      const data = await createMcpServer.mutateAsync(payload);
      router.push(`/mcp/${data.id}`);
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit MCP Server' : 'Create MCP Server'}</CardTitle>
        <CardDescription>
          Configure a remote Streamable HTTP MCP server for this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Company tools" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Server URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://mcp.example.com/mcp" {...field} />
                  </FormControl>
                  <FormDescription>
                    Only remote Streamable HTTP servers are supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={McpAuthType.NONE}>None</SelectItem>
                      <SelectItem value={McpAuthType.BEARER}>Bearer token</SelectItem>
                      <SelectItem value={McpAuthType.HEADER}>Custom header</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {authType === McpAuthType.HEADER && (
              <FormField
                control={form.control}
                name="authHeaderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Header Name</FormLabel>
                    <FormControl>
                      <Input placeholder="X-API-Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {authType !== McpAuthType.NONE && (
              <FormField
                control={form.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={isEdit ? 'Leave blank to keep current secret' : 'Token'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel>Enabled</FormLabel>
                    <FormDescription>
                      Disabled servers cannot be used by workflow nodes.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={createMcpServer.isPending || updateMcpServer.isPending}
              >
                {isEdit ? 'Save' : 'Create'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/mcp" prefetch>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
