
-- Enable RLS on promotions table
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow owners to access their organization's promotions
CREATE POLICY "Allow owners to manage promotions" ON promotions
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'owner'
  )
);

-- Allow admin and owner roles to insert promotions
CREATE POLICY "Allow admin/owner to insert promotions" ON promotions
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Allow all authenticated users to select promotions from their organization
CREATE POLICY "Allow users to view organization promotions" ON promotions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);
