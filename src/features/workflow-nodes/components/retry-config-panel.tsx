'use client';

import { RetryStrategy } from '@prisma/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export type RetryConfigFormValue = {
  retryEnabled?: boolean;
  retryMaxAttempts?: number;
  retryStrategy?: RetryStrategy;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
};

type Props = {
  value: RetryConfigFormValue;
  onChange: (value: RetryConfigFormValue) => void;
};

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const RetryConfigPanel = ({ value, onChange }: Props) => {
  const retryEnabled = Boolean(value.retryEnabled);

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Retry</p>
          <p className="text-xs text-muted-foreground">Automatically retry transient failures.</p>
        </div>
        <Switch
          checked={retryEnabled}
          onCheckedChange={checked => onChange({ ...value, retryEnabled: checked })}
        />
      </div>
      {retryEnabled ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Max attempts</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={value.retryMaxAttempts ?? 3}
              onChange={event =>
                onChange({
                  ...value,
                  retryMaxAttempts: toNumber(event.target.value, 3),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Strategy</Label>
            <Select
              value={value.retryStrategy ?? RetryStrategy.fixed}
              onValueChange={strategy =>
                onChange({ ...value, retryStrategy: strategy as RetryStrategy })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RetryStrategy.fixed}>fixed</SelectItem>
                <SelectItem value={RetryStrategy.exponential}>exponential</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base delay ms</Label>
            <Input
              type="number"
              min={0}
              value={value.retryBaseDelayMs ?? 1000}
              onChange={event =>
                onChange({
                  ...value,
                  retryBaseDelayMs: toNumber(event.target.value, 1000),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max delay ms</Label>
            <Input
              type="number"
              min={0}
              value={value.retryMaxDelayMs ?? 30000}
              onChange={event =>
                onChange({
                  ...value,
                  retryMaxDelayMs: toNumber(event.target.value, 30000),
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
