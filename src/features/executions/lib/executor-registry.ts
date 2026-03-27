import { NodeType } from '@prisma/client';
import { NodeExecutor } from '../types';
import { manualTriggerExecutor } from '@/features/triggers/components/manual-trigger/executor';
import { httpRequestExecutor } from '../components/http-request/executor';
import { googleFormTriggerExecutor } from '@/features/triggers/components/google-form-trigger/executor';
import { geminiExecutor } from '../components/gemini/executor';
import { stripeTriggerExecutor } from '@/features/triggers/components/stripe-trigger/executor';
import { openAiExecutor } from '../components/openai/executor';
import { anthropicExecutor } from '../components/anthropic/executor';
import { discordExecutor } from '../components/discord/executor';
import { slackExecutor } from '../components/slack/executor';
import { ifBranchExecutor } from '../components/if-branch/executor';
import { scheduleTriggerExecutor } from '@/features/triggers/components/schedule-trigger/executor';

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.OPENAI]: openAiExecutor,
  [NodeType.SLACK]: slackExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.IF_BRANCH]: ifBranchExecutor,
  [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
};
export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type:${type}`);
  }
  return executor;
};
