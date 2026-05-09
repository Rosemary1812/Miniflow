'use client';

import { AiProviderKind } from '@prisma/client';
import {
  useCreateAiProvider,
  useUpdateAiProvider,
  useSuspenseAiProvider,
} from '../hooks/use-credentials';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.enum(AiProviderKind),
  baseURL: z.string().optional(),
  apiKey: z.string().min(1, 'API key is required'),
  defaultModel: z.string().optional(),
  enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const providerOptions = [
  {
    value: AiProviderKind.OPENAI_COMPATIBLE,
    label: 'OpenAI-compatible',
    logo: '/logos/openai.svg',
    defaultModel: 'gpt-4o',
    baseURL: 'https://api.openai.com/v1',
  },
  {
    value: AiProviderKind.ANTHROPIC,
    label: 'Anthropic',
    logo: '/logos/anthropic.svg',
    defaultModel: 'claude-3-5-sonnet-latest',
    baseURL: 'https://api.anthropic.com/v1',
  },
  {
    value: AiProviderKind.GEMINI,
    label: 'Gemini',
    logo: '/logos/gemini.svg',
    defaultModel: 'gemini-2.0-flash',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
  },
];

interface AiProviderFormProps {
  initialData?: {
    id?: string;
    name: string;
    provider: AiProviderKind;
    baseURL: string | null;
    apiKey: string;
    defaultModel: string | null;
    enabled: boolean;
  };
}

export const CredentialForm = ({ initialData }: AiProviderFormProps) => {
  const router = useRouter();
  const createProvider = useCreateAiProvider();
  const updateProvider = useUpdateAiProvider();

  const isEdit = !!initialData?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          provider: initialData.provider,
          baseURL: initialData.baseURL || '',
          apiKey: initialData.apiKey,
          defaultModel: initialData.defaultModel || '',
          enabled: initialData.enabled,
        }
      : {
          name: '',
          provider: AiProviderKind.OPENAI_COMPATIBLE,
          baseURL: '',
          apiKey: '',
          defaultModel: 'gpt-4o',
          enabled: true,
        },
  });

  const provider = form.watch('provider');
  const providerOption = providerOptions.find(option => option.value === provider);

  const onSubmit = async (values: FormValues) => {
    if (isEdit && initialData?.id) {
      await updateProvider.mutateAsync({
        id: initialData.id,
        ...values,
      });
    } else {
      await createProvider.mutateAsync(values, {
        onSuccess: data => {
          router.push(`/providers/${data.id}`);
        },
      });
    }
  };

  const applyProviderDefaults = (nextProvider: AiProviderKind) => {
    const option = providerOptions.find(item => item.value === nextProvider);
    form.setValue('provider', nextProvider);
    if (!form.getValues('defaultModel')) {
      form.setValue('defaultModel', option?.defaultModel || '');
    }
    if (!form.getValues('baseURL')) {
      form.setValue('baseURL', option?.baseURL || '');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Provider Profile' : 'Create Provider Profile'}</CardTitle>
        <CardDescription>
          Save a reusable AI provider connection for workflow nodes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="OpenRouter Production" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={applyProviderDefaults} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providerOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Image src={option.logo} alt={option.label} width={16} height={16} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    OpenAI-compatible supports OpenAI, OpenRouter, Groq, DeepSeek, and similar APIs.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="baseURL"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder={providerOption?.baseURL} {...field} />
                    </FormControl>
                    <FormDescription>Leave empty to use the SDK default endpoint.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Model</FormLabel>
                    <FormControl>
                      <Input placeholder={providerOption?.defaultModel} {...field} />
                    </FormControl>
                    <FormDescription>AI nodes can override this per workflow step.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="sk-..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <FormLabel>Enabled</FormLabel>
                    <FormDescription>
                      Disabled providers cannot be selected by AI nodes.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={createProvider.isPending || updateProvider.isPending}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/providers" prefetch>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export const CredentialView = ({ credentialId }: { credentialId: string }) => {
  const { data: provider } = useSuspenseAiProvider(credentialId);
  if (!provider) return null;
  return <CredentialForm initialData={provider} />;
};
