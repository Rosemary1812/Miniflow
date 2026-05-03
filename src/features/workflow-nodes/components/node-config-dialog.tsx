'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import { CredentialType, NodeType, RetryStrategy } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CredentialSelect } from './credential-select';
import { NodePreviewPanel } from './node-preview-panel';
import { PromptTemplateEditor } from './prompt-template-editor';
import { RetryConfigPanel, type RetryConfigFormValue } from './retry-config-panel';

type NodeConfigData = Record<string, unknown> & RetryConfigFormValue;

type Props = {
  node: Node | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (nodeId: string, data: NodeConfigData) => void;
};

const retryableTypes = new Set<string>([
  NodeType.HTTP_REQUEST,
  NodeType.OPENAI,
  NodeType.ANTHROPIC,
  NodeType.GEMINI,
  NodeType.DISCORD,
  NodeType.SLACK,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
]);

const aiCredentialTypes: Partial<Record<NodeType, CredentialType>> = {
  [NodeType.OPENAI]: CredentialType.OPENAI,
  [NodeType.ANTHROPIC]: CredentialType.ANTHROPIC,
  [NodeType.GEMINI]: CredentialType.GEMINI,
};

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
];

const configurableTypes: NodeType[] = [
  NodeType.HTTP_REQUEST,
  NodeType.OPENAI,
  NodeType.ANTHROPIC,
  NodeType.GEMINI,
  NodeType.SLACK,
  NodeType.DISCORD,
  NodeType.IF_BRANCH,
  NodeType.SCHEDULE_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
];

const asString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

const asNumber = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const asBoolean = (value: unknown) => value === true;

const getDefaultData = (node: Node | null): NodeConfigData => {
  const data = (node?.data ?? {}) as Record<string, unknown>;

  return {
    ...data,
    variableName: asString(data.variableName),
    endpoint: asString(data.endpoint),
    method: asString(data.method, 'GET'),
    body: asString(data.body),
    credentialId: asString(data.credentialId),
    model: asString(data.model),
    baseURL: asString(data.baseURL),
    systemPrompt: asString(data.systemPrompt),
    userPrompt: asString(data.userPrompt),
    webhookUrl: asString(data.webhookUrl),
    content: asString(data.content),
    username: asString(data.username),
    variable: asString(data.variable),
    operator: asString(data.operator, 'equals'),
    value: asString(data.value),
    cron: asString(data.cron, '0 9 * * *'),
    timezone: asString(data.timezone, 'UTC'),
    retryEnabled: asBoolean(data.retryEnabled),
    retryMaxAttempts: asNumber(data.retryMaxAttempts, 3),
    retryStrategy:
      data.retryStrategy === RetryStrategy.exponential
        ? RetryStrategy.exponential
        : RetryStrategy.fixed,
    retryBaseDelayMs: asNumber(data.retryBaseDelayMs, 1000),
    retryMaxDelayMs: asNumber(data.retryMaxDelayMs, 30000),
  };
};

const setField = (data: NodeConfigData, key: string, value: unknown): NodeConfigData => ({
  ...data,
  [key]: value,
});

export const NodeConfigDialog = ({ node, open, onOpenChange, onSubmit }: Props) => {
  const [data, setData] = useState<NodeConfigData>(() => getDefaultData(node));
  const nodeType = node?.type as NodeType | undefined;

  useEffect(() => {
    if (open) {
      setData(getDefaultData(node));
    }
  }, [node, open]);

  const credentialType = nodeType ? aiCredentialTypes[nodeType] : undefined;
  const canRetry = nodeType ? retryableTypes.has(nodeType) : false;
  const operator = asString(data.operator, 'equals');
  const showBranchValue = !['isEmpty', 'isNotEmpty'].includes(operator);
  const isPromptNode =
    nodeType === NodeType.OPENAI || nodeType === NodeType.ANTHROPIC || nodeType === NodeType.GEMINI;

  const title = useMemo(() => {
    if (!nodeType) {
      return 'Node configuration';
    }
    return `${nodeType.replaceAll('_', ' ')} configuration`;
  }, [nodeType]);

  const handleSave = () => {
    if (!node) {
      return;
    }

    const nextData: NodeConfigData = {
      ...data,
      retryEnabled: Boolean(data.retryEnabled),
      retryMaxAttempts: Number(data.retryMaxAttempts ?? 3),
      retryStrategy: (data.retryStrategy as RetryStrategy | undefined) ?? RetryStrategy.fixed,
      retryBaseDelayMs: Number(data.retryBaseDelayMs ?? 1000),
      retryMaxDelayMs: Number(data.retryMaxDelayMs ?? 30000),
    };

    onSubmit(node.id, nextData);
    onOpenChange(false);
  };

  if (!node || !nodeType) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configure this node, then save the workflow.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2 lg:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            {nodeType === NodeType.HTTP_REQUEST ? (
              <>
                <div className="space-y-2">
                  <Label>Variable name</Label>
                  <Input
                    value={asString(data.variableName)}
                    onChange={event => setData(setField(data, 'variableName', event.target.value))}
                    placeholder="myApiCall"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={asString(data.method, 'GET')}
                      onValueChange={value => setData(setField(data, 'method', value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(method => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <Input
                      value={asString(data.endpoint)}
                      onChange={event => setData(setField(data, 'endpoint', event.target.value))}
                      placeholder="https://api.example.com/data"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Request body</Label>
                  <Textarea
                    value={asString(data.body)}
                    onChange={event => setData(setField(data, 'body', event.target.value))}
                    className="min-h-[120px] font-mono text-sm"
                    placeholder='{"id": "{{trigger.id}}"}'
                  />
                </div>
              </>
            ) : null}

            {isPromptNode ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Variable name</Label>
                    <Input
                      value={asString(data.variableName)}
                      onChange={event =>
                        setData(setField(data, 'variableName', event.target.value))
                      }
                      placeholder="aiResult"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Credential</Label>
                    {credentialType ? (
                      <CredentialSelect
                        type={credentialType}
                        value={asString(data.credentialId) || undefined}
                        onChange={credentialId =>
                          setData(setField(data, 'credentialId', credentialId))
                        }
                      />
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={asString(data.model)}
                      onChange={event => setData(setField(data, 'model', event.target.value))}
                      placeholder="Use provider default"
                    />
                  </div>
                  {nodeType === NodeType.OPENAI ? (
                    <div className="space-y-2">
                      <Label>Base URL</Label>
                      <Input
                        value={asString(data.baseURL)}
                        onChange={event => setData(setField(data, 'baseURL', event.target.value))}
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                  ) : null}
                </div>
                <PromptTemplateEditor
                  label="System prompt"
                  value={asString(data.systemPrompt)}
                  onChange={value => setData(setField(data, 'systemPrompt', value))}
                  placeholder="You are a helpful assistant."
                />
                <PromptTemplateEditor
                  label="User prompt"
                  value={asString(data.userPrompt)}
                  onChange={value => setData(setField(data, 'userPrompt', value))}
                  placeholder="Summarize {{httpResponse.data}}"
                />
              </>
            ) : null}

            {nodeType === NodeType.SLACK || nodeType === NodeType.DISCORD ? (
              <>
                <div className="space-y-2">
                  <Label>Variable name</Label>
                  <Input
                    value={asString(data.variableName)}
                    onChange={event => setData(setField(data, 'variableName', event.target.value))}
                    placeholder="messageResult"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <Input
                    value={asString(data.webhookUrl)}
                    onChange={event => setData(setField(data, 'webhookUrl', event.target.value))}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>
                {nodeType === NodeType.DISCORD ? (
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={asString(data.username)}
                      onChange={event => setData(setField(data, 'username', event.target.value))}
                      placeholder="Miniflow"
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={asString(data.content)}
                    onChange={event => setData(setField(data, 'content', event.target.value))}
                    className="min-h-[120px]"
                    placeholder="Workflow finished: {{aiResult.text}}"
                  />
                </div>
              </>
            ) : null}

            {nodeType === NodeType.IF_BRANCH ? (
              <>
                <div className="space-y-2">
                  <Label>Variable</Label>
                  <Input
                    value={asString(data.variable)}
                    onChange={event => setData(setField(data, 'variable', event.target.value))}
                    placeholder="httpResponse.status"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select
                      value={operator}
                      onValueChange={value => setData(setField(data, 'operator', value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionOperators.map(condition => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {showBranchValue ? (
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={asString(data.value)}
                        onChange={event => setData(setField(data, 'value', event.target.value))}
                        placeholder="200"
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {nodeType === NodeType.SCHEDULE_TRIGGER ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Cron</Label>
                  <Input
                    value={asString(data.cron)}
                    onChange={event => setData(setField(data, 'cron', event.target.value))}
                    placeholder="0 9 * * *"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={asString(data.timezone)}
                    onChange={event => setData(setField(data, 'timezone', event.target.value))}
                    placeholder="UTC"
                  />
                </div>
              </div>
            ) : null}

            {nodeType === NodeType.GOOGLE_FORM_TRIGGER || nodeType === NodeType.STRIPE_TRIGGER ? (
              <div className="space-y-2">
                <Label>Variable name</Label>
                <Input
                  value={asString(data.variableName)}
                  onChange={event => setData(setField(data, 'variableName', event.target.value))}
                  placeholder="trigger"
                />
              </div>
            ) : null}

            {canRetry ? (
              <RetryConfigPanel
                value={data}
                onChange={retryData => setData({ ...data, ...retryData })}
              />
            ) : null}

            {!configurableTypes.includes(nodeType) ? (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                This node does not have editable configuration yet.
              </p>
            ) : null}
          </div>

          <NodePreviewPanel nodeType={nodeType} data={data} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Apply to node
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
