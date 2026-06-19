import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  FolderOpen,
  Plus,
  Shield,
  Clock,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import type { Case } from '@/types/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCases = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load cases');
    } else {
      setCases(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCases();
  }, [user]);

  const handleCreateCase = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);

    const { data, error } = await supabase
      .from('cases')
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
      })
      .select()
      .maybeSingle();

    setCreating(false);

    if (error) {
      toast.error('Failed to create case');
    } else {
      pendo.track('case_created', {
        case_id: data?.id ?? '',
        has_description: Boolean(newDesc.trim()),
        title_length: newTitle.trim().length,
        source_page: 'dashboard',
      });
      toast.success('Case created successfully');
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      if (data) {
        navigate(`/cases/${data.id}`);
      } else {
        fetchCases();
      }
    }
  };

  const username = profile?.email?.replace('@miaoda.com', '') ?? 'there';

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Welcome header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">SafeProof</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">
            Welcome back, {username}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Your evidence cases are stored securely. All information is kept strictly confidential.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="border border-border shadow-card h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{loading ? '—' : cases.length}</p>
                  <p className="text-xs text-muted-foreground">Active Cases</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-card h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">100%</p>
                  <p className="text-xs text-muted-foreground">Secure Storage</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-card h-full col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">AI</p>
                  <p className="text-xs text-muted-foreground">Powered Analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Your Cases</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 h-9 font-semibold">
                <Plus className="w-4 h-4" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Case</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded border border-primary/20 bg-primary/5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-primary text-pretty">
                    Each case is private and encrypted. Only you can access your evidence.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caseTitle" className="text-sm font-normal">Case Name</Label>
                  <Input
                    id="caseTitle"
                    placeholder="e.g. Workplace Harassment — June 2026"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="px-3"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCase()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caseDesc" className="text-sm font-normal">
                    Description <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="caseDesc"
                    placeholder="Brief summary of the situation"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="px-3"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="flex-1 h-9"
                    onClick={() => setCreateOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-9 font-semibold"
                    onClick={handleCreateCase}
                    disabled={!newTitle.trim() || creating}
                  >
                    {creating ? 'Creating…' : 'Create Case'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cases list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full bg-muted rounded" />
            ))}
          </div>
        ) : cases.length === 0 ? (
          <Card className="border border-dashed border-border shadow-none">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground text-balance">No cases yet</p>
                <p className="text-sm text-muted-foreground mt-1 text-pretty">
                  Create your first case to start organizing evidence
                </p>
              </div>
              <Button
                size="sm"
                className="gap-2 h-9 font-semibold"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Create First Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card
                key={c.id}
                className="border border-border shadow-card hover:shadow-hover transition-shadow cursor-pointer h-full"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate text-sm">{c.title}</p>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize shrink-0"
                        >
                          {c.status}
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          Created {format(new Date(c.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
