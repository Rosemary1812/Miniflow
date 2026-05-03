'use client';

import { PlusIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { NodeSelector } from '@/components/node-selector';

export const AddNodeButton = memo(({ disabled }: { disabled?: boolean }) => {
  const [selectorOpen, setSelectorOpen] = useState(false);
  return (
    <NodeSelector open={selectorOpen} onOpenChange={setSelectorOpen}>
      <Button
        disabled={disabled}
        onClick={() => setSelectorOpen(true)}
        size="icon"
        variant="outline"
        className="bg-background"
      >
        <PlusIcon />
      </Button>
    </NodeSelector>
  );
});

AddNodeButton.displayName = 'AddNodeButton';
