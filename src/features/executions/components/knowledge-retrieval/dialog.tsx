'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useKnowledgeBases } from '@/features/knowledge/hooks/use-knowledge';

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, 'Variable name is required')
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, 'Use a valid JavaScript variable name'),
  queryTemplate: z.string().min(1, 'Query template is required'),
  knowledgeBaseIds: z.array(z.string()).min(1, 'Select at least one knowledge base'),
  topK: z.number().int().min(1).max(20),
  scoreThreshold: z.number().min(-1).max(1),
});

export type KnowledgeRetrievalFormValues = z.infer<typeof formSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: KnowledgeRetrievalFormValues) => void;
  defaultValues?: Partial<KnowledgeRetrievalFormValues>;
};

export const KnowledgeRetrievalDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const knowledgeBases = useKnowledgeBases();
  const form = useForm<KnowledgeRetrievalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || 'knowledge',
      queryTemplate: defaultValues.queryTemplate || '{{input}}',
      knowledgeBaseIds: defaultValues.knowledgeBaseIds || [],
      topK: defaultValues.topK || 5,
      scoreThreshold: defaultValues.scoreThreshold ?? 0.25,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || 'knowledge',
        queryTemplate: defaultValues.queryTemplate || '{{input}}',
        knowledgeBaseIds: defaultValues.knowledgeBaseIds || [],
        topK: defaultValues.topK || 5,
        scoreThreshold: defaultValues.scoreThreshold ?? 0.25,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: KnowledgeRetrievalFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Knowledge Retrieval Configuration</DialogTitle>
          <DialogDescription>Retrieve chunks from workspace knowledge bases.</DialogDescription>
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
                    <Input placeholder="knowledge" {...field} />
                  </FormControl>
                  <FormDescription>
                    Downstream nodes can reference {`{{json ${field.value || 'knowledge'}.result}}`}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="queryTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Query Template</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="min-h-[120px] font-mono text-sm" />
                  </FormControl>
                  <FormDescription>Use Handlebars variables from the workflow context.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="knowledgeBaseIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Knowledge Bases</FormLabel>
                  <div className="space-y-2 rounded-md border p-3">
                    {knowledgeBases.data?.items.map(base => {
                      const checked = field.value.includes(base.id);
                      return (
                        <label key={base.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={value => {
                              field.onChange(
                                value
                                  ? [...field.value, base.id]
                                  : field.value.filter(id => id !== base.id),
                              );
                            }}
                          />
                          <span>{base.name}</span>
                        </label>
                      );
                    })}
                    {!knowledgeBases.data?.items.length ? (
                      <p className="text-sm text-muted-foreground">No knowledge bases found.</p>
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="topK"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top K</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        {...field}
                        onChange={event => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scoreThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score Threshold</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={-1}
                        max={1}
                        step={0.05}
                        {...field}
                        onChange={event => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
