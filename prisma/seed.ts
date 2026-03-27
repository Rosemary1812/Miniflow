import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import type { Node, Edge } from '@xyflow/react';
import { NodeType } from '@prisma/client';

const prisma = new PrismaClient();

const PRESET_TEMPLATES = [
  {
    name: 'AI Article Summarizer',
    description: 'Fetch an article URL and summarize it using AI',
    category: 'ai',
    nodes: [
      { id: 'trigger', type: NodeType.MANUAL_TRIGGER, position: { x: 0, y: 0 }, data: {} },
      {
        id: 'http',
        type: NodeType.HTTP_REQUEST,
        position: { x: 250, y: 0 },
        data: {
          variableName: 'article',
          method: 'GET',
          endpoint: '{{articleUrl}}',
        },
      },
      {
        id: 'gemini',
        type: NodeType.GEMINI,
        position: { x: 500, y: 0 },
        data: {
          variableName: 'summary',
          userPrompt: 'Summarize the following article in 3 bullet points:\n\n{{article.httpResponse.data}}',
        },
      },
    ],
    edges: [
      { source: 'trigger', target: 'http', sourceHandle: null, targetHandle: null },
      { source: 'http', target: 'gemini', sourceHandle: null, targetHandle: null },
    ],
  },
  {
    name: 'Daily Slack Status Update',
    description: 'Send a daily status update to Slack with AI-generated summary',
    category: 'social',
    nodes: [
      { id: 'schedule', type: NodeType.SCHEDULE_TRIGGER, position: { x: 0, y: 0 }, data: { cron: '0 9 * * *', timezone: 'UTC' } },
      { id: 'gemini', type: NodeType.GEMINI, position: { x: 250, y: 0 }, data: { variableName: 'summary', userPrompt: 'Generate a brief daily standup summary from recent data' } },
      { id: 'slack', type: NodeType.SLACK, position: { x: 500, y: 0 }, data: { channel: '#general', message: '{{summary.response}}' } },
    ],
    edges: [
      { source: 'schedule', target: 'gemini', sourceHandle: null, targetHandle: null },
      { source: 'gemini', target: 'slack', sourceHandle: null, targetHandle: null },
    ],
  },
  {
    name: 'Webhook → Discord Alert',
    description: 'Receive webhook triggers and post alerts to Discord',
    category: 'automation',
    nodes: [
      { id: 'manual', type: NodeType.MANUAL_TRIGGER, position: { x: 0, y: 0 }, data: {} },
      { id: 'discord', type: NodeType.DISCORD, position: { x: 250, y: 0 }, data: { message: 'Alert received from workflow' } },
    ],
    edges: [
      { source: 'manual', target: 'discord', sourceHandle: null, targetHandle: null },
    ],
  },
  {
    name: 'AI Content Filter',
    description: 'Fetch content, use AI to classify and route based on sentiment',
    category: 'ai',
    nodes: [
      { id: 'trigger', type: NodeType.MANUAL_TRIGGER, position: { x: 0, y: 0 }, data: {} },
      {
        id: 'http',
        type: NodeType.HTTP_REQUEST,
        position: { x: 250, y: 0 },
        data: { variableName: 'content', method: 'GET', endpoint: '{{url}}' },
      },
      {
        id: 'gemini',
        type: NodeType.GEMINI,
        position: { x: 250, y: 200 },
        data: {
          variableName: 'sentiment',
          userPrompt: 'Classify the sentiment of this text as positive, negative, or neutral: {{content.httpResponse.data}}',
        },
      },
      {
        id: 'if',
        type: NodeType.IF_BRANCH,
        position: { x: 500, y: 100 },
        data: {
          variable: '{{sentiment.response}}',
          operator: 'equals',
          value: 'positive',
        },
      },
      {
        id: 'discord_pos',
        type: NodeType.DISCORD,
        position: { x: 750, y: 0 },
        data: { message: 'Positive content found!' },
      },
      {
        id: 'discord_neg',
        type: NodeType.DISCORD,
        position: { x: 750, y: 200 },
        data: { message: 'Negative content detected.' },
      },
    ],
    edges: [
      { source: 'trigger', target: 'http', sourceHandle: null, targetHandle: null },
      { source: 'http', target: 'gemini', sourceHandle: null, targetHandle: null },
      { source: 'gemini', target: 'if', sourceHandle: null, targetHandle: null },
      { source: 'if', target: 'discord_pos', sourceHandle: 'true', targetHandle: null },
      { source: 'if', target: 'discord_neg', sourceHandle: 'false', targetHandle: null },
    ],
  },
];

async function main() {
  console.log('Seeding preset templates...');

  for (const template of PRESET_TEMPLATES) {
    // Map old IDs to new ones
    const idMap = new Map<string, string>();
    const newNodes = template.nodes.map(node => {
      const newId = createId();
      idMap.set(node.id, newId);
      return {
        id: newId,
        type: node.type,
        position: node.position,
        data: node.data,
      };
    });

    const newEdges = template.edges.map(edge => ({
      fromNodeId: idMap.get(edge.source) || edge.source,
      toNodeId: idMap.get(edge.target) || edge.target,
      fromOutput: edge.sourceHandle || 'main',
      toInput: edge.targetHandle || 'main',
    }));

    await prisma.workflowTemplate.upsert({
      where: { id: template.name.toLowerCase().replace(/\s+/g, '-') },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        nodes: newNodes as any,
        edges: newEdges as any,
        isBuiltIn: true,
      },
      create: {
        id: template.name.toLowerCase().replace(/\s+/g, '-'),
        name: template.name,
        description: template.description,
        category: template.category,
        nodes: newNodes as any,
        edges: newEdges as any,
        isBuiltIn: true,
      },
    });

    console.log(`  ✓ ${template.name}`);
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
