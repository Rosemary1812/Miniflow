'use client';

import { NodeType } from '@prisma/client';

type Props = {
  nodeType: NodeType;
  data: Record<string, unknown>;
};

const previewKeys = [
  'variableName',
  'method',
  'endpoint',
  'model',
  'credentialId',
  'webhookUrl',
  'content',
  'variable',
  'operator',
  'value',
  'cron',
  'timezone',
  'retryEnabled',
  'retryMaxAttempts',
  'retryStrategy',
];

export const NodePreviewPanel = ({ nodeType, data }: Props) => {
  const entries = previewKeys
    .filter(key => data[key] !== undefined && data[key] !== '')
    .map(key => [key, data[key]] as const);

  return (
    <div className="rounded-md border bg-muted/40 p-3">
      <p className="text-sm font-medium">{nodeType}</p>
      {entries.length ? (
        <dl className="mt-2 grid gap-1 text-xs">
          {entries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="truncate">{String(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Not configured.</p>
      )}
    </div>
  );
};
