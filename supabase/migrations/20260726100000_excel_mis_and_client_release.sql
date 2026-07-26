-- Migration for Excel Task/Subtask MIS & Admin Client Release Controls

-- 1. Add dpr_direct_to_client column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS dpr_direct_to_client BOOLEAN DEFAULT false NOT NULL;

-- 2. Add client_visible column to dprs table
ALTER TABLE dprs 
ADD COLUMN IF NOT EXISTS client_visible BOOLEAN DEFAULT false NOT NULL;

-- 3. Enhance tasks table to support WBS subtasks and MIS quantity tracking
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Facade',
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Sqm',
ADD COLUMN IF NOT EXISTS planned_quantity NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS completed_quantity NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS start_date DATE,
-- Update status check constraint to include in_progress
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'in_progress', 'done', 'blocked'));

-- 4. Automatic task status & progress calculation trigger
CREATE OR REPLACE FUNCTION update_task_progress_and_status()
RETURNS TRIGGER AS $$
DECLARE
  v_progress_pct NUMERIC := 0;
BEGIN
  IF NEW.planned_quantity > 0 THEN
    v_progress_pct := (NEW.completed_quantity * 100.0) / NEW.planned_quantity;
  END IF;

  -- Only auto-set status if not explicitly specified by user or if 100% completed
  IF v_progress_pct >= 100 THEN
    NEW.status := 'done';
  ELSIF NEW.status IS NULL THEN
    IF NEW.completed_quantity > 0 THEN
      NEW.status := 'in_progress';
    ELSE
      NEW.status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_task_progress ON tasks;
CREATE TRIGGER trg_update_task_progress
  BEFORE INSERT OR UPDATE OF planned_quantity, completed_quantity ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_progress_and_status();
