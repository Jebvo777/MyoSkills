-- MyoSkills: create your first administrator using phpMyAdmin, without server SSH.
-- 1. Register a NEW, SEPARATE account on your site, choosing your own password.
-- 2. Enter that account's email below. Do not use a treating clinician/patient account.
-- 3. Select the MyoSkills database in phpMyAdmin and import this file.
-- 4. Sign out of the site, then sign in again. The password is unchanged.
-- The account must have no clinical history, team links, invitations, files or messages.
-- A blank address does nothing. No shared passwords are created or exposed.
-- This works both before and after upgrade_20261027_production.sql.
SET NAMES utf8mb4;
SET @myo_admin_email = '';

START TRANSACTION;
UPDATE users u
SET u.role='admin',u.specialty='',u.verified=0,u.contact_public=0
WHERE LOWER(u.email)=LOWER(TRIM(@myo_admin_email))
  AND TRIM(@myo_admin_email)<>''
  AND LOWER(u.email) NOT LIKE '%@myoskills.test'
  AND u.role='patient' AND u.active=1
  AND NOT EXISTS (SELECT 1 FROM patient_team t WHERE t.patient_id=u.id OR t.doctor_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM assignments a WHERE a.patient_id=u.id OR a.doctor_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.patient_id=u.id OR v.doctor_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM referrals r WHERE r.patient_id=u.id OR r.from_doctor=u.id OR r.to_doctor=u.id)
  AND NOT EXISTS (SELECT 1 FROM practices p WHERE p.patient_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.patient_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.patient_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM media m WHERE m.owner_id=u.id OR m.patient_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.patient_id=u.id OR m.sender_id=u.id OR m.recipient_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM testimonials t WHERE t.patient_id=u.id)
  AND NOT EXISTS (SELECT 1 FROM patient_invitations i WHERE i.email=u.email OR i.doctor_id=u.id);
COMMIT;

SELECT CASE WHEN EXISTS (
 SELECT 1 FROM users WHERE LOWER(email)=LOWER(TRIM(@myo_admin_email)) AND role='admin' AND active=1
) THEN 'Administrator ready. Sign out and sign in again.'
 ELSE 'No account changed. Use the email of a new, active account without clinical history.' END AS result;
