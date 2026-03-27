import Handlebars from 'handlebars';
import { decode } from 'html-entities';
import type { NodeExecutor } from '@/features/executions/types';
import { discordChannel } from '@/inngest/channels/discord';
import { generateText } from 'ai';
import { NonRetriableError } from 'inngest';
import prisma from '@/lib/db';
import ky from 'ky';
import { slackChannel } from '@/inngest/channels/slack';

Handlebars.registerHelper('json', context => {
  const jsonString = JSON.stringify(context, null, 2);
  const safeString = new Handlebars.SafeString(jsonString);
  return safeString;
});
type SlackData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
};
export const slackExecutor: NodeExecutor<SlackData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    slackChannel().status({
      nodeId,
      status: 'loading',
    }),
  );

  if (!data.content) {
    await publish(
      slackChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw new NonRetriableError('Slack content is missing');
  }

  const rawContent = Handlebars.compile(data.content)(context);
  const content = decode(rawContent);

  try {
    const result = await step.run('slack-webhook', async () => {
      await ky.post(data.webhookUrl!, {
        json: {
          content: content,
        },
      });
      if (!data.variableName) {
        await publish(
          slackChannel().status({
            nodeId,
            status: 'error',
          }),
        );
        throw new NonRetriableError('Slack variableName is missing');
      }
      if (!data.webhookUrl) {
        await publish(
          slackChannel().status({
            nodeId,
            status: 'error',
          }),
        );
        throw new NonRetriableError('Slack webhookUrl is missing');
      }
      return {
        ...context,
        [data.variableName]: {
          messageContent: (content || '').slice(0, 2000),
        },
      };
    });
    await publish(
      slackChannel().status({
        nodeId,
        status: 'success',
      }),
    );
    return result;
  } catch (error) {
    await publish(
      slackChannel().status({
        nodeId,
        status: 'error',
      }),
    );
    throw error;
  }
};
