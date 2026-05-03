import Handlebars from 'handlebars';
import type { NodeExecutor } from '@/features/executions/types';
import { createAnthropic } from '@ai-sdk/anthropic';
import { anthropicChannel } from '@/inngest/channels/anthropic';
import { generateText } from 'ai';
import { NonRetriableError } from 'inngest';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';

Handlebars.registerHelper('json', context => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});
type AnthropicNodeData = {
  variableName?: string;
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
  baseURL?: string; // optional, supports Groq/OpenRouter/any Anthropic-compatible API
  model?: string; // optional, defaults to 'claude-3-5-sonnet-latest'
};
export const anthropicExecutor: NodeExecutor<AnthropicNodeData> = async ({
  data,
  nodeId,
  workspaceId,
  context,
  step,
  publish,
}) => {
  await publish(
    anthropicChannel().status({
      nodeId,
      status: 'loading',
    }),
  );
  if (!data.variableName) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw new NonRetriableError('Anthropic variableName is missing');
  }
  if (!data.credentialId) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw new NonRetriableError('Anthropic node:CredentialId is required ');
  }
  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : 'You are a helpful assistant.';

  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  const credential = await step.run('get-credential', () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        workspaceId,
      },
    });
  });

  if (!credential) {
    throw new NonRetriableError('Anthropic node:CredentialId is not found');
  }

  // Decrypt the stored API key
  const apiKey = decrypt(credential.encryptedValue, credential.iv);

  const anthropic = createAnthropic({
    apiKey,
    ...(data.baseURL && { baseURL: data.baseURL }),
  });
  try {
    const { steps } = await step.ai.wrap('anthropic-generate-text', generateText, {
      model: anthropic(data.model || 'claude-3-5-sonnet-latest'),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: false, // Disabled to prevent API key from appearing in logs
        recordOutputs: true,
      },
    });
    const text = steps[0].content[0].type === 'text' ? steps[0].content[0].text : '';
    await publish(
      anthropicChannel().status({
        nodeId,
        status: 'success',
      }),
    );
    return {
      ...context,
      [data.variableName]: {
        aiResponse: text,
      },
    };
  } catch (error) {
    await publish(
      anthropicChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw error;
  }
};
