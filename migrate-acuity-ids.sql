
-- Add the acuityAppointmentTypeId column (if not already added by schema update)
ALTER TABLE human_mentors ADD COLUMN IF NOT EXISTS acuity_appointment_type_id INTEGER;

-- Update mentors with their specific Acuity appointment type IDs
-- Based on the mentor names from your AI mentor selector

-- John Mark - ID: 81495198
UPDATE human_mentors 
SET acuity_appointment_type_id = 81495198 
WHERE EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = human_mentors.user_id 
  AND (users.firstName ILIKE '%John%' OR users.firstName ILIKE '%Mark%')
);

-- David - ID: 81496327
UPDATE human_mentors 
SET acuity_appointment_type_id = 81496327 
WHERE EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = human_mentors.user_id 
  AND users.firstName ILIKE '%David%'
);

-- Frank Slootman - ID: 81496344
UPDATE human_mentors 
SET acuity_appointment_type_id = 81496344 
WHERE EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = human_mentors.user_id 
  AND (users.firstName ILIKE '%Frank%' OR users.lastName ILIKE '%Slootman%')
);

-- Gregg Dedrick - ID: 81496362
UPDATE human_mentors 
SET acuity_appointment_type_id = 81496362 
WHERE EXISTS (
  SELECT 1 FROM users 
  WHERE users.id = human_mentors.user_id 
  AND (users.firstName ILIKE '%Gregg%' OR users.lastName ILIKE '%Dedrick%')
);

-- Verify the updates
SELECT 
  hm.id,
  u.firstName,
  u.lastName,
  hm.acuity_appointment_type_id
FROM human_mentors hm
LEFT JOIN users u ON hm.user_id = u.id
WHERE hm.acuity_appointment_type_id IS NOT NULL;
