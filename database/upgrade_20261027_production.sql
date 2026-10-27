-- MyoSkills production upgrade, 27 October 2026. MySQL 5.7 / utf8mb4.
-- Select the EXISTING application database in phpMyAdmin before importing.
-- Back up the database, config.local.php and storage/files first.
-- Create a real administrator first (tools/create_admin.php or create_admin_from_account.sql).
-- Never import the old SQL dump over an existing installation.
-- Re-running this script is safe. No user, clinical or uploaded-file rows are deleted.
-- Original sample rows are archived by exact source markers, never by numeric IDs.
-- Also accepts the earlier release/production-20261027 migration state.
-- DDL in MySQL commits implicitly; do not rely on ROLLBACK as a backup.

-- MyoSkills upgrade for the earlier release. Select your database first.
-- Keeps existing accounts, visits, assignments and uploads.
SET NAMES utf8mb4;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='social_url')=0,'ALTER TABLE users ADD COLUMN social_url VARCHAR(255) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='education')=0,'ALTER TABLE users ADD COLUMN education TEXT NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='hobbies')=0,'ALTER TABLE users ADD COLUMN hobbies VARCHAR(500) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='treatment_clinic')=0,'ALTER TABLE patients ADD COLUMN treatment_clinic VARCHAR(180) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='media' AND COLUMN_NAME='is_public')=0,'ALTER TABLE media ADD COLUMN is_public TINYINT NOT NULL DEFAULT 0','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals' AND COLUMN_NAME='external_name')=0,'ALTER TABLE referrals ADD COLUMN external_name VARCHAR(160) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals' AND COLUMN_NAME='external_email')=0,'ALTER TABLE referrals ADD COLUMN external_email VARCHAR(190) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals' AND COLUMN_NAME='external_phone')=0,'ALTER TABLE referrals ADD COLUMN external_phone VARCHAR(40) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals' AND COLUMN_NAME='external_clinic')=0,'ALTER TABLE referrals ADD COLUMN external_clinic VARCHAR(180) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='content_pages' AND COLUMN_NAME='cover_media_id')=0,'ALTER TABLE content_pages ADD COLUMN cover_media_id INT UNSIGNED NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='content_pages' AND COLUMN_NAME='title_en')=0,'ALTER TABLE content_pages ADD COLUMN title_en VARCHAR(160) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='content_pages' AND COLUMN_NAME='body_en')=0,'ALTER TABLE content_pages ADD COLUMN body_en TEXT NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='content_pages' AND COLUMN_NAME='menu_label_en')=0,'ALTER TABLE content_pages ADD COLUMN menu_label_en VARCHAR(80) NOT NULL DEFAULT ''''','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='referrals' AND COLUMN_NAME='to_doctor')='NO','ALTER TABLE referrals MODIFY COLUMN to_doctor INT UNSIGNED NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
CREATE TABLE IF NOT EXISTS visit_files (
 visit_id INT UNSIGNED NOT NULL,
 media_id INT UNSIGNED NOT NULL,
 PRIMARY KEY (visit_id,media_id),
 FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
 FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS patient_invitations (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 doctor_id INT UNSIGNED NOT NULL,
 email VARCHAR(190) NOT NULL,
 code_hash VARCHAR(64) NOT NULL UNIQUE,
 expires_at DATETIME NOT NULL,
 accepted_at DATETIME NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS testimonials (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL UNIQUE,
 author_name VARCHAR(100) NOT NULL,
 rating INT NOT NULL DEFAULT 5,
 body TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending',
 is_demo TINYINT NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL,
 updated_at DATETIME NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A prior release migration dropped this legacy archive discriminator.
-- Restore it only when missing; the current application never enables a demo mode.
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='testimonials' AND COLUMN_NAME='is_demo')=0,'ALTER TABLE testimonials ADD COLUMN is_demo TINYINT NOT NULL DEFAULT 0','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;

-- General archival fields used by the production application.
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='archived_at')=0,'ALTER TABLE users ADD COLUMN archived_at DATETIME NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exercises' AND COLUMN_NAME='archived_at')=0,'ALTER TABLE exercises ADD COLUMN archived_at DATETIME NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;
SET @myo_sql=IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='media' AND COLUMN_NAME='archived_at')=0,'ALTER TABLE media ADD COLUMN archived_at DATETIME NULL','SELECT 1');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;

SET @myo_sql=IF((SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='exercises' AND COLUMN_NAME='active') <=> '0','SELECT 1','ALTER TABLE exercises MODIFY COLUMN active TINYINT NOT NULL DEFAULT 0');
PREPARE myo_statement FROM @myo_sql;
EXECUTE myo_statement;
DEALLOCATE PREPARE myo_statement;

DROP TEMPORARY TABLE IF EXISTS myo_release_20261027_users;
CREATE TEMPORARY TABLE myo_release_20261027_users (id INT UNSIGNED PRIMARY KEY) ENGINE=InnoDB;
DROP TEMPORARY TABLE IF EXISTS myo_release_20261027_exercises;
CREATE TEMPORARY TABLE myo_release_20261027_exercises (id INT UNSIGNED PRIMARY KEY) ENGINE=InnoDB;

START TRANSACTION;

-- Both the original address and original creation timestamp must match.
INSERT INTO myo_release_20261027_users (id)
SELECT id FROM users
WHERE LOWER(email) IN (
 'admin@myoskills.test','olga@myoskills.test','irina@myoskills.test','lev@myoskills.test',
 'denis@myoskills.test','alex@myoskills.test','alisa@myoskills.test','max@myoskills.test'
) AND created_at='2026-10-01 10:00:00';

-- Archive only the complete source signature without an uploaded video.
-- An edit to steps, duration, level, repetitions, category or author preserves a draft.
-- The second signature is the empty retired form produced by the earlier release.
INSERT INTO myo_release_20261027_exercises (id)
SELECT e.id FROM exercises e
JOIN planets p ON p.id=e.planet_id
JOIN myo_release_20261027_users source_author ON source_author.id=e.created_by
WHERE e.created_at='2026-10-01 10:00:00'
  AND e.video_media_id IS NULL
  AND e.video_path IN ('assets/demo-mission.mp4','')
  AND ((BINARY e.description=BINARY 'Демонстрационный материал для проверки интерфейса. Содержание и видеообразец заменяет лечащий специалист.'
        AND BINARY e.steps_json=BINARY '["Посмотри образец, который подготовил врач.", "Выполни только назначенные врачом действия и количество повторений.", "Загрузи короткое видео выполнения и дождись комментария."]')
    OR (BINARY e.description=BINARY '' AND BINARY e.steps_json=BINARY '[]' AND e.active=0 AND e.video_path=''))
  AND e.level IN (1,2)
  AND e.duration_seconds=CASE WHEN e.level=1 THEN 60 ELSE 90 END
  AND BINARY e.repetitions=BINARY 'По назначению врача'
  AND ((p.slug='posture' AND BINARY e.title=BINARY CONCAT('Осанка: миссия ',e.level))
    OR (p.slug='breathing' AND BINARY e.title=BINARY CONCAT('Дыхание: миссия ',e.level))
    OR (p.slug='tongue' AND BINARY e.title=BINARY CONCAT('Язык: миссия ',e.level))
    OR (p.slug='swallowing' AND BINARY e.title=BINARY CONCAT('Глотание: миссия ',e.level))
    OR (p.slug='chewing' AND BINARY e.title=BINARY CONCAT('Жевание: миссия ',e.level))
    OR (p.slug='lips' AND BINARY e.title=BINARY CONCAT('Губы и щёки: миссия ',e.level)));

UPDATE users u JOIN myo_release_20261027_users r ON r.id=u.id
SET u.active=0,u.verified=0,u.contact_public=0,u.password_hash='!retired-account',u.archived_at=COALESCE(u.archived_at,NOW());

UPDATE patients p JOIN myo_release_20261027_users r ON r.id=p.user_id
SET p.status='archived';

UPDATE patient_team t JOIN myo_release_20261027_users r ON r.id=t.patient_id
SET t.status='archived';
UPDATE patient_team t JOIN myo_release_20261027_users r ON r.id=t.doctor_id
SET t.status='archived';

UPDATE password_resets p JOIN myo_release_20261027_users r ON r.id=p.user_id
SET p.used_at=COALESCE(p.used_at,NOW());
UPDATE patient_invitations i JOIN myo_release_20261027_users r ON r.id=i.doctor_id
SET i.expires_at=LEAST(i.expires_at,NOW());

UPDATE media m JOIN myo_release_20261027_users r ON r.id=m.owner_id
SET m.is_public=0,m.archived_at=COALESCE(m.archived_at,NOW())
WHERE m.stored_name IN ('demo-photo-before.webp','demo-photo-after.webp','demo-video.mp4');

UPDATE exercises e JOIN myo_release_20261027_exercises r ON r.id=e.id
SET e.active=0,e.archived_at=COALESCE(e.archived_at,NOW()),e.video_path='';
UPDATE assignments a JOIN myo_release_20261027_exercises r ON r.id=a.exercise_id
SET a.status='paused' WHERE a.status='active';

-- An edited exercise with the old placeholder video becomes a visible draft.
-- A real uploaded video remains usable; no real media reference is removed.
UPDATE exercises
SET active=CASE WHEN video_media_id IS NULL THEN 0 ELSE active END,video_path=''
WHERE video_path='assets/demo-mission.mp4';

-- Earlier releases marked even real submitted reviews with a global switch.
-- Those reviews return to moderation instead of being deleted or published automatically.
UPDATE testimonials t JOIN users u ON u.id=t.patient_id
SET t.is_demo=0,t.status='pending'
WHERE t.is_demo=1 AND u.archived_at IS NULL
  AND LOWER(u.email) NOT IN (
   'admin@myoskills.test','olga@myoskills.test','irina@myoskills.test','lev@myoskills.test',
   'denis@myoskills.test','alex@myoskills.test','alisa@myoskills.test','max@myoskills.test'
  );
UPDATE testimonials SET status='rejected' WHERE is_demo=1;
UPDATE testimonials t JOIN myo_release_20261027_users r ON r.id=t.patient_id
SET t.is_demo=1,t.status='rejected';

-- Replace only the exact old prelaunch wording. Owner-edited copy is preserved.
UPDATE app_settings
SET setting_value='Условия участия в программе уточняйте у своего специалиста.'
WHERE setting_key='tariffs_message'
  AND setting_value='На первом этапе доступ к сервису бесплатный. Тарифы появятся после запуска платных возможностей.';
UPDATE app_settings
SET setting_value='Please ask your care specialist about the terms of your programme.'
WHERE setting_key='tariffs_message_en'
  AND setting_value='The first release is free to use. Pricing will be introduced when paid features are launched.';

COMMIT;

DROP TEMPORARY TABLE myo_release_20261027_exercises;
DROP TEMPORARY TABLE myo_release_20261027_users;

-- Add only missing production categories/settings; never overwrite owner edits.
-- MyoSkills production catalogue and application copy. No user accounts or medical records.
-- Safe to repeat: existing category content and settings are preserved.
SET NAMES utf8mb4;
START TRANSACTION;
INSERT INTO planets (slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES ('posture','Вертикаль','Осанка','Кристаллы собирают твою устойчивую орбиту.','#9d89f8','#7357e8','assets/images/planet-posture.webp','body',1) ON DUPLICATE KEY UPDATE slug=VALUES(slug);
INSERT INTO planets (slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES ('breathing','Аэрис','Дыхание','Тихая планета воздушных потоков.','#61e1ca','#7357e8','assets/images/planet-breathing.webp','wind',2) ON DUPLICATE KEY UPDATE slug=VALUES(slug);
INSERT INTO planets (slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES ('tongue','Лингва','Язык','Извилистые тропы точного движения.','#ef9daa','#7357e8','assets/images/planet-tongue.webp','spark',3) ON DUPLICATE KEY UPDATE slug=VALUES(slug);
INSERT INTO planets (slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES ('swallowing','Аква','Глотание','Мир плавных волн и прозрачных колец.','#9bcaef','#7357e8','assets/images/planet-swallowing.webp','drop',4) ON DUPLICATE KEY UPDATE slug=VALUES(slug);
INSERT INTO planets (slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES ('chewing','Мастика','Жевание','Тактильные формы и ритмичные механизмы.','#e6bf77','#7357e8','assets/images/planet-chewing.webp','hex',5) ON DUPLICATE KEY UPDATE slug=VALUES(slug);
INSERT INTO planets (slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES ('lips','Лаби','Губы и щёки','Мягкая планета округлых форм.','#dea6d9','#7357e8','assets/images/planet-lips.webp','smile',6) ON DUPLICATE KEY UPDATE slug=VALUES(slug);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('about','MyoSkills объединяет домашние занятия и обратную связь специалистов. Пациент получает персональный маршрут, а команда врачей — общую картину занятий и лечения.') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('about_en','MyoSkills connects at-home practice with professional feedback. Patients follow a personal route, and their care team shares the activity and treatment history.') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('landing_title','Твой навык. Твоя галактика.') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('landing_title_en','Your skills. Your galaxy.') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('contact_email','') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('contact_phone','') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('contact_address','') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('legal_company','') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('tariffs_message','Условия участия в программе уточняйте у своего специалиста.') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('tariffs_message_en','Please ask your care specialist about the terms of your programme.') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('shop_links','[]') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('shop_links_en','[]') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('services','[{"title":"Персональный маршрут","text":"Миотерапевт выбирает упражнения и открывает новые миссии после проверки."},{"title":"Обратная связь по видео","text":"Загружай выполнение и получай комментарии специалиста."},{"title":"Команда рядом","text":"Смежные врачи видят историю лечения в пределах своих прав."}]') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('services_en','[{"title":"Your personal route","text":"Your myotherapist assigns exercises and opens new missions after review."},{"title":"Feedback on your videos","text":"Upload your practice and receive feedback from your specialist."},{"title":"Your care team","text":"Related specialists share the treatment history within their access rights."}]') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('faq','[{"q":"Кто открывает новые упражнения?","a":"Верифицированный миотерапевт из вашей команды. Доступ определяется назначением."},{"q":"Можно ли записать видео прямо на сайте?","a":"Да, если браузер поддерживает запись и сайт открыт по HTTPS. Готовый файл можно загрузить отдельно."},{"q":"Кто видит мои фотографии и видео?","a":"Вы, специалисты вашей команды и администратор с правом доступа. Другие пациенты не получают доступ."},{"q":"За что выдаются награды?","a":"Топливо отмечает выполнение, звёзды и опыт — подтверждение врача. Новые уровни открывает миотерапевт."}]') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
INSERT INTO app_settings (setting_key,setting_value) VALUES ('faq_en','[{"q":"Who opens new exercises?","a":"A verified myotherapist in your care team. Access follows your assignments."},{"q":"Can I record a video on the site?","a":"Yes, in a supported browser over HTTPS. You can also upload a prerecorded file."},{"q":"Who sees my photos and videos?","a":"You, authorized members of your care team, and the administrator. Other patients cannot access them."},{"q":"How do rewards work?","a":"Practice earns fuel; doctor approval earns XP and stars. Your myotherapist opens advanced exercises."}]') ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key);
COMMIT;

SELECT '2026.10.27-production' AS release_version,
 (SELECT COUNT(*) FROM users WHERE active=1 AND archived_at IS NULL AND role='admin' AND LOWER(email) NOT LIKE '%@myoskills.test') AS active_administrators,
 (SELECT COUNT(*) FROM users WHERE archived_at IS NOT NULL) AS archived_accounts,
 (SELECT COUNT(*) FROM exercises WHERE archived_at IS NOT NULL) AS archived_exercises,
 (SELECT COUNT(*) FROM media WHERE archived_at IS NOT NULL) AS archived_media;
-- If active_administrators=0, create your administrator before reopening the site.
