-- Add DELETE policy for service_requests
-- Staff (Authenticated users) can delete requests

DROP POLICY IF EXISTS "Staff can delete requests" ON service_requests;
CREATE POLICY "Staff can delete requests"
ON service_requests FOR DELETE
TO authenticated
USING (true);
