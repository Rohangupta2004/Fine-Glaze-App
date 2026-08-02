-- SQL Migration: Add delete_project_cascade function for safe project removal
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete DPR BOQ Reported Items linked to DPRs of this project
  DELETE FROM dpr_boq_items
  WHERE dpr_id IN (SELECT id FROM dprs WHERE project_id = p_project_id);

  -- 2. Delete DPRs
  DELETE FROM dprs WHERE project_id = p_project_id;

  -- 3. Delete Project BOQ Items
  DELETE FROM project_boq_items WHERE project_id = p_project_id;

  -- 4. Delete Project Tasks
  DELETE FROM tasks WHERE project_id = p_project_id;

  -- 5. Delete Worker/Supervisor Site Assignments
  DELETE FROM assignments WHERE project_id = p_project_id;

  -- 6. Delete Project Documents & Drawings
  DELETE FROM documents WHERE project_id = p_project_id;

  -- 7. Delete Chat Conversations & Messages linked to this project
  DELETE FROM chat_messages 
  WHERE conversation_id IN (SELECT id FROM conversations WHERE project_id = p_project_id);
  DELETE FROM conversations WHERE project_id = p_project_id;

  -- 8. Delete Client Project Access & Safety Checks
  DELETE FROM client_project_access WHERE project_id = p_project_id;
  DELETE FROM safety_checks WHERE project_id = p_project_id;

  -- 9. Update Attendance Records to nullify project reference
  UPDATE attendance SET project_id = NULL WHERE project_id = p_project_id;

  -- 10. Delete the Project record itself
  DELETE FROM projects WHERE id = p_project_id;
END;
$$;
