'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export const PromptTemplateEditor = ({ label, value, placeholder, onChange }: Props) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value ?? ''}
        placeholder={placeholder}
        className="min-h-28 font-mono text-sm"
        onChange={event => onChange(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Use template variables like {'{{httpResponse.data}}'} or {'{{json items}}'}.
      </p>
    </div>
  );
};
