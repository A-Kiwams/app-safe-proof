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
      } catch {
        // incomplete frame
      }
    }
  }
  return fullText;
}

async function fetchFileAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    for (const byte of uint8) binary += String.fromCharCode(byte);
    const base64 = btoa(binary);
    return { data: base64, mimeType: contentType.split(';')[0].trim() };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { caseId, evidenceIds } = await req.json();

    if (!caseId || !Array.isArray(evidenceIds) || evidenceIds.length === 0) {
      return new Response(JSON.stringify({ error: 'caseId and evidenceIds required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark evidence as processing
    await supabase
      .from('evidence')
      .update({ analysis_status: 'processing' })
      .in('id', evidenceIds);

    // Fetch evidence records
    const { data: evidenceList, error: fetchErr } = await supabase
      .from('evidence')
      .select('*')
      .in('id', evidenceIds);

    if (fetchErr || !evidenceList) {
      throw new Error('Failed to fetch evidence records');
    }

    // Build multimodal prompt parts
    const userParts: unknown[] = [];
    userParts.push({
      text: `You are an expert forensic analyst helping a victim of harassment or abuse document incidents for legal, HR, or institutional reporting.

Analyze ALL the following evidence files carefully. For each piece of evidence:
1. Extract any dates, times, locations, names, and incident descriptions visible
2. Identify the nature of the incident (harassment, threats, intimidation, etc.)
3. Note any recurring patterns or behaviors

After analyzing all evidence, return a JSON response with this EXACT structure:
{
  "incidents": [
    {
      "evidence_index": 0,
      "incident_date_raw": "date string as seen in evidence or null",
      "incident_date": "ISO 8601 datetime if parseable, else null",
      "title": "short incident title",
      "description": "detailed description of what happened",
      "location": "location if mentioned, else null",
      "perpetrator": "name/identifier of perpetrator if mentioned, else null",
      "severity": "low|medium|high"
    }
  ],
  "patterns": [
    {
      "pattern_type": "type of recurring behavior",
      "description": "detailed description of the pattern",
      "frequency": "how often it occurs",
      "evidence_count": number
    }
  ],
  "summary": "brief overall summary of the evidence"
}

Return ONLY the JSON object, no markdown code blocks or explanation.`
    });

    // Attach each evidence file
    for (const ev of evidenceList) {
      const fileInfo = await fetchFileAsBase64(ev.file_url);
      if (fileInfo && ev.file_type.startsWith('image/')) {
        userParts.push({
          inlineData: { mimeType: fileInfo.mimeType, data: fileInfo.data },
        });
        userParts.push({ text: `[Evidence ${evidenceList.indexOf(ev)}: ${ev.file_name}]` });
      } else if (ev.file_type === 'text/plain' && fileInfo) {
        // Decode text content
        const decoded = atob(fileInfo.data);
        userParts.push({ text: `[Evidence ${evidenceList.indexOf(ev)}: ${ev.file_name}]\n${decoded}` });
      } else {
        userParts.push({ text: `[Evidence ${evidenceList.indexOf(ev)}: ${ev.file_name} — ${ev.file_type} file at ${ev.file_url}]` });
      }
    }

    const rawResponse = await callGemini([{ role: 'user', parts: userParts }]);

    // Parse JSON from response
    let parsed: {
      incidents?: unknown[];
      patterns?: unknown[];
      summary?: string;
    } = {};

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse Gemini response as JSON', rawResponse);
    }

    const incidents = Array.isArray(parsed.incidents) ? parsed.incidents : [];
    const patterns = Array.isArray(parsed.patterns) ? parsed.patterns : [];

    // Delete old incidents and patterns for this case before inserting new ones
    await supabase.from('incidents').delete().eq('case_id', caseId).in(
      'evidence_id',
      evidenceIds,
    );
    await supabase.from('patterns').delete().eq('case_id', caseId);

    // Insert incidents
    if (incidents.length > 0) {
      const incidentRows = incidents.map((inc: Record<string, unknown>) => ({
        case_id: caseId,
        evidence_id: evidenceList[Number(inc.evidence_index) ?? 0]?.id ?? evidenceList[0].id,
        incident_date: inc.incident_date as string | null,
        incident_date_raw: inc.incident_date_raw as string | null,
        title: String(inc.title ?? 'Incident'),
        description: String(inc.description ?? ''),
        location: inc.location as string | null,
        perpetrator: inc.perpetrator as string | null,
        severity: (['low', 'medium', 'high'].includes(String(inc.severity))
          ? String(inc.severity)
          : 'medium') as string,
      }));
      await supabase.from('incidents').insert(incidentRows);
    }

    // Insert patterns
    if (patterns.length > 0) {
      const patternRows = patterns.map((p: Record<string, unknown>) => ({
        case_id: caseId,
        pattern_type: String(p.pattern_type ?? 'Recurring Behavior'),
        description: String(p.description ?? ''),
        frequency: p.frequency as string | null,
        evidence_count: Number(p.evidence_count) || evidenceIds.length,
      }));
      await supabase.from('patterns').insert(patternRows);
    }

    // Mark evidence as completed
    await supabase
      .from('evidence')
      .update({ analysis_status: 'completed' })
      .in('id', evidenceIds);

    return new Response(
      JSON.stringify({
        success: true,
        incidentsCount: incidents.length,
        patternsCount: patterns.length,
        summary: parsed.summary ?? '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('analyze-evidence error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
