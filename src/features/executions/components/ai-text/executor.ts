import Handlebars from 'handlebars';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NonRetriableError } from 'inngest';
import { AiProviderKind } from '@prisma/client';
import type { NodeExecutor } from '@/features/executions/types';
import { aiTextChannel } from '@/inngest/channels/ai-text';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';

Handlebars.registerHelper('json', context => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type AiTextNodeData = {
  variableName?: string;
  providerProfileId?: string;
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
};

const defaultModelByProvider: Record<AiProviderKind, string> = {
  [AiProviderKind.OPENAI_COMPATIBLE]: 'gpt-4o',
  [AiProviderKind.ANTHROPIC]: 'claude-3-5-sonnet-latest',
  [AiProviderKind.GEMINI]: 'gemini-2.0-flash',
};

export const aiTextExecutor: NodeExecutor<AiTextNodeData> = async ({
  data,
  nodeId,
  workspaceId,
  context,
  step,
  publish,
}) => {
  await publish(
    aiTextChannel().status({
      nodeId,
      status: 'loading',
    }),
  );

  if (!data.variableName) {
    await publish(aiTextChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('AI Text variableName is missing');
  }

  if (!data.providerProfileId) {
    await publish(aiTextChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('AI Text provider profile is required');
  }

  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : 'You are a helpful assistant.';
  const userPrompt = Handlebars.compile(data.userPrompt || '')(context);

  if (!userPrompt) {
    await publish(aiTextChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('AI Text user prompt is required');
  }

  const providerProfile = await step.run('get-ai-provider-profile', () => {
    return prisma.aiProviderProfile.findFirst({
      where: {
        id: data.providerProfileId,
        workspaceId,
        enabled: true,
      },
    });
  });

  if (!providerProfile) {
    await publish(aiTextChannel().status({ nodeId, status: 'error' }));
    throw new NonRetriableError('AI Text provider profile was not found or is disabled');
  }

  const apiKey = decrypt(providerProfile.encryptedApiKey, providerProfile.iv);
  const modelName =
    data.model || providerProfile.defaultModel || defaultModelByProvider[providerProfile.provider];

  const model =
    providerProfile.provider === AiProviderKind.OPENAI_COMPATIBLE
      ? createOpenAI({
          apiKey,
          ...(providerProfile.baseURL && { baseURL: providerProfile.baseURL }),
        })(modelName)
      : providerProfile.provider === AiProviderKind.ANTHROPIC
        ? createAnthropic({
            apiKey,
            ...(providerProfile.baseURL && { baseURL: providerProfile.baseURL }),
          })(modelName)
        : createGoogleGenerativeAI({
            apiKey,
            ...(providerProfile.baseURL && { baseURL: providerProfile.baseURL }),
          })(modelName);

  try {
    const { steps } = await step.ai.wrap('ai-text-generate-text', generateText, {
      model,
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: false,
        recordOutputs: true,
      },
    });
    const text = steps[0].content[0].type === 'text' ? steps[0].content[0].text : '';

    await publish(aiTextChannel().status({ nodeId, status: 'success' }));

    return {
      ...context,
      [data.variableName]: {
        aiResponse: text,
        provider: providerProfile.provider,
        model: modelName,
      },
    };
  } catch (error) {
    await publish(aiTextChannel().status({ nodeId, status: 'error' }));
    throw error;
  }
};
