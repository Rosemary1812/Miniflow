'use client';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { FileTextIcon, LayersIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/app/trpc/client';
import { useMutation } from '@tanstack/react-query';
import type { Workflow } from '@prisma/client';

interface TemplateCardProps {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI',
  automation: 'Automation',
  social: 'Social Media',
  general: 'General',
};

const CATEGORY_COLORS: Record<string, string> = {
  ai: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  automation: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  social: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export const TemplateCard = ({ id, name, description, category }: TemplateCardProps) => {
  const router = useRouter();
  const trpc = useTRPC();

  const createFromTemplate = useMutation(
    trpc.templates.createFromTemplate.mutationOptions({
      onSuccess: (workflow: Workflow) => {
        toast.success(`Created "${workflow.name}" from template`);
        router.push(`/workflows/${workflow.id}`);
      },
      onError: (error: { message: string }) => {
        toast.error(`Failed to create workflow: ${error.message}`);
      },
    }),
  );

  const handleUseTemplate = () => {
    createFromTemplate.mutate({ templateId: id });
  };

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-4 text-muted-foreground" />
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                CATEGORY_COLORS[category] || CATEGORY_COLORS.general
              }`}
            >
              {CATEGORY_LABELS[category] || category}
            </span>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{name}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <LayersIcon className="size-3" />
          <span>Template</span>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          size="sm"
          className="w-full"
          onClick={handleUseTemplate}
          disabled={createFromTemplate.isPending}
        >
          {createFromTemplate.isPending ? 'Creating...' : 'Use Template'}
        </Button>
      </CardFooter>
    </Card>
  );
};
