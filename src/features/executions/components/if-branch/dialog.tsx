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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

const conditionOperators = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'notEquals', label: 'Not Equals (!=)' },
  { value: 'greaterThan', label: 'Greater Than (>)' },
  { value: 'lessThan', label: 'Less Than (<)' },
  { value: 'greaterThanOrEqual', label: 'Greater Than or Equal (>=)' },
  { value: 'lessThanOrEqual', label: 'Less Than or Equal (<=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Not Contains' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
  { value: 'matches', label: 'Regex Matches' },
] as const;

const formSchema = z.object({
  variable: z.string().min(1, { message: 'Variable name is required' }),
  operator: z.enum([
    'equals',
    'notEquals',
    'greaterThan',
    'lessThan',
    'greaterThanOrEqual',
    'lessThanOrEqual',
    'contains',
    'notContains',
    'isEmpty',
    'isNotEmpty',
    'matches',
  ]),
  value: z.string().optional(),
});

export type IfBranchFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IfBranchFormValues) => void;
  defaultValues?: Partial<IfBranchFormValues>;
}

export const IfBranchDialog = ({ open, onOpenChange, onSubmit, defaultValues = {} }: Props) => {
  const form = useForm<IfBranchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variable: defaultValues.variable || '',
      operator: defaultValues.operator || 'equals',
      value: defaultValues.value || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variable: defaultValues.variable || '',
        operator: defaultValues.operator || 'equals',
        value: defaultValues.value || '',
      });
    }
  }, [open, defaultValues, form]);

  const operator = form.watch('operator');
  const showValueField = !['isEmpty', 'isNotEmpty'].includes(operator);
  const variableName = form.watch('variable') || 'variable';

  const handleSubmit = (values: IfBranchFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>If / Branch</DialogTitle>
          <DialogDescription>
            Evaluate a condition and route execution to the True or False branch.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 mt-4">
            <FormField
              control={form.control}
              name="variable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. httpResponse.status or data.count" {...field} />
                  </FormControl>
                  <FormDescription>
                    Reference the variable using dot notation, e.g.{' '}
                    <code className="text-xs bg-muted px-1 rounded">
                      {'{{'}
                      {variableName}
                      {'}}'}
                    </code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conditionOperators.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showValueField && (
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 200 or success" {...field} />
                    </FormControl>
                    <FormDescription>
                      The value to compare against. For regex, enter the pattern.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Output</div>
              <div>
                <span className="text-green-600 font-mono text-xs">True</span> — when condition
                evaluates to true
              </div>
              <div>
                <span className="text-red-600 font-mono text-xs">False</span> — when condition
                evaluates to false
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
