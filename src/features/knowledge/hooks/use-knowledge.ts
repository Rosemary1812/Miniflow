import { useTRPC } from '@/app/trpc/client';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useKnowledgeBases = (search = '') => {
  const trpc = useTRPC();
  return useQuery(trpc.knowledgeBases.list.queryOptions({ search }));
};

export const useSuspenseKnowledgeBase = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.knowledgeBases.getOne.queryOptions({ id }));
};

export const useKnowledgeDocuments = (knowledgeBaseId: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.knowledgeDocuments.list.queryOptions({ knowledgeBaseId }));
};

export const useSuspenseKnowledgeDocument = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.knowledgeDocuments.getOne.queryOptions({ id }));
};

export const useKnowledgeChunks = (documentId: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.knowledgeChunks.listByDocument.queryOptions({ documentId }));
};

export const useCreateKnowledgeBase = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.knowledgeBases.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Knowledge base "${data.name}" created`);
        void queryClient.invalidateQueries(trpc.knowledgeBases.list.queryFilter());
      },
      onError: error => toast.error(`Failed to create knowledge base: ${error.message}`),
    }),
  );
};

export const useRemoveKnowledgeBase = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.knowledgeBases.remove.mutationOptions({
      onSuccess: data => {
        toast.success(`Knowledge base "${data.name}" removed`);
        void queryClient.invalidateQueries(trpc.knowledgeBases.list.queryFilter());
      },
      onError: error => toast.error(`Failed to remove knowledge base: ${error.message}`),
    }),
  );
};

export const useCreateTextDocument = (knowledgeBaseId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.knowledgeDocuments.createText.mutationOptions({
      onSuccess: data => {
        toast.success(`Document "${data.title}" queued`);
        void queryClient.invalidateQueries(
          trpc.knowledgeDocuments.list.queryOptions({ knowledgeBaseId }),
        );
        void queryClient.invalidateQueries(
          trpc.knowledgeBases.getOne.queryOptions({ id: knowledgeBaseId }),
        );
      },
      onError: error => toast.error(`Failed to import document: ${error.message}`),
    }),
  );
};

export const useCreateKnowledgeDocument = (knowledgeBaseId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.knowledgeDocuments.create.mutationOptions({
      onSuccess: data => {
        toast.success(`Document "${data.title}" queued`);
        void queryClient.invalidateQueries(
          trpc.knowledgeDocuments.list.queryOptions({ knowledgeBaseId }),
        );
        void queryClient.invalidateQueries(
          trpc.knowledgeBases.getOne.queryOptions({ id: knowledgeBaseId }),
        );
      },
      onError: error => toast.error(`Failed to import document: ${error.message}`),
    }),
  );
};

export const useRemoveKnowledgeDocument = (knowledgeBaseId: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.knowledgeDocuments.remove.mutationOptions({
      onSuccess: data => {
        toast.success(`Document "${data.title}" removed`);
        void queryClient.invalidateQueries(
          trpc.knowledgeDocuments.list.queryOptions({ knowledgeBaseId }),
        );
      },
      onError: error => toast.error(`Failed to remove document: ${error.message}`),
    }),
  );
};

export const useReprocessKnowledgeDocument = (knowledgeBaseId: string, documentId?: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.knowledgeDocuments.reprocess.mutationOptions({
      onSuccess: data => {
        toast.success('Document reprocessing queued');
        void queryClient.invalidateQueries(
          trpc.knowledgeDocuments.list.queryOptions({ knowledgeBaseId }),
        );
        void queryClient.invalidateQueries(
          trpc.knowledgeDocuments.getOne.queryOptions({ id: data.id }),
        );
        if (documentId) {
          void queryClient.invalidateQueries(
            trpc.knowledgeChunks.listByDocument.queryOptions({ documentId }),
          );
        }
      },
      onError: error => toast.error(`Failed to reprocess document: ${error.message}`),
    }),
  );
};

export const useTestKnowledgeRetrieval = () => {
  const trpc = useTRPC();
  return useMutation(
    trpc.knowledgeRetrieval.test.mutationOptions({
      onError: error => toast.error(`Retrieval failed: ${error.message}`),
    }),
  );
};
