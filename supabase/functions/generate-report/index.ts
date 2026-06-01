import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_ENDPOINT =
  'https://app-c1hp9zu9xfy9-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

async function callGemini(contents: unknown[]): Promise<string> {
  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
  if (!apiKey) throw new Error('INTEGRATIONS_API_KEY not set');

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ contents }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) throw new Error(`Gemini HTTP error: ${response.status}`);
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const frame = JSON.parse(dataStr);
        const text = frame?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) fullText += text;
      } catch { /* skip */ }
    }
  }
  return fullText;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { caseId } = await req.json();
    if (!caseId) {
      return new Response(JSON.stringify({ error: 'caseId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch case
    const { data: caseData } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .maybeSingle();

    if (!caseData) {
      return new Response(JSON.stringify({ error: 'Case not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch incidents (sorted by date)
    const { data: incidents } = await supabase
      .from('incidents')
      .select('*')
      .eq('case_id', caseId)
      .order('incident_date', { ascending: true });

    // Fetch patterns
    const { data: patterns } = await supabase
      .from('patterns')
      .select('*')
      .eq('case_id', caseId);

    // Fetch evidence count
    const { count: evidenceCount } = await supabase
      .from('evidence')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', caseId);

    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const incidentText = (incidents ?? [])
      .map((inc, i) => {
        const date = inc.incident_date
          ? new Date(inc.incident_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })
          : inc.incident_date_raw ?? 'Date unknown';
        return `Incident ${i + 1} [${date}]
Title: ${inc.title}
Severity: ${inc.severity ?? 'medium'}
Description: ${inc.description}
${inc.location ? `Location: ${inc.location}` : ''}
${inc.perpetrator ? `Perpetrator: ${inc.perpetrator}` : ''}`;
      })
      .join('\n\n');

    const patternText = (patterns ?? [])
      .map((p) => `• ${p.pattern_type}: ${p.description}${p.frequency ? ` (${p.frequency})` : ''}`)
      .join('\n');

    const prompt = `You are a professional legal document writer specializing in harassment and abuse documentation.

Generate a formal, professional Incident Report based on the following evidence and analysis. The report must be suitable for submission to HR departments, legal authorities, or institutional complaint processes.

CASE INFORMATION:
Case Title: ${caseData.title}
${caseData.description ? `Case Description: ${caseData.description}` : ''}
Report Date: ${reportDate}
Total Evidence Files: ${evidenceCount ?? 0}
Total Documented Incidents: ${(incidents ?? []).length}

DOCUMENTED INCIDENTS (CHRONOLOGICAL ORDER):
${incidentText || 'No incidents documented yet.'}

IDENTIFIED PATTERNS:
${patternText || 'No patterns identified yet.'}

Please generate a comprehensive formal incident report with these sections:
1. EXECUTIVE SUMMARY
2. INCIDENT CHRONOLOGY (list each incident with full details)
3. BEHAVIORAL PATTERNS IDENTIFIED
4. IMPACT ASSESSMENT
5. CONCLUSION AND RECOMMENDATIONS

Use formal, objective, professional language. Be specific and factual. Do not editorialize.
Format with clear section headings using "==" as section separators.`;

    // Create/update report record as generating
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    let reportId: string;
    if (existingReport) {
      reportId = existingReport.id;
      await supabase
        .from('reports')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('id', reportId);
    } else {
      const { data: newReport } = await supabase
        .from('reports')
        .insert({
          case_id: caseId,
          user_id: caseData.user_id,
          status: 'generating',
        })
        .select()
        .maybeSingle();
      reportId = newReport?.id;
    }

    // Generate report via Gemini
    const reportContent = await callGemini([
      { role: 'user', parts: [{ text: prompt }] },
    ]);

    // Save completed report
    await supabase
      .from('reports')
      .update({
        status: 'completed',
        report_content: reportContent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    return new Response(
      JSON.stringify({ success: true, reportId, reportContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('generate-report error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
