'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import { GitBranch, AlertCircle, PlusIcon, Loader2Icon, CheckCircle2Icon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GitHubRepo } from '@/lib/github/repos';

export interface Repository extends GitHubRepo {
  id?: number;
  url?: string;
  html_url?: string;
}

interface RepositorySelectorProps {
  onRepositorySelect: (repository: Repository | null) => void;
  selectedRepository?: Repository | null;
}

export function RepositorySelector({
  onRepositorySelect,
  selectedRepository,
}: RepositorySelectorProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Create repo dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fetchRepositories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/github/repos');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch repositories');
      }

      if (data.error === 'GitHub not connected') {
        setIsConnected(false);
        setRepositories([]);
      } else {
        setIsConnected(true);
        setRepositories(data.repositories || []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch repositories'
      );
      setRepositories([]);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return;

    setIsCreating(true);
    setCreateResult(null);

    try {
      const res = await fetch('/api/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRepoName.trim(),
          description: newRepoDescription.trim(),
          private: newRepoPrivate,
          auto_init: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateResult({
          success: false,
          message: data.error || 'Failed to create repository',
        });
        return;
      }

      setCreateResult({
        success: true,
        message: `Repository "${data.repository.name}" created successfully!`,
      });

      // Refresh the repository list
      await fetchRepositories();

      // Auto-select the newly created repository
      if (data.repository) {
        const newRepo: Repository = {
          ...data.repository,
          clone_url: data.repository.clone_url,
        };
        onRepositorySelect(newRepo);
      }

      // Close dialog after a short delay
      setTimeout(() => {
        setCreateOpen(false);
        setNewRepoName('');
        setNewRepoDescription('');
        setNewRepoPrivate(false);
        setCreateResult(null);
      }, 1500);
    } catch (err: any) {
      setCreateResult({
        success: false,
        message: err.message || 'Failed to create repository',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isConnected) {
    return (
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          GitHub is not connected. Sign in with GitHub to select repositories.
        </AlertDescription>
      </Alert>
    );
  }

  if (error && !isLoading) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={selectedRepository?.name || 'none'}
        onValueChange={(name) => {
          if (name === '__create__') {
            setCreateOpen(true);
            return;
          }
          const repo = repositories.find((r) => r.name === name);
          onRepositorySelect(repo || null);
        }}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full min-w-[180px]">
          <SelectValue
            placeholder={
              isLoading
                ? 'Loading...'
                : repositories.length === 0
                  ? 'No repositories'
                  : 'Select repository'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {repositories.map((repo) => (
            <SelectItem key={repo.name} value={repo.name}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{repo.name}</span>
                <span className="text-xs text-muted-foreground">
                  {repo.owner.login}
                </span>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="__create__" className="text-primary font-medium border-t mt-1 pt-2">
            <div className="flex items-center gap-2">
              <PlusIcon className="size-4" />
              <span>Create new repository</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Create Repository Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          setTimeout(() => {
            setNewRepoName('');
            setNewRepoDescription('');
            setNewRepoPrivate(false);
            setCreateResult(null);
          }, 200);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Repository</DialogTitle>
            <DialogDescription>
              Create a new GitHub repository. It will be initialized with a README.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repo-name" className="text-right">
                Name *
              </Label>
              <Input
                id="repo-name"
                placeholder="my-awesome-project"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                className="col-span-3"
                disabled={isCreating}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repo-desc" className="text-right">
                Description
              </Label>
              <Input
                id="repo-desc"
                placeholder="Optional description"
                value={newRepoDescription}
                onChange={(e) => setNewRepoDescription(e.target.value)}
                className="col-span-3"
                disabled={isCreating}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="repo-private" className="text-right">
                Private
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  id="repo-private"
                  checked={newRepoPrivate}
                  onCheckedChange={setNewRepoPrivate}
                  disabled={isCreating}
                />
                <span className="text-sm text-muted-foreground">
                  {newRepoPrivate ? 'Private repository' : 'Public repository'}
                </span>
              </div>
            </div>

            {createResult && (
              <Alert variant={createResult.success ? 'default' : 'destructive'}>
                {createResult.success ? (
                  <CheckCircle2Icon className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {createResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRepo}
              disabled={!newRepoName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 size-4" />
                  Create Repository
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}