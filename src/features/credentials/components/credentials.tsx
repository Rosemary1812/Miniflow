'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from '@/components/entity-components';
import {
  useRemoveAiProvider,
  useSuspenseAiProviders,
} from '@/features/credentials/hooks/use-credentials';
import { useRouter } from 'next/navigation';
import { useCredentialsParams } from '../hooks/use-credentials-params';
import { useEntitySearch } from '@/hooks/use-entity-search';
import { AiProviderKind } from '@prisma/client';
import Image from 'next/image';

type AiProviderListItem = {
  id: string;
  name: string;
  provider: AiProviderKind;
  baseURL: string | null;
  defaultModel: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export const CredentialSearch = () => {
  const [params, setParams] = useCredentialsParams();
  const { searchValue, onSearchChange } = useEntitySearch({ params, setParams });
  return (
    <EntitySearch value={searchValue} onChange={onSearchChange} placeholder="Search providers" />
  );
};

export const CredentialsList = () => {
  const providers = useSuspenseAiProviders();

  return (
    <EntityList
      items={providers.data.items}
      getKey={provider => provider.id}
      renderItem={provider => <CredentialItem data={provider} />}
      emptyView={<CredentialsEmpty />}
    />
  );
};

export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {
  return (
    <EntityHeader
      title="Provider Profiles"
      description="Create and manage reusable AI provider connections"
      newBottonLabel="New Provider"
      newBottonHref="/providers/new"
      disabled={disabled}
    />
  );
};

export const CredentialsPagination = () => {
  const providers = useSuspenseAiProviders();
  const [params, setParams] = useCredentialsParams();

  return (
    <EntityPagination
      disabled={providers.isFetching}
      totalPages={providers.data.totalPages}
      page={providers.data.page}
      onPageChange={page => setParams({ ...params, page })}
    />
  );
};

export const CredentialsContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer
      header={<CredentialsHeader />}
      search={<CredentialSearch />}
      pagination={<CredentialsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const CredentialsLoading = () => {
  return <LoadingView message="Loading providers..." />;
};

export const CredentialsError = () => {
  return <ErrorView message="Error loading providers..." />;
};

export const CredentialsEmpty = () => {
  const router = useRouter();
  const handleCreate = () => {
    router.push(`/providers/new`);
  };
  return (
    <EmptyView
      onNew={handleCreate}
      message="No providers found. Create a provider profile to use AI nodes."
    />
  );
};

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

export const CredentialItem = ({ data }: { data: AiProviderListItem }) => {
  const removeProvider = useRemoveAiProvider();
  const handleRemove = () => {
    removeProvider.mutate({ id: data.id });
  };

  const modelLabel = data.defaultModel ? ` • ${data.defaultModel}` : '';
  const statusLabel = data.enabled ? 'Enabled' : 'Disabled';

  return (
    <EntityItem
      href={`/providers/${data.id}`}
      title={data.name}
      subtitle={
        <>
          {providerLabels[data.provider]}
          {modelLabel} • {statusLabel} • Updated{' '}
          {formatDistanceToNow(data.updatedAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <Image src={providerLogos[data.provider]} alt={data.provider} width={20} height={20} />
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeProvider.isPending}
    />
  );
};
