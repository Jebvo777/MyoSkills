-- MyoSkills production release / MySQL 5.7.21+
-- Select the existing database in phpMyAdmin. Back it up before import.
-- Designed for the attached 2026-10-27 schema. Do not import the old dump again.
-- Idempotent: no DROP TABLE, TRUNCATE, disabled foreign keys, or fixed user IDs.
SET NAMES utf8mb4;

-- Remove the legacy synthetic-review flag only when it is present.
-- PREPARE is supported by MySQL 5.7 and needs no stored-procedure privileges.
SET @myo_sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='testimonials' AND COLUMN_NAME='is_demo') > 0,
 'DELETE FROM testimonials WHERE is_demo=1', 'SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql = IF(
 (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='testimonials' AND COLUMN_NAME='is_demo') > 0,
 'ALTER TABLE testimonials DROP COLUMN is_demo', 'SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;

START TRANSACTION;
-- Exact reserved seed identities; a real account renamed to another email is not selected.
-- Keep historical foreign keys, but permanently invalidate the shared passwords and sessions.
UPDATE users SET active=0, verified=0, contact_public=0, password_hash='!retired-account'
WHERE LOWER(email) IN ('admin@myoskills.test','olga@myoskills.test','irina@myoskills.test','lev@myoskills.test','denis@myoskills.test','alex@myoskills.test','alisa@myoskills.test','max@myoskills.test');

UPDATE patient_team t
LEFT JOIN users p ON p.id=t.patient_id
LEFT JOIN users d ON d.id=t.doctor_id
SET t.status='archived'
WHERE LOWER(p.email) IN ('alex@myoskills.test','alisa@myoskills.test','max@myoskills.test')
 OR LOWER(d.email) IN ('olga@myoskills.test','irina@myoskills.test','lev@myoskills.test','denis@myoskills.test');

-- Do not turn fictional materials into clinical instructions. Keep assignment history.
UPDATE exercises SET active=0, video_path=''
WHERE video_path='assets/demo-mission.mp4' AND video_media_id IS NULL;
UPDATE exercises SET active=0, description='', steps_json='[]'
WHERE description='Демонстрационный материал для проверки интерфейса. Содержание и видеообразец заменяет лечащий специалист.';
UPDATE assignments a JOIN exercises e ON e.id=a.exercise_id
SET a.status='paused' WHERE a.status='active' AND e.active=0;

-- Remove only the three exact bundled placeholders, without touching actual uploaded files.
UPDATE media SET is_public=0, category='retired'
WHERE stored_name IN ('demo-photo-before.webp','demo-photo-after.webp','demo-video.mp4');
UPDATE submissions s JOIN media m ON m.id=s.media_id
SET s.status='archived' WHERE m.category='retired'
 AND m.stored_name IN ('demo-photo-before.webp','demo-photo-after.webp','demo-video.mp4');

DELETE r FROM password_resets r JOIN users u ON u.id=r.user_id
WHERE u.password_hash='!retired-account';

-- Remove retired identities' synthetic testimonials, even if the old flag was absent.
DELETE t FROM testimonials t JOIN users u ON u.id=t.patient_id
WHERE LOWER(u.email) IN ('alex@myoskills.test','alisa@myoskills.test','max@myoskills.test');
COMMIT;

-- Real users, visits, messages, photos, exercises with actual uploads, and statistics are kept.
-- If you used only the old administrator, create a real one using tools/create_admin.php.
-- Replacements for inactive exercises are added and assigned through the administrator/doctor UI.
