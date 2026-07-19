-- Create function to automatically update project progress percentage based on task completion
CREATE OR REPLACE FUNCTION public.update_project_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_completed INT;
  v_progress INT;
BEGIN
  -- 1. Handle OLD project if project_id changed or on DELETE
  IF (TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id) OR TG_OP = 'DELETE' THEN
    IF OLD.project_id IS NOT NULL THEN
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
      INTO v_total, v_completed
      FROM public.tasks
      WHERE project_id = OLD.project_id;

      IF v_total > 0 THEN
        v_progress := (v_completed * 100) / v_total;
      ELSE
        v_progress := 0;
      END IF;

      UPDATE public.projects
      SET progress_pct = v_progress
      WHERE id = OLD.project_id;
    END IF;
  END IF;

  -- 2. Handle NEW/Current project on INSERT or UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.project_id IS NOT NULL THEN
      SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
      INTO v_total, v_completed
      FROM public.tasks
      WHERE project_id = NEW.project_id;

      IF v_total > 0 THEN
        v_progress := (v_completed * 100) / v_total;
      ELSE
        v_progress := 0;
      END IF;

      UPDATE public.projects
      SET progress_pct = v_progress
      WHERE id = NEW.project_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS trg_update_project_progress ON public.tasks;
CREATE TRIGGER trg_update_project_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_progress();

-- Run one-off update to calculate progress for all existing projects
UPDATE public.projects p
SET progress_pct = COALESCE(
  (
    SELECT (COUNT(*) FILTER (WHERE status = 'done') * 100) / COUNT(*)
    FROM public.tasks t
    WHERE t.project_id = p.id
    HAVING COUNT(*) > 0
  ),
  0
);
