'use client';

import { useRef, useState } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Editor } from '@/features/components/editor';
import { PublishPanel } from '@/features/workflows/components/publish-panel';

export const WorkflowEditorLayout = ({ workflowId }: { workflowId: string }) => {
  const publishPanelRef = useRef<ImperativePanelHandle>(null);
  const [isPublishPanelOpen, setIsPublishPanelOpen] = useState(true);

  const togglePublishPanel = () => {
    const panel = publishPanelRef.current;
    if (!panel) {
      setIsPublishPanelOpen(open => !open);
      return;
    }

    if (isPublishPanelOpen) {
      panel.collapse();
      setIsPublishPanelOpen(false);
    } else {
      panel.expand();
      setIsPublishPanelOpen(true);
    }
  };

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={72} minSize={45}>
        <main className="size-full min-h-[360px]">
          <Editor workflowId={workflowId} />
        </main>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        ref={publishPanelRef}
        collapsible
        collapsedSize={7}
        defaultSize={28}
        minSize={16}
        maxSize={55}
        onCollapse={() => setIsPublishPanelOpen(false)}
        onExpand={() => setIsPublishPanelOpen(true)}
      >
        <section className="flex h-full min-h-0 flex-col border-t bg-muted/20">
          <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b bg-background px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Publish and review</p>
            </div>
            <Button variant="ghost" size="sm" onClick={togglePublishPanel}>
              {isPublishPanelOpen ? (
                <ChevronsDownUpIcon className="size-4" />
              ) : (
                <ChevronsUpDownIcon className="size-4" />
              )}
              {isPublishPanelOpen ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          {isPublishPanelOpen ? (
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <PublishPanel workflowId={workflowId} />
            </div>
          ) : null}
        </section>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
