import prisma from '@/lib/db';
import { inngest } from './client';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';

const google = createGoogleGenerativeAI();
// const openai = createOpenAI();
// const anthropic = createAnthropic();
export const execute = inngest.createFunction(
  { id: 'execute' },
  { event: 'execute/ai' },
  async ({ event, step }) => {
    await step.sleep('pretend', '5s');
    console.warn('Something is missing');
    console.error('This is error');
    const { steps: deepseekSteps } = await step.ai.wrap('deepseek-generate-text', generateText, {
      model: deepseek('deepseek-chat'),
      system: 'you are a helpful assisstant',
      prompt: 'what is 22*22?',
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });
    // const { steps: geminiSteps } = await step.ai.wrap('gemini-generate-text', generateText, {
    //   model: google('models/gemini-1.5-flash'),
    //   system: 'you are a helpful assisstant',
    //   prompt: 'what is 22*22?',
    //   experimental_telemetry: {
    //     isEnabled: true,
    //     recordInputs: true,
    //     recordOutputs: true,
    //   },
    // });
    // const { steps: openaiSteps } = await step.ai.wrap('openai-generate-text', generateText, {
    //   model: openai('gpt-4o-mini'),
    //   system: 'you are a helpful assisstant',
    //   prompt: 'what is 22*22?',
    //     experimental_telemetry: {
    //   isEnabled: true,
    //   recordInputs: true,
    //   recordOutputs: true,
    // },
    // });
    // const { steps: anthropicSteps } = await step.ai.wrap('anthropic-generate-text', generateText, {
    //   model: anthropic('claude-3-opus-20240229'),
    //   system: 'you are a helpful assisstant',
    //   prompt: 'what is 22*22?',
    //     experimental_telemetry: {
    //   isEnabled: true,
    //   recordInputs: true,
    //   recordOutputs: true,
    // },
    // });
    return {
      deepseekSteps,
      // geminiSteps,
      // openaiSteps,
      // anthropicSteps,
    };
  },
);
