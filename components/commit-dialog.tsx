'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GitCommitIcon, Loader2Icon, CheckCircle2Icon, AlertCircleIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CommitDialogProps {
  sandboxName?: string;
  repoUrl?: string;
  onCommitSuccess?: () => void;
}

export function CommitDialog({ sandboxName, repoUrl, onCommitSuccess }: CommitDialogProps) {
  const [open, setOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleCommit = async () => {
    if (!commitMessage.trim() || !sandboxName) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxName,
          commitMessage: commitMessage.trim(),
          repoUrl,
        }),
      });

      const data = await res.json();
      setResult({
        success: data.success,
        message: data.message || data.error || 'Unknown error',
      });

      if (data.success) {
        onCommitSuccess?.();
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Failed to commit',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setTimeout(() => {
        setCommitMessage('');
        setResult(null);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!sandboxName}
          className="gap-2"
        >
          <GitCommitIcon className="size-4" />
          Commit & Push
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Commit & Push to GitHub</DialogTitle>
          <DialogDescription>
            Commit all changes from the sandbox and push them to your GitHub repository.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {sandboxName && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs text-muted-foreground">
                Sandbox
              </Label>
              <span className="col-span-3 text-sm font-mono truncate">
                {sandboxName}
              </span>
            </div>
          )}

          {repoUrl && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs text-muted-foreground">
                Repository
              </Label>
              <span className="col-span-3 text-sm font-mono truncate">
                {repoUrl}
              </span>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="commit-message" className="text-right">
              Message
            </Label>
            <Input
              id="commit-message"
              placeholder="Describe your changes..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2Icon className="h-4 w-4" />
              ) : (
                <AlertCircleIcon className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <GitCommitIcon className="mr-2 size-4" />
                Commit & Push
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}