-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Fine Glaze COS — Add completed_at to tasks & Auto-Timestamp Trigger     ║
-- ║  Idempotent migration following Supabase Postgres Best Practices.       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- 1. Ensure completed_at column exists on tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Create partial and composite indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at) WHERE status = 'done';
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);

-- 3. Create trigger function to auto-populate completed_at on status change
CREATE OR REPLACE FUNCTION tg_fn_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach BEFORE INSERT OR UPDATE trigger on tasks
DROP TRIGGER IF EXISTS trg_task_completed_at ON tasks;
CREATE TRIGGER trg_task_completed_at
  BEFORE INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tg_fn_task_completed_at();

-- 5. Update recalculate_task_and_project_progress to maintain completed_at
CREATE OR REPLACE FUNCTION recalculate_task_and_project_progress(p_task_id UUID)
RETURNS VOID AS $$
DECLARE
  v_parent_id UUID;
  v_project_id UUID;
  v_has_subtasks BOOLEAN;
  v_approved_dpr_sum NUMERIC := 0;
  v_subtask_sum NUMERIC := 0;
  v_final_completed NUMERIC := 0;
  v_planned NUMERIC := 0;
  v_current_status TEXT;
  v_new_status TEXT;
  v_project_planned_sum NUMERIC := 0;
  v_project_completed_sum NUMERIC := 0;
  v_new_project_pct NUMERIC := 0;
BEGIN
  IF p_task_id IS NULL THEN
    RETURN;
  END IF;

  -- Get task details
  SELECT parent_id, project_id, planned_quantity, status
  INTO v_parent_id, v_project_id, v_planned, v_current_status
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if this task has subtasks
  SELECT EXISTS(SELECT 1 FROM tasks WHERE parent_id = p_task_id) INTO v_has_subtasks;

  IF v_has_subtasks THEN
    -- If task has subtasks, roll up subtasks' completed quantities
    SELECT COALESCE(SUM(completed_quantity), 0)
    INTO v_subtask_sum
    FROM tasks
    WHERE parent_id = p_task_id;
    
    v_final_completed := v_subtask_sum;
  ELSE
    -- If no subtasks, sum approved DPR entries
    SELECT COALESCE(SUM(quantity_completed), 0)
    INTO v_approved_dpr_sum
    FROM dprs
    WHERE task_id = p_task_id AND status = 'approved';
    
    v_final_completed := v_approved_dpr_sum;
  END IF;

  -- Determine auto-derived status
  IF v_planned > 0 AND v_final_completed >= v_planned THEN
    v_new_status := 'done';
  ELSIF v_final_completed > 0 THEN
    IF v_current_status = 'blocked' THEN
      v_new_status := 'blocked';
    ELSE
      v_new_status := 'in_progress';
    END IF;
  ELSE
    IF v_current_status = 'blocked' THEN
      v_new_status := 'blocked';
    ELSE
      v_new_status := 'pending';
    END IF;
  END IF;

  -- Update target task (trigger will handle completed_at timestamp)
  UPDATE tasks
  SET completed_quantity = v_final_completed,
      status = v_new_status,
      completed_at = CASE WHEN v_new_status = 'done' THEN COALESCE(completed_at, NOW()) ELSE NULL END
  WHERE id = p_task_id;

  -- Recursively recalculate parent task if this was a subtask
  IF v_parent_id IS NOT NULL THEN
    PERFORM recalculate_task_and_project_progress(v_parent_id);
  END IF;

  -- Recalculate overall project progress_pct
  IF v_project_id IS NOT NULL THEN
    SELECT COALESCE(SUM(planned_quantity), 0), COALESCE(SUM(completed_quantity), 0)
    INTO v_project_planned_sum, v_project_completed_sum
    FROM tasks
    WHERE project_id = v_project_id AND parent_id IS NULL;

    IF v_project_planned_sum > 0 THEN
      v_new_project_pct := LEAST(100, ROUND((v_project_completed_sum * 100.0) / v_project_planned_sum, 1));
    ELSE
      v_new_project_pct := 0;
    END IF;

    UPDATE projects
    SET progress_pct = v_new_project_pct
    WHERE id = v_project_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;
