-- Daily 7:00 PM Notifications for Active Employees & Site Assignment Summaries
CREATE OR REPLACE FUNCTION public.dispatch_daily_7pm_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p RECORD;
BEGIN
  -- 1. Notify Active Employees / Workers / Supervisors
  FOR p IN SELECT id FROM public.profiles WHERE role IN ('worker', 'supervisor') AND status = 'active' LOOP
    INSERT INTO public.notifications (recipient_id, kind, title, body, important)
    VALUES (
      p.id,
      'general',
      '🌇 Daily Shift Wrap-up & Attendance',
      'Remember to submit your Daily Progress Report (DPR) and log site attendance for today.',
      true
    );
  END LOOP;

  -- 2. Notify Admins & Managers for Site Assignments & Approvals
  FOR p IN SELECT id FROM public.profiles WHERE role IN ('owner', 'project_manager', 'hr', 'accounts') AND status = 'active' LOOP
    INSERT INTO public.notifications (recipient_id, kind, title, body, important)
    VALUES (
      p.id,
      'general',
      '📋 Daily Site Assignment & Staffing Summary',
      'Review today''s site assignments, attendance records, and pending DPR approvals.',
      true
    );
  END LOOP;
END;
$$;
