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
ALTER TABLE referrals MODIFY COLUMN to_doctor INT UNSIGNED NULL;
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
