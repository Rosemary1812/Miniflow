import { NodeType } from '@prisma/client';
import { NodeExecutor } from '../types';
import { manualTriggerExecutor } from '@/features/triggers/components/manual-trigger/executor';
import { httpRequestExecutor } from '../components/http-request/executor';
import { googleFormTriggerExecutor } from '@/features/triggers/components/google-form-trigger/executor';
import { stripeTriggerExecutor } from '@/features/triggers/components/stripe-trigger/executor';
import { aiTextExecutor } from '../components/ai-text/executor';
import { discordExecutor } from '../components/discord/executor';
import { slackExecutor } from '../components/slack/executor';
import { ifBranchExecutor } from '../components/if-branch/executor';
import { scheduleTriggerExecutor } from '@/features/triggers/components/schedule-trigger/executor';
import { mcpToolExecutor } from '../components/mcp-tool/executor';
import { knowledgeRetrievalExecutor } from '../components/knowledge-retrieval/executor';

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.AI_TEXT]: aiTextExecutor,
  [NodeType.SLACK]: slackExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.IF_BRANCH]: ifBranchExecutor,
  [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
  [NodeType.MCP_TOOL]: mcpToolExecutor,
  [NodeType.KNOWLEDGE_RETRIEVAL]: knowledgeRetrievalExecutor,
};
export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type:${type}`);
  }
  return executor;
};
