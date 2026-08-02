-- Migration for Task & Daily Progress (DPR) Linking, Task Roll-Up, and Client Visibility Controls

-- 1. Add task_id and quantity_completed to dprs table
ALTER TABLE dprs 
ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quantity_completed NUMERIC DEFAULT 0 NOT NULL;

-- 2. Add checklist and client_visible to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT false NOT NULL;

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_dprs_task_id ON dprs(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- 4. PostgreSQL function to recalculate task progress from approved DPRs and subtasks
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

  -- Update target task
  UPDATE tasks
  SET completed_quantity = v_final_completed,
      status = v_new_status
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

-- 5. Trigger on DPR changes (INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION trg_fn_dpr_task_rollup()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.task_id IS NOT NULL THEN
      PERFORM recalculate_task_and_project_progress(OLD.task_id);
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.task_id IS DISTINCT FROM NEW.task_id THEN
      IF OLD.task_id IS NOT NULL THEN
        PERFORM recalculate_task_and_project_progress(OLD.task_id);
      END IF;
      IF NEW.task_id IS NOT NULL THEN
        PERFORM recalculate_task_and_project_progress(NEW.task_id);
      END IF;
    ELSIF NEW.task_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.quantity_completed IS DISTINCT FROM NEW.quantity_completed) THEN
      PERFORM recalculate_task_and_project_progress(NEW.task_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.task_id IS NOT NULL THEN
      PERFORM recalculate_task_and_project_progress(NEW.task_id);
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dpr_task_rollup ON dprs;
CREATE TRIGGER trg_dpr_task_rollup
  AFTER INSERT OR UPDATE OR DELETE ON dprs
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_dpr_task_rollup();
