-- Sprint 3 RLS refinements for tasks write scope.
-- Keep Admin read-only by not granting insert/update policies for Admin.

DROP POLICY IF EXISTS tasks_insert_scoped ON public.tasks;
DROP POLICY IF EXISTS tasks_update_scoped ON public.tasks;

CREATE POLICY tasks_insert_scoped
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_app_role() IN ('Director', 'Team Lead')
  OR (
    pic_id = auth.uid()
    AND exists (
      SELECT 1
      FROM public.clients c
      WHERE c.client_id = tasks.client_id
        AND (c.internal_pic_id = auth.uid() OR c.backup_pic_id = auth.uid())
    )
  )
);

CREATE POLICY tasks_update_scoped
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.current_app_role() IN ('Director', 'Team Lead')
  OR (
    pic_id = auth.uid()
    AND exists (
      SELECT 1
      FROM public.clients c
      WHERE c.client_id = tasks.client_id
        AND (c.internal_pic_id = auth.uid() OR c.backup_pic_id = auth.uid())
    )
  )
)
WITH CHECK (
  public.current_app_role() IN ('Director', 'Team Lead')
  OR (
    pic_id = auth.uid()
    AND exists (
      SELECT 1
      FROM public.clients c
      WHERE c.client_id = tasks.client_id
        AND (c.internal_pic_id = auth.uid() OR c.backup_pic_id = auth.uid())
    )
  )
);
