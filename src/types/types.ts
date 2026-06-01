export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export type CaseStatus = 'active' | 'archived';

export interface Case {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Evidence {
  id: string;
  case_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number | null;
  analysis_status: AnalysisStatus;
  extracted_text: string | null;
  created_at: string;
}

export type Severity = 'low' | 'medium' | 'high';

export interface Incident {
  id: string;
  case_id: string;
  evidence_id: string | null;
  incident_date: string | null;
  incident_date_raw: string | null;
  title: string;
  description: string;
  location: string | null;
  perpetrator: string | null;
  severity: Severity | null;
  created_at: string;
}

export interface Pattern {
  id: string;
  case_id: string;
  pattern_type: string;
  description: string;
  frequency: string | null;
  evidence_count: number;
  created_at: string;
}

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface Report {
  id: string;
  case_id: string;
  user_id: string;
  report_content: string | null;
  report_url: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}
