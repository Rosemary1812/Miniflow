export type TextChunk = {
  index: number;
  content: string;
  tokenCount: number;
  metadata: {
    start: number;
    end: number;
    page?: number;
    section?: string;
    sourceType?: string;
  };
};

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 120;

export const cleanKnowledgeText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const estimateTokenCount = (text: string): number => {
  return Math.max(1, Math.ceil(text.length / 4));
};

export const chunkText = (
  input: string,
  options: {
    chunkSize?: number;
    chunkOverlap?: number;
    metadata?: Omit<TextChunk['metadata'], 'start' | 'end'>;
  } = {},
): TextChunk[] => {
  const text = cleanKnowledgeText(input);
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = Math.min(options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP, chunkSize - 1);

  if (!text) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const targetEnd = Math.min(start + chunkSize, text.length);
    const window = text.slice(start, targetEnd);
    const paragraphBreak = window.lastIndexOf('\n\n');
    const sentenceBreak = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('? '),
      window.lastIndexOf('! '),
    );
    const breakAt =
      targetEnd === text.length
        ? window.length
        : paragraphBreak > chunkSize * 0.45
          ? paragraphBreak + 2
          : sentenceBreak > chunkSize * 0.45
            ? sentenceBreak + 2
            : window.length;
    const end = Math.min(start + breakAt, text.length);
    const content = text.slice(start, end).trim();

    if (content) {
      chunks.push({
        index: chunks.length,
        content,
        tokenCount: estimateTokenCount(content),
        metadata: { ...options.metadata, start, end },
      });
    }

    if (end >= text.length) {
      break;
    }
    start = Math.max(0, end - chunkOverlap);
  }

  return chunks;
};
