import { KnowledgeSourceType } from '@prisma/client';
import { cleanKnowledgeText, chunkText, type TextChunk } from './chunking';

export type ParsedKnowledgeDocument = {
  text: string;
  chunks: TextChunk[];
};

type ParseKnowledgeDocumentInput = {
  sourceType: KnowledgeSourceType;
  sourceText: string;
  sourceData?: string | null;
};

const markdownHeadingPattern = /^#{1,6}\s+/gm;
const markdownFencePattern = /```[\s\S]*?```/g;
const markdownLinkPattern = /\[([^\]]+)]\(([^)]+)\)/g;

const normalizeMarkdown = (input: string): string => {
  return cleanKnowledgeText(
    input
      .replace(markdownFencePattern, block =>
        block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, ''),
      )
      .replace(markdownLinkPattern, '$1 ($2)')
      .replace(markdownHeadingPattern, '')
      .replace(/[*_~`>#-]/g, ' '),
  );
};

const extractPdfText = async (sourceData: string): Promise<ParsedKnowledgeDocument> => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = Uint8Array.from(Buffer.from(sourceData, 'base64'));
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const chunks: TextChunk[] = [];
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = cleanKnowledgeText(
      textContent.items.map(item => ('str' in item ? item.str : '')).join(' '),
    );

    if (!text) {
      continue;
    }

    pageTexts.push(text);
    chunks.push(
      ...chunkText(text, {
        metadata: {
          page: pageNumber,
          sourceType: KnowledgeSourceType.PDF,
        },
      }),
    );
  }

  return {
    text: pageTexts.join('\n\n'),
    chunks: chunks.map((chunk, index) => ({ ...chunk, index })),
  };
};

export const parseKnowledgeDocument = async ({
  sourceType,
  sourceText,
  sourceData,
}: ParseKnowledgeDocumentInput): Promise<ParsedKnowledgeDocument> => {
  if (sourceType === KnowledgeSourceType.PDF) {
    if (!sourceData) {
      throw new Error('PDF source data is missing');
    }
    return extractPdfText(sourceData);
  }

  const text =
    sourceType === KnowledgeSourceType.MARKDOWN
      ? normalizeMarkdown(sourceText)
      : cleanKnowledgeText(sourceText);

  return {
    text,
    chunks: chunkText(text, {
      metadata: {
        sourceType,
      },
    }),
  };
};
