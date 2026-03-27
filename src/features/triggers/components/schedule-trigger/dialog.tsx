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

const PRESET_SCHEDULES = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs daily at 00:00' },
  { label: 'Every day at 9 AM', value: '0 9 * * *', description: 'Runs daily at 9:00 AM' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
  { label: 'First day of month at midnight', value: '0 0 1 * *', description: 'Runs on the 1st of every month' },
  { label: 'Custom', value: '__custom__', description: 'Enter a custom cron expression' },
];

const TIMEZONES = [
  'UTC',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Australia/Sydney',
];

const formSchema = z.object({
  schedule: z.enum([
    '* * * * *',
    '*/5 * * * *',
    '*/15 * * * *',
    '*/30 * * * *',
    '0 * * * *',
    '0 0 * * *',
    '0 9 * * *',
    '0 9 * * 1',
    '0 0 1 * *',
    '__custom__',
  ]),
  customCron: z.string().optional(),
  timezone: z.string(),
});

export type ScheduleTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { cron: string; timezone: string }) => void;
  defaultValues?: Partial<{ cron: string; timezone: string }>;
}

export const ScheduleTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<ScheduleTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schedule: '__custom__',
      customCron: defaultValues.cron || '*/5 * * * *',
      timezone: defaultValues.timezone || 'UTC',
    },
  });

  useEffect(() => {
    if (open) {
      // Try to match the default cron to a preset
      const cron = defaultValues.cron || '*/5 * * * *';
      const preset = PRESET_SCHEDULES.find(s => s.value === cron && s.value !== '__custom__');
      form.reset({
        schedule: (preset ? preset.value : '__custom__') as ScheduleTriggerFormValues['schedule'],
        customCron: preset ? undefined : cron,
        timezone: defaultValues.timezone || 'UTC',
      } as ScheduleTriggerFormValues);
    }
  }, [open, defaultValues, form]);

  const selectedSchedule = form.watch('schedule');
  const isCustom = selectedSchedule === '__custom__';
  const cronExpression = isCustom ? form.watch('customCron') : selectedSchedule;

  const handleSubmit = (values: ScheduleTriggerFormValues) => {
    const cron = values.schedule === '__custom__' ? values.customCron : values.schedule;
    if (!cron) return;
    onSubmit({ cron, timezone: values.timezone });
    onOpenChange(false);
  };

  const selectedPreset = PRESET_SCHEDULES.find(s => s.value === selectedSchedule);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Trigger</DialogTitle>
          <DialogDescription>
            Run this workflow on a recurring schedule using a cron expression.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 mt-4">
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRESET_SCHEDULES.filter(s => s.value !== '__custom__').map(preset => (
                        <SelectItem key={preset.value} value={preset.value}>
                          <div>
                            <div>{preset.label}</div>
                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isCustom && (
              <FormField
                control={form.control}
                name="customCron"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cron Expression</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="*/5 * * * *"
                        {...field}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      5-field cron: minute hour day month weekday. Example:{' '}
                      <code className="text-xs bg-muted px-1 rounded">0 9 * * 1-5</code> = 9 AM
                      on weekdays
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {cronExpression && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Schedule Summary</div>
                <div className="font-mono text-xs mb-1">{cronExpression}</div>
                <div className="text-xs">
                  {selectedPreset?.description ||
                    (isCustom ? 'Custom schedule' : 'Custom schedule')}
                </div>
                <div className="text-xs mt-1">Timezone: {form.watch('timezone')}</div>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button type="submit">Save Schedule</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
