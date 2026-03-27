'use client';

import { useState } from 'react';
import { TemplateCard } from './template-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/app/trpc/client';
import { useQuery } from '@tanstack/react-query';
import type { WorkflowTemplate } from '@prisma/client';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'ai', label: 'AI' },
  { value: 'automation', label: 'Automation' },
  { value: 'social', label: 'Social Media' },
  { value: 'general', label: 'General' },
];

export const TemplatesGrid = () => {
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const trpc = useTRPC();

  const templates = useQuery(
    trpc.templates.getMany.queryOptions({
      category: category || undefined,
      search: search || undefined,
    }),
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={category === cat.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {templates.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[180px] rounded-lg border animate-pulse bg-muted"
            />
          ))}
        </div>
      ) : templates.data && templates.data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.data.map((template: WorkflowTemplate) => (
            <TemplateCard
              key={template.id}
              id={template.id}
              name={template.name}
              description={template.description}
              category={template.category}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>No templates found.</p>
          <p className="text-sm mt-1">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );
};
