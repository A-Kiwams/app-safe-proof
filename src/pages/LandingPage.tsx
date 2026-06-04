import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Shield,
  FolderOpen,
  Brain,
  FileText,
  Lock,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ArrowRight,
  Fingerprint,
  FileCheck,
  AlertTriangle,
  ScrollText,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  FAQ item                                                          */
/* ------------------------------------------------------------------ */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-card hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-medium text-foreground pr-4">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed text-pretty">
          {a}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ==================== NAV HEADER ==================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">SafeProof</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('problem')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Problem</button>
            <button onClick={() => scrollTo('how-it-works')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</button>
            <button onClick={() => scrollTo('benefits')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Benefits</button>
            <button onClick={() => scrollTo('faq')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium">Log In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="font-semibold">Get Started</Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-3 flex flex-col gap-3">
            <button onClick={() => scrollTo('problem')} className="text-left text-sm font-medium text-muted-foreground">Problem</button>
            <button onClick={() => scrollTo('how-it-works')} className="text-left text-sm font-medium text-muted-foreground">How It Works</button>
            <button onClick={() => scrollTo('benefits')} className="text-left text-sm font-medium text-muted-foreground">Benefits</button>
            <button onClick={() => scrollTo('faq')} className="text-left text-sm font-medium text-muted-foreground">FAQ</button>
            <div className="flex gap-3 pt-2 border-t border-border">
              <Link to="/login" className="flex-1" onClick={() => setMobileNavOpen(false)}>
                <Button variant="outline" className="w-full font-medium">Log In</Button>
              </Link>
              <Link to="/register" className="flex-1" onClick={() => setMobileNavOpen(false)}>
                <Button className="w-full font-semibold">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO ==================== */}
      <section className="relative pt-28 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-semibold tracking-wide uppercase mb-6">
              <Lock className="w-3.5 h-3.5" />
              Secure & Confidential
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight text-balance mb-5">
              Your story, documented with <span className="text-primary">safety</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed text-pretty max-w-2xl mb-8">
              SafeProof is an AI-powered evidence organizer designed for people experiencing harassment or abuse. Upload screenshots, messages, and documents — we help you build a chronological timeline, detect patterns, and generate a professional report for HR, legal, or institutional filing.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register">
                <Button size="lg" className="font-semibold gap-2">
                  Start Documenting
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="font-medium">
                  I Already Have an Account
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-success" />
                <span>End-to-end privacy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-success" />
                <span>Encrypted storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-success" />
                <span>Anonymous by default</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PROBLEM ==================== */}
      <section id="problem" className="py-16 md:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">The Challenge</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-3 text-balance">
              Evidence gets scattered. Deadlines slip. Justice feels out of reach.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <AlertTriangle className="w-7 h-7 text-warning" />,
                title: 'Scattered Evidence',
                body: 'Screenshots live in camera rolls. Emails are buried in inboxes. Messages are on different apps. When you need them, they\'re impossible to organize.',
              },
              {
                icon: <Clock className="w-7 h-7 text-error" />,
                title: 'No Clear Timeline',
                body: 'Without dates and sequences, your story loses impact. Decision-makers need a clear chronology to understand the escalation and frequency of incidents.',
              },
              {
                icon: <ScrollText className="w-7 h-7 text-info" />,
                title: 'No Professional Report',
                body: 'Writing a formal incident report is intimidating and emotionally draining. Most people don\'t know the structure HR, legal, or institutions expect.',
              },
            ].map((item) => (
              <div key={item.title} className="p-5 md:p-6 bg-card border border-border rounded-sm">
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">The Process</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-3 text-balance">
              How SafeProof Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: <FolderOpen className="w-6 h-6 text-primary" />,
                title: 'Create a Case',
                body: 'Start a private case for each situation. Add a title and description. Your case is encrypted and visible only to you.',
              },
              {
                step: '02',
                icon: <FileText className="w-6 h-6 text-primary" />,
                title: 'Upload Evidence',
                body: 'Drop in screenshots, messages, emails, PDFs, and text notes. We auto-compress images and organize everything in one place.',
              },
              {
                step: '03',
                icon: <Brain className="w-6 h-6 text-primary" />,
                title: 'AI Analyzes',
                body: 'Our AI reads your evidence, extracts incident details, dates, and descriptions. It identifies recurring patterns across all uploads.',
              },
              {
                step: '04',
                icon: <FileCheck className="w-6 h-6 text-primary" />,
                title: 'Generate Report',
                body: 'One click produces a professional incident report with a chronological timeline, pattern analysis, and recommendations — ready to submit.',
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-card border border-border rounded-sm p-5 md:p-6 flex flex-col">
                <span className="text-xs font-bold text-primary/50 mb-3">{item.step}</span>
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== BENEFITS ==================== */}
      <section id="benefits" className="py-16 md:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Why SafeProof</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-3 text-balance">
              Built for safety, clarity, and action
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Lock className="w-6 h-6 text-primary" />,
                title: 'Private & Secure',
                body: 'Your data is encrypted. No one but you can access your cases. We never share, sell, or analyze your content for any other purpose.',
              },
              {
                icon: <Clock className="w-6 h-6 text-primary" />,
                title: 'Chronological Timeline',
                body: 'AI automatically orders incidents by date so your story unfolds clearly. No more scrambling to remember what happened when.',
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-primary" />,
                title: 'Pattern Detection',
                body: 'Our AI identifies recurring behaviors — escalation, frequency, and common tactics — so you can demonstrate a pattern, not just isolated events.',
              },
              {
                icon: <FileText className="w-6 h-6 text-primary" />,
                title: 'Professional Reports',
                body: 'Generate formal incident reports formatted for HR, legal advisors, or institutional complaint processes. One click, no writing required.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-card border border-border rounded-sm p-5 md:p-6">
                <div className="mb-3">{item.icon}</div>
                <h3 className="text-base font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Voices</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-3 text-balance">
              What users say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'I had screenshots, texts, and emails all over the place. SafeProof put everything in order and the timeline made it so clear for my HR meeting.',
                name: 'M.L.',
                context: 'Workplace harassment case',
                color: 'bg-primary/10 text-primary',
              },
              {
                quote: 'The AI analysis found patterns I didn\'t even see. When my lawyer read the report, they said it was the most organized evidence they\'d ever received.',
                name: 'J.T.',
                context: 'Legal proceedings',
                color: 'bg-accent/15 text-accent',
              },
              {
                quote: 'I was dreading writing a formal report. SafeProof generated one in minutes. It felt like someone finally understood what I\'d been through.',
                name: 'A.R.',
                context: 'University complaint',
                color: 'bg-info/10 text-info',
              },
            ].map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-sm p-6 flex flex-col">
                <p className="text-sm text-foreground leading-relaxed italic text-pretty flex-1 mb-5">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.color}`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.context}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section id="faq" className="py-16 md:py-24 bg-muted/30 border-y border-border">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Questions</span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-3 text-balance">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            <FaqItem
              q="Who can see my evidence and cases?"
              a="Only you. SafeProof uses your account credentials to encrypt all case data. We cannot access, read, or share your uploads. No one at SafeProof — not even administrators — can view your evidence without your explicit permission."
            />
            <FaqItem
              q="Is SafeProof free to use?"
              a="Yes. SafeProof is completely free. We believe everyone deserves access to tools that help document harm and pursue justice, regardless of financial circumstances."
            />
            <FaqItem
              q="What kinds of evidence can I upload?"
              a="Screenshots, photos, PDF documents, text files, and notes. Images are automatically compressed to save storage while preserving readability. You can upload as many files as you need for each case."
            />
            <FaqItem
              q="Can I download or share my report?"
              a="Yes. Once AI generates your report, you can download it as a PDF. You decide who to share it with — a lawyer, HR department, university office, or anyone supporting your case. SafeProof does not share anything on your behalf."
            />
            <FaqItem
              q="Is my account anonymous?"
              a="You can use a username and password without providing any personally identifying information. We do not require real names, phone numbers, or email verification. Your privacy is our first priority."
            />
          </div>
        </div>
      </section>

      {/* ==================== CALL TO ACTION ==================== */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <div className="bg-primary/5 border border-primary/10 rounded-sm p-8 md:p-12">
            <Shield className="w-10 h-10 text-primary mx-auto mb-5" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-balance">
              Your evidence deserves to be heard clearly
            </h2>
            <p className="text-base text-muted-foreground mb-8 max-w-xl mx-auto text-pretty">
              Start documenting today. SafeProof helps you organize, analyze, and present your evidence so you can focus on what matters most — your safety and your voice.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="font-semibold gap-2">
                  Create Your Free Account
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="font-medium">
                  Log In
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              No credit card required. No personal information needed.
            </p>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-border bg-muted/30 py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold text-foreground">SafeProof</span>
            </div>
            <p className="text-xs text-muted-foreground text-pretty max-w-md">
              SafeProof is a secure evidence organizer. We are not a legal service provider. For legal advice, please consult a qualified attorney.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button>
              <span className="text-border">|</span>
              <Link to="/login" className="hover:text-foreground transition-colors">Log In</Link>
              <span className="text-border">|</span>
              <Link to="/register" className="hover:text-foreground transition-colors">Register</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SafeProof. All rights reserved. Your data belongs to you.
          </div>
        </div>
      </footer>
    </div>
  );
}
