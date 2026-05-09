'use client';

import Image from 'next/image';
import { AiProviderKind } from '@prisma/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEnabledAiProviders } from '@/features/credentials/hooks/use-credentials';

const providerLogos: Record<AiProviderKind, string> = {
  [AiProviderKind.OPENAI_COMPATIBLE]: '/logos/openai.svg',
  [AiProviderKind.ANTHROPIC]: '/logos/anthropic.svg',
  [AiProviderKind.GEMINI]: '/logos/gemini.svg',
};

const providerLabels: Record<AiProviderKind, string> = {
  [AiProviderKind.OPENAI_COMPATIBLE]: 'OpenAI-compatible',
  [AiProviderKind.ANTHROPIC]: 'Anthropic',
  [AiProviderKind.GEMINI]: 'Gemini',
};

type Props = {
  value?: string;
  onChange: (providerProfileId: string) => void;
};

export const ProviderProfileSelect = ({ value, onChange }: Props) => {
  const providers = useEnabledAiProviders();

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={providers.isLoading || !providers.data?.length}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={providers.isLoading ? 'Loading providers' : 'Select provider'} />
      </SelectTrigger>
      <SelectContent>
        {providers.data?.map(provider => (
          <SelectItem key={provider.id} value={provider.id}>
            <span className="flex items-center gap-2">
              <Image
                src={providerLogos[provider.provider]}
                alt={providerLabels[provider.provider]}
                width={16}
                height={16}
              />
              {provider.name}
              {provider.defaultModel ? (
                <span className="text-muted-foreground">({provider.defaultModel})</span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
