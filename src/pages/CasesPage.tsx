import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, Plus, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import type { Case } from '@/types/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CasesPage() {
  const { user } = useAuth();
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
    if (error) toast.error('Failed to load cases');
    else setCases(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { fetchCases(); }, [user]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('cases')
      .insert({ user_id: user.id, title: newTitle.trim(), description: newDesc.trim() || null })
      .select().maybeSingle();
    setCreating(false);
    if (error) { toast.error('Failed to create case'); return; }
    toast.success('Case created');
    setCreateOpen(false);
    setNewTitle(''); setNewDesc('');
    if (data) navigate(`/cases/${data.id}`);
    else fetchCases();
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">My Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? '' : `${cases.length} case${cases.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 h-9 font-semibold"><Plus className="w-4 h-4" />New Case</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <DialogHeader><DialogTitle>Create New Case</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3 rounded border border-primary/20 bg-primary/5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-primary text-pretty">Each case is private. Only you can access your evidence.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caseTitle2" className="text-sm font-normal">Case Name</Label>
                  <Input id="caseTitle2" placeholder="e.g. Workplace Harassment — June 2026" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="px-3" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="caseDesc2" className="text-sm font-normal">Description <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="caseDesc2" placeholder="Brief summary" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="px-3" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 h-9" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                  <Button className="flex-1 h-9 font-semibold" onClick={handleCreate} disabled={!newTitle.trim() || creating}>{creating ? 'Creating…' : 'Create Case'}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-muted rounded" />)}</div>
        ) : cases.length === 0 ? (
          <Card className="border border-dashed border-border shadow-none">
            <CardContent className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground text-balance">No cases yet</p>
                <p className="text-sm text-muted-foreground mt-1 text-pretty">Create your first case to start organizing evidence</p>
              </div>
              <Button size="sm" className="gap-2 h-9 font-semibold" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" />Create First Case</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card key={c.id} className="border border-border shadow-card hover:shadow-hover transition-shadow cursor-pointer h-full" onClick={() => navigate(`/cases/${c.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate text-sm">{c.title}</p>
                        <Badge variant="secondary" className="text-xs capitalize shrink-0">{c.status}</Badge>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.description}</p>}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">Created {format(new Date(c.created_at), 'MMM d, yyyy')}</span>
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
