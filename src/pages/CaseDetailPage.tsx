import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { AppLayout } from '@/components/layouts/AppLayout';
import { EvidenceUploader } from '@/components/EvidenceUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Image,
  MapPin,
  RefreshCw,
  Shield,
  TrendingUp,
  User,
  Zap,
  File,
} from 'lucide-react';
import type { Case, Evidence, Incident, Pattern, Report } from '@/types/types';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="w-4 h-4 text-primary" />;
  if (type === 'application/pdf') return <FileText className="w-4 h-4 text-primary" />;
  return <File className="w-4 h-4 text-primary" />;
}

function SeverityBadge({ severity }: { severity: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    high: { label: 'High', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    medium: { label: 'Medium', className: 'bg-warning/10 text-warning border-warning/20' },
    low: { label: 'Low', className: 'bg-success/10 text-success border-success/20' },
  };
  const s = map[severity ?? 'medium'] ?? map.medium;
  return (
    <span className={cn('inline-flex items-center text-xs px-2 py-0.5 rounded border font-medium', s.className)}>
      {s.label}
    </span>
  );
}

function IncidentDate({ incident }: { incident: Incident }) {
  if (incident.incident_date) {
    try {
      return (
        <time className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {format(parseISO(incident.incident_date), 'MMM d, yyyy')}
        </time>
      );
    } catch { /* fall through */ }
  }
  if (incident.incident_date_raw) {
    return <span className="text-xs text-muted-foreground whitespace-nowrap">{incident.incident_date_raw}</span>;
  }
  return <span className="text-xs text-muted-foreground whitespace-nowrap">Date unknown</span>;
}

export default function CaseDetailPage() {
  const { id: caseId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('evidence');

  const fetchAll = useCallback(async () => {
    if (!caseId || !user) return;

    const [caseRes, evidenceRes, incidentRes, patternRes, reportRes] = await Promise.all([
      supabase.from('cases').select('*').eq('id', caseId).eq('user_id', user.id).maybeSingle(),
      supabase.from('evidence').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      supabase.from('incidents').select('*').eq('case_id', caseId).order('incident_date', { ascending: true, nullsFirst: false }),
      supabase.from('patterns').select('*').eq('case_id', caseId),
      supabase.from('reports').select('*').eq('case_id', caseId).maybeSingle(),
    ]);

    if (!caseRes.data) {
      toast.error('Case not found');
      navigate('/dashboard');
      return;
    }

    setCaseData(caseRes.data);
    setEvidence(Array.isArray(evidenceRes.data) ? evidenceRes.data : []);
    setIncidents(Array.isArray(incidentRes.data) ? incidentRes.data : []);
    setPatterns(Array.isArray(patternRes.data) ? patternRes.data : []);
    setReport(reportRes.data ?? null);
    setLoading(false);
  }, [caseId, user, navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUploadComplete = useCallback((_evidenceId: string) => {
    fetchAll();
  }, [fetchAll]);

  const handleAnalyze = async () => {
    if (!caseId || evidence.length === 0) return;
    setAnalyzing(true);
    setAnalysisProgress(10);

    const evidenceIds = evidence.map((e) => e.id);
    const progressTimer = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + 5, 85));
    }, 2000);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-evidence', {
        body: { caseId, evidenceIds },
      });

      clearInterval(progressTimer);
      setAnalysisProgress(100);

      if (error) {
        const msg = await error?.context?.text?.();
        toast.error(`Analysis failed: ${msg || error.message}`);
      } else {
        toast.success(`Analysis complete: ${data?.incidentsCount ?? 0} incidents, ${data?.patternsCount ?? 0} patterns found`);
        await fetchAll();
        setActiveTab('timeline');
      }
    } catch (err) {
      clearInterval(progressTimer);
      toast.error('Analysis failed. Please try again.');
      console.error(err);
    }

    setAnalyzing(false);
    setAnalysisProgress(0);
  };

  const handleGenerateReport = async () => {
    if (!caseId) return;
    setGeneratingReport(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { caseId },
      });

      if (error) {
        const msg = await error?.context?.text?.();
        toast.error(`Report generation failed: ${msg || error.message}`);
      } else {
        toast.success('Professional incident report generated!');
        await fetchAll();
        setActiveTab('report');
      }
    } catch (err) {
      toast.error('Report generation failed. Please try again.');
      console.error(err);
    }

    setGeneratingReport(false);
  };

  const handleDownloadPDF = () => {
    if (!report?.report_content || !caseData) return;
    const content = report.report_content;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margin = 20;
    const pageWidth = 210;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header
    doc.setFillColor(31, 78, 91);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SafeProof', margin, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Secure Evidence Organizer — Incident Report', margin, 20);
    y = 38;

    // Case title
    doc.setTextColor(31, 78, 91);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(caseData.title, margin, y);
    y += 8;

    doc.setTextColor(100, 110, 120);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}  |  Total Evidence: ${evidence.length}  |  Incidents: ${incidents.length}`, margin, y);
    y += 6;

    doc.setDrawColor(200, 210, 215);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Report content — split into sections
    const lines = content.split('\n');
    doc.setTextColor(30, 35, 40);

    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = margin;
      }

      const trimmed = line.trim();
      if (trimmed.startsWith('==') || trimmed.endsWith('==')) {
        // Section header
        const title = trimmed.replace(/=+/g, '').trim();
        if (title) {
          y += 4;
          doc.setFillColor(245, 248, 250);
          doc.rect(margin, y - 4, contentWidth, 10, 'F');
          doc.setTextColor(31, 78, 91);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(title, margin + 2, y + 2);
          y += 10;
          doc.setTextColor(30, 35, 40);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        }
      } else if (trimmed === '') {
        y += 3;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 35, 40);
        const wrapped = doc.splitTextToSize(trimmed, contentWidth);
        for (const wline of wrapped) {
          if (y > 270) { doc.addPage(); y = margin; }
          doc.text(wline, margin, y);
          y += 5.5;
        }
      }
    }

    // Footer on each page
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(150, 160, 170);
      doc.text(
        `CONFIDENTIAL — SafeProof Incident Report — Page ${p} of ${totalPages}`,
        pageWidth / 2,
        290,
        { align: 'center' },
      );
    }

    const fileName = `${caseData.title.replace(/[^a-zA-Z0-9]/g, '_')}_incident_report.pdf`;
    doc.save(fileName);
    toast.success('Report downloaded as PDF');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48 bg-muted" />
          <Skeleton className="h-32 w-full bg-muted" />
          <Skeleton className="h-64 w-full bg-muted" />
        </div>
      </AppLayout>
    );
  }

  if (!caseData) return null;

  const pendingEvidence = evidence.filter((e) => e.analysis_status === 'pending');
  const hasEvidence = evidence.length > 0;
  const hasAnalysis = incidents.length > 0 || patterns.length > 0;
  const hasReport = report?.status === 'completed' && report.report_content;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Breadcrumb + header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-foreground text-balance">{caseData.title}</h1>
                <Badge variant="secondary" className="capitalize shrink-0">{caseData.status}</Badge>
              </div>
              {caseData.description && (
                <p className="text-sm text-muted-foreground mt-1 text-pretty">{caseData.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created {format(parseISO(caseData.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>

        {/* Workflow action bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {/* Step 1 */}
          <Card className={cn('border shadow-card h-full', hasEvidence ? 'border-primary/30 bg-primary/5' : 'border-border')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', hasEvidence ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {hasEvidence ? <CheckCircle className="w-4 h-4" /> : '1'}
                </div>
                <p className="text-sm font-semibold text-foreground">Upload Evidence</p>
              </div>
              <p className="text-xs text-muted-foreground">{evidence.length} file{evidence.length !== 1 ? 's' : ''} uploaded</p>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card className={cn('border shadow-card h-full', hasAnalysis ? 'border-primary/30 bg-primary/5' : 'border-border')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', hasAnalysis ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {hasAnalysis ? <CheckCircle className="w-4 h-4" /> : '2'}
                </div>
                <p className="text-sm font-semibold text-foreground">AI Analysis</p>
              </div>
              <p className="text-xs text-muted-foreground">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} extracted</p>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card className={cn('border shadow-card h-full', hasReport ? 'border-primary/30 bg-primary/5' : 'border-border')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', hasReport ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {hasReport ? <CheckCircle className="w-4 h-4" /> : '3'}
                </div>
                <p className="text-sm font-semibold text-foreground">Generate Report</p>
              </div>
              <p className="text-xs text-muted-foreground">{hasReport ? 'Ready to download' : 'Not yet generated'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto whitespace-nowrap mb-4">
            <TabsList className="inline-flex">
              <TabsTrigger value="evidence" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
                <FolderOpen className="w-3.5 h-3.5" />
                Evidence ({evidence.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
                <Calendar className="w-3.5 h-3.5" />
                Timeline ({incidents.length})
              </TabsTrigger>
              <TabsTrigger value="patterns" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
                <TrendingUp className="w-3.5 h-3.5" />
                Patterns ({patterns.length})
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-1.5 text-xs md:text-sm whitespace-nowrap">
                <FileText className="w-3.5 h-3.5" />
                Report
              </TabsTrigger>
            </TabsList>
          </div>

          {/* EVIDENCE TAB */}
          <TabsContent value="evidence" className="space-y-6">
            <EvidenceUploader caseId={caseId!} userId={user!.id} onUploadComplete={handleUploadComplete} />

            {/* Evidence list */}
            {evidence.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">All Evidence Files</p>
                <div className="space-y-2">
                  {evidence.map((ev) => (
                    <div key={ev.id} className="flex items-center gap-3 p-3 rounded border border-border bg-card">
                      <div className="shrink-0">{getFileIcon(ev.file_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ev.file_name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatBytes(ev.file_size)}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(ev.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn('text-xs shrink-0 capitalize', {
                          'bg-success/10 text-success border-success/20': ev.analysis_status === 'completed',
                          'bg-warning/10 text-warning border-warning/20': ev.analysis_status === 'processing',
                          'bg-destructive/10 text-destructive border-destructive/20': ev.analysis_status === 'failed',
                        })}
                      >
                        {ev.analysis_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analyze button */}
            {hasEvidence && (
              <div className="space-y-3">
                {analyzing && (
                  <div className="space-y-2">
                    <Progress value={analysisProgress} className="h-1.5" />
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 animate-pulse" />
                      AI is analyzing your evidence — this may take 30–60 seconds…
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="gap-2 h-9 font-semibold w-full md:w-auto"
                  style={{ backgroundColor: 'hsl(17 62% 59%)', color: 'white' }}
                >
                  {analyzing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</>
                  ) : (
                    <><Zap className="w-4 h-4" /> {hasAnalysis ? 'Re-Analyze All Evidence' : 'Analyze All Evidence with AI'}</>
                  )}
                </Button>
                {pendingEvidence.length > 0 && !analyzing && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {pendingEvidence.length} new file{pendingEvidence.length !== 1 ? 's' : ''} pending analysis
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* TIMELINE TAB */}
          <TabsContent value="timeline">
            {incidents.length === 0 ? (
              <Card className="border border-dashed border-border shadow-none">
                <CardContent className="py-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground text-balance">No incidents extracted yet</p>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                      Upload evidence and run AI analysis to generate your incident timeline
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setActiveTab('evidence')}>
                    Go to Evidence
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {incidents.length} incident{incidents.length !== 1 ? 's' : ''} — chronological order
                  </p>
                  <Badge variant="secondary" className="text-xs">AI Extracted</Badge>
                </div>

                {/* Timeline */}
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[18px] top-6 bottom-0 w-px bg-border" />

                  <div className="space-y-4">
                    {incidents.map((incident, idx) => (
                      <div key={incident.id} className="relative flex gap-4 items-start">
                        {/* Node */}
                        <div className="shrink-0 w-9 h-9 rounded-full border-2 border-border bg-card flex items-center justify-center z-10">
                          <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                        </div>

                        {/* Content */}
                        <Card className="flex-1 min-w-0 border border-border shadow-card h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                              <p className="font-semibold text-sm text-foreground text-balance flex-1">{incident.title}</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <SeverityBadge severity={incident.severity} />
                                <IncidentDate incident={incident} />
                              </div>
                            </div>

                            <p className="text-sm text-foreground/80 text-pretty mb-3">{incident.description}</p>

                            <div className="flex items-center gap-4 flex-wrap">
                              {incident.location && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {incident.location}
                                </span>
                              )}
                              {incident.perpetrator && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="w-3 h-3 shrink-0" />
                                  {incident.perpetrator}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* PATTERNS TAB */}
          <TabsContent value="patterns">
            {patterns.length === 0 ? (
              <Card className="border border-dashed border-border shadow-none">
                <CardContent className="py-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground text-balance">No patterns identified yet</p>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                      AI will identify recurring behaviors after analyzing multiple evidence files
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setActiveTab('evidence')}>
                    Go to Evidence
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {patterns.length} recurring pattern{patterns.length !== 1 ? 's' : ''} identified
                  </p>
                  <Badge variant="secondary" className="text-xs">AI Identified</Badge>
                </div>
                <div className="grid gap-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id} className="border border-border shadow-card h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-semibold text-sm text-foreground text-balance">{pattern.pattern_type}</p>
                              {pattern.frequency && (
                                <Badge variant="secondary" className="text-xs shrink-0">{pattern.frequency}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground/80 text-pretty">{pattern.description}</p>
                            {pattern.evidence_count > 0 && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Observed across {pattern.evidence_count} evidence file{pattern.evidence_count !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* REPORT TAB */}
          <TabsContent value="report">
            {!hasAnalysis && (
              <div className="mb-4 p-3 rounded border border-warning/20 bg-warning/5 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-sm text-warning text-pretty">
                  Run AI analysis first to generate a meaningful report. The report quality improves with more analyzed evidence.
                </p>
              </div>
            )}

            {!hasReport ? (
              <Card className="border border-dashed border-border shadow-none">
                <CardContent className="py-12 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground text-balance">No report generated yet</p>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                      AI will create a professional incident report suitable for HR, legal, or institutional submission
                    </p>
                  </div>
                  {generatingReport && (
                    <div className="w-full max-w-xs space-y-2">
                      <Progress value={undefined} className="h-1.5 animate-pulse" />
                      <p className="text-xs text-muted-foreground text-center">Generating professional report…</p>
                    </div>
                  )}
                  <Button
                    onClick={handleGenerateReport}
                    disabled={generatingReport}
                    className="gap-2 h-9 font-semibold"
                    style={{ backgroundColor: 'hsl(17 62% 59%)', color: 'white' }}
                  >
                    {generatingReport ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                    ) : (
                      <><Brain className="w-4 h-4" /> Generate Incident Report</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Report actions */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Professional Incident Report</p>
                    {report.updated_at && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        Generated {format(parseISO(report.updated_at), 'MMM d, yyyy — h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className="gap-1.5 h-9"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDownloadPDF}
                      className="gap-1.5 h-9 font-semibold"
                      style={{ backgroundColor: 'hsl(17 62% 59%)', color: 'white' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </Button>
                  </div>
                </div>

                {/* Report preview */}
                <Card className="border border-border shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
                      <Shield className="w-6 h-6 text-primary shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-foreground">SafeProof Incident Report</p>
                        <p className="text-xs text-muted-foreground">CONFIDENTIAL — {caseData.title}</p>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      {(report.report_content ?? '').split('\n').map((line, i) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('==') || trimmed.endsWith('==')) {
                          const title = trimmed.replace(/=+/g, '').trim();
                          return title ? (
                            <div key={i} className="mt-6 mb-2">
                              <h3 className="text-sm font-bold text-primary uppercase tracking-wide border-b border-border pb-1">{title}</h3>
                            </div>
                          ) : null;
                        }
                        if (trimmed === '') return <div key={i} className="h-2" />;
                        return (
                          <p key={i} className="text-sm text-foreground/85 leading-relaxed text-pretty mb-1">
                            {trimmed}
                          </p>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="p-3 rounded border border-primary/20 bg-primary/5 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-primary text-pretty">
                    This report is confidential. Download the PDF to share with legal counsel, HR, or institutional authorities.
                    Please modify the User Agreement &amp; Privacy Policy to mitigate legal risks.
                  </p>
                </div>
              </div>
            )}

            {/* Generate button always visible at bottom if report exists */}
            {hasReport && generatingReport && (
              <div className="mt-4 space-y-2">
                <Progress value={undefined} className="h-1.5 animate-pulse" />
                <p className="text-xs text-muted-foreground">Regenerating report…</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
