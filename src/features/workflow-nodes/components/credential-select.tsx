'use client';

import Image from 'next/image';
import { CredentialType } from '@prisma/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCredentialsByType } from '@/features/credentials/hooks/use-credentials';

const credentialLogos: Record<CredentialType, string> = {
  OPENAI: '/logos/openai.svg',
  ANTHROPIC: '/logos/anthropic.svg',
  GEMINI: '/logos/gemini.svg',
};

type Props = {
  type: CredentialType;
  value?: string;
  onChange: (credentialId: string) => void;
};

export const CredentialSelect = ({ type, value, onChange }: Props) => {
  const credentials = useCredentialsByType(type);

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={credentials.isLoading || !credentials.data?.length}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={credentials.isLoading ? 'Loading credentials' : 'Select credential'}
        />
      </SelectTrigger>
      <SelectContent>
        {credentials.data?.map(credential => (
          <SelectItem key={credential.id} value={credential.id}>
            <span className="flex items-center gap-2">
              <Image src={credentialLogos[type]} alt={type} width={16} height={16} />
              {credential.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
