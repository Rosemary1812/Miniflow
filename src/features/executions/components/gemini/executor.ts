import Handlebars from 'handlebars';
import type { NodeExecutor } from '@/features/executions/types';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { geminiChannel } from '@/inngest/channels/gemini';
import { generateText } from 'ai';
import { NonRetriableError } from 'inngest';
import prisma from '@/lib/db';
import { decrypt } from '@/lib/crypto';

Handlebars.registerHelper('json', context => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});
type GeminiNodeData = {
  variableName?: string;
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
  baseURL?: string; // optional, for compatible providers like Groq, OpenRouter
  model?: string; // optional, defaults to 'gemini-2.0-flash'
};
export const geminiExecutor: NodeExecutor<GeminiNodeData> = async ({
  data,
  nodeId,
  workspaceId,
  context,
  step,
  publish,
}) => {
  await publish(
    geminiChannel().status({
      nodeId,
      status: 'loading',
    }),
  );
  if (!data.variableName) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw new NonRetriableError('Gemini variableName is missing');
  }
  if (!data.credentialId) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw new NonRetriableError('Gemini node:CredentialId is required ');
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
    throw new NonRetriableError('Gemini node:CredentialId is not found');
  }

  // Decrypt the stored API key
  const apiKey = decrypt(credential.encryptedValue, credential.iv);

  const google = createGoogleGenerativeAI({
    apiKey,
    ...(data.baseURL && { baseURL: data.baseURL }),
  });
  try {
    const { steps } = await step.ai.wrap('gemini-generate-text', generateText, {
      model: google(data.model || 'gemini-2.0-flash'),
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
      geminiChannel().status({
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
      geminiChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw error;
  }
};
