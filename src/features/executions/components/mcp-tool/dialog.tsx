'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { useMcpServers, useMcpToolsByServer } from '@/features/mcp/hooks/use-mcp-servers';

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: 'Variable name is required' })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    }),
  mcpServerId: z.string().min(1, 'MCP server is required'),
  toolName: z.string().min(1, 'Tool is required'),
  argumentsTemplate: z.string().min(1, 'Arguments template is required'),
  timeoutMs: z.number().int().min(1000).max(120000),
});

export type McpToolFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: McpToolFormValues) => void;
  defaultValues?: Partial<McpToolFormValues>;
}

export const McpToolDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const servers = useMcpServers();
  const form = useForm<McpToolFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || '',
      mcpServerId: defaultValues.mcpServerId || '',
      toolName: defaultValues.toolName || '',
      argumentsTemplate: defaultValues.argumentsTemplate || '{}',
      timeoutMs: defaultValues.timeoutMs || 30000,
    },
  });

  const selectedServerId = form.watch('mcpServerId');
  const selectedToolName = form.watch('toolName');
  const tools = useMcpToolsByServer(selectedServerId);
  const selectedTool = tools.data?.find(tool => tool.name === selectedToolName);

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || '',
        mcpServerId: defaultValues.mcpServerId || '',
        toolName: defaultValues.toolName || '',
        argumentsTemplate: defaultValues.argumentsTemplate || '{}',
        timeoutMs: defaultValues.timeoutMs || 30000,
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch('variableName') || 'myMcpTool';
  const handleSubmit = (values: McpToolFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>MCP Tool Configuration</DialogTitle>
          <DialogDescription>Call a tool from a remote MCP server.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-4 space-y-6">
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myMcpTool" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference this result as {`{{${watchVariableName}.mcpTool.content}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mcpServerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MCP Server</FormLabel>
                  <Select
                    onValueChange={value => {
                      field.onChange(value);
                      form.setValue('toolName', '');
                    }}
                    defaultValue={field.value}
                    disabled={servers.isLoading || !servers.data?.items.length}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an MCP server" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {servers.data?.items.map(server => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={!selectedServerId || tools.isLoading || !tools.data?.length}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a synced tool" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tools.data?.map(tool => (
                        <SelectItem key={tool.id} value={tool.name}>
                          {tool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedServerId && !tools.data?.length
                      ? 'No synced tools. Sync this MCP server from the MCP Servers page.'
                      : selectedTool?.description || 'Select a tool exposed by this server.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedTool?.inputSchema && (
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(selectedTool.inputSchema, null, 2)}
              </pre>
            )}
            <FormField
              control={form.control}
              name="argumentsTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arguments JSON Template</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[140px] font-mono text-sm" />
                  </FormControl>
                  <FormDescription>
                    This Handlebars template must render to a JSON object.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeoutMs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1000}
                      max={120000}
                      step={1000}
                      {...field}
                      onChange={event => field.onChange(Number(event.target.value))}
                    />
                  </FormControl>
                  <FormDescription>Milliseconds, from 1000 to 120000.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
