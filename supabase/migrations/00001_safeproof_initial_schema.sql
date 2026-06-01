
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Profiles table (synced from auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone text,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Handle new user trigger
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, role)
  VALUES (NEW.id, NEW.email, NEW.phone, 'user'::public.user_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Cases table
CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Evidence table
CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  analysis_status text NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Incidents (AI-extracted events from evidence)
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  evidence_id uuid REFERENCES public.evidence(id) ON DELETE SET NULL,
  incident_date timestamptz,
  incident_date_raw text,
  title text NOT NULL,
  description text NOT NULL,
  location text,
  perpetrator text,
  severity text CHECK (severity IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Patterns (AI-identified recurring behaviors)
CREATE TABLE public.patterns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  description text NOT NULL,
  frequency text,
  evidence_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_content text,
  report_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence-files',
  'evidence-files',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/avif','application/pdf','text/plain']
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Helper function for role checks
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

-- Profiles policies
CREATE POLICY "Admins full access to profiles" ON public.profiles
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM get_user_role(auth.uid()));

-- Cases policies
CREATE POLICY "Users manage own cases" ON public.cases
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins full access to cases" ON public.cases
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Evidence policies
CREATE POLICY "Users manage own evidence" ON public.evidence
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins full access to evidence" ON public.evidence
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Incidents policies
CREATE POLICY "Users manage own incidents" ON public.incidents
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM public.cases WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access to incidents" ON public.incidents
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Patterns policies
CREATE POLICY "Users manage own patterns" ON public.patterns
  FOR ALL TO authenticated
  USING (case_id IN (SELECT id FROM public.cases WHERE user_id = auth.uid()));

CREATE POLICY "Admins full access to patterns" ON public.patterns
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Reports policies
CREATE POLICY "Users manage own reports" ON public.reports
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins full access to reports" ON public.reports
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'admin'::public.user_role);

-- Storage policies
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'evidence-files');

CREATE POLICY "Users can view evidence files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'evidence-files');

CREATE POLICY "Users can delete own evidence files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'evidence-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cases;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
