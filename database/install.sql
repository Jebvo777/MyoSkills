-- MyoSkills clean production installation. Select an EMPTY database first.
-- Never import this file over an existing deployment; use upgrade_20261027_production.sql.

-- MyoSkills / MySQL 5.7+ or MariaDB 10.4+ / utf8mb4
-- Empty installation schema. For a complete new database use install.sql.
-- The hosting control panel owns database/user creation; this script creates tables.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS users (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 name VARCHAR(160) NOT NULL,
 role VARCHAR(20) NOT NULL DEFAULT 'patient',
 specialty VARCHAR(40) NOT NULL DEFAULT '',
 phone VARCHAR(40) NOT NULL DEFAULT '',
 city VARCHAR(100) NOT NULL DEFAULT '',
 clinic VARCHAR(180) NOT NULL DEFAULT '',
 clinics_json TEXT NULL,
 about TEXT NULL,
 social_url VARCHAR(255) NOT NULL DEFAULT '',
 education TEXT NULL,
 hobbies VARCHAR(500) NOT NULL DEFAULT '',
 verified TINYINT NOT NULL DEFAULT 0,
 active TINYINT NOT NULL DEFAULT 1,
 contact_public TINYINT NOT NULL DEFAULT 0,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 preferences_json TEXT NULL,
 consent_at DATETIME NULL,
 archived_at DATETIME NULL,
 created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS patients (
 user_id INT UNSIGNED PRIMARY KEY,
 access_code VARCHAR(40) NOT NULL UNIQUE,
 status VARCHAR(30) NOT NULL DEFAULT 'active',
 claimed TINYINT NOT NULL DEFAULT 1,
 appliance VARCHAR(160) NOT NULL DEFAULT '',
 treatment_plan TEXT NULL,
 treatment_clinic VARCHAR(180) NOT NULL DEFAULT '',
 started_at DATE NULL,
 finished_at DATE NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS patient_team (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL,
 doctor_id INT UNSIGNED NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 joined_at DATETIME NOT NULL,
 UNIQUE KEY unique_member (patient_id,doctor_id),
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS planets (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 slug VARCHAR(60) NOT NULL UNIQUE,
 title VARCHAR(100) NOT NULL,
 subtitle VARCHAR(160) NOT NULL DEFAULT '',
 description TEXT NULL,
 color VARCHAR(12) NOT NULL DEFAULT '#7357e8',
 secondary_color VARCHAR(12) NOT NULL DEFAULT '#61e1ca',
 image VARCHAR(190) NOT NULL DEFAULT '',
 icon VARCHAR(30) NOT NULL DEFAULT 'orbit',
 sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS exercises (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 planet_id INT UNSIGNED NOT NULL,
 title VARCHAR(160) NOT NULL,
 description TEXT NULL,
 steps_json TEXT NULL,
 level INT NOT NULL DEFAULT 1,
 duration_seconds INT NOT NULL DEFAULT 60,
 repetitions VARCHAR(60) NOT NULL DEFAULT '',
 video_media_id INT UNSIGNED NULL,
 video_path VARCHAR(190) NOT NULL DEFAULT '',
 active TINYINT NOT NULL DEFAULT 0,
 archived_at DATETIME NULL,
 created_by INT UNSIGNED NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (planet_id) REFERENCES planets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS assignments (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL,
 exercise_id INT UNSIGNED NOT NULL,
 doctor_id INT UNSIGNED NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'active',
 instructions TEXT NULL,
 days_per_week INT NOT NULL DEFAULT 7,
 created_at DATETIME NOT NULL,
 UNIQUE KEY unique_assignment (patient_id,exercise_id),
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (exercise_id) REFERENCES exercises(id),
 FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS media (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 owner_id INT UNSIGNED NOT NULL,
 patient_id INT UNSIGNED NULL,
 category VARCHAR(30) NOT NULL,
 original_name VARCHAR(190) NOT NULL,
 stored_name VARCHAR(100) NOT NULL UNIQUE,
 mime_type VARCHAR(100) NOT NULL,
 size_bytes INT UNSIGNED NOT NULL,
 capture_date DATE NULL,
 note VARCHAR(255) NOT NULL DEFAULT '',
 is_public TINYINT NOT NULL DEFAULT 0,
 archived_at DATETIME NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (owner_id) REFERENCES users(id),
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS practices (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 assignment_id INT UNSIGNED NOT NULL,
 patient_id INT UNSIGNED NOT NULL,
 exercise_id INT UNSIGNED NOT NULL,
 practice_day DATE NOT NULL,
 created_at DATETIME NOT NULL,
 UNIQUE KEY unique_daily_practice (assignment_id,practice_day),
 FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS submissions (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 assignment_id INT UNSIGNED NOT NULL,
 patient_id INT UNSIGNED NOT NULL,
 exercise_id INT UNSIGNED NOT NULL,
 media_id INT UNSIGNED NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending',
 patient_comment TEXT NULL,
 doctor_comment TEXT NULL,
 reviewed_by INT UNSIGNED NULL,
 reviewed_at DATETIME NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (assignment_id) REFERENCES assignments(id),
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (media_id) REFERENCES media(id),
 FOREIGN KEY (exercise_id) REFERENCES exercises(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS rewards (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL,
 assignment_id INT UNSIGNED NOT NULL,
 reward_day DATE NOT NULL,
 kind VARCHAR(20) NOT NULL,
 points INT NOT NULL,
 created_at DATETIME NOT NULL,
 UNIQUE KEY unique_daily_reward (patient_id,assignment_id,reward_day,kind),
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (assignment_id) REFERENCES assignments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS visits (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL,
 doctor_id INT UNSIGNED NOT NULL,
 visited_at DATETIME NOT NULL,
 diagnosis TEXT NULL,
 appliance VARCHAR(160) NOT NULL DEFAULT '',
 method VARCHAR(190) NOT NULL DEFAULT '',
 recommendations TEXT NULL,
 treatment_plan TEXT NULL,
 next_visit DATE NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (doctor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS referrals (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL,
 from_doctor INT UNSIGNED NOT NULL,
 to_doctor INT UNSIGNED NULL,
 external_name VARCHAR(160) NOT NULL DEFAULT '',
 external_email VARCHAR(190) NOT NULL DEFAULT '',
 external_phone VARCHAR(40) NOT NULL DEFAULT '',
 external_clinic VARCHAR(180) NOT NULL DEFAULT '',
 specialty VARCHAR(40) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'pending',
 note TEXT NULL,
 responded_at DATETIME NULL,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (from_doctor) REFERENCES users(id),
 FOREIGN KEY (to_doctor) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS notifications (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL,
 type VARCHAR(40) NOT NULL,
 title VARCHAR(190) NOT NULL,
 body TEXT NULL,
 link VARCHAR(190) NOT NULL DEFAULT '',
 is_read TINYINT NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
CREATE TABLE IF NOT EXISTS messages (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 patient_id INT UNSIGNED NOT NULL,
 sender_id INT UNSIGNED NOT NULL,
 recipient_id INT UNSIGNED NOT NULL,
 body TEXT NOT NULL,
 is_read TINYINT NOT NULL DEFAULT 0,
 created_at DATETIME NOT NULL,
 FOREIGN KEY (patient_id) REFERENCES patients(user_id) ON DELETE CASCADE,
 FOREIGN KEY (sender_id) REFERENCES users(id),
 FOREIGN KEY (recipient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS app_settings (
 setting_key VARCHAR(80) PRIMARY KEY,
 setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS content_pages (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 slug VARCHAR(80) NOT NULL UNIQUE,
 title VARCHAR(160) NOT NULL,
 title_en VARCHAR(160) NOT NULL DEFAULT '',
 body TEXT NOT NULL,
 body_en TEXT NULL,
 menu_label VARCHAR(80) NOT NULL DEFAULT '',
 menu_label_en VARCHAR(80) NOT NULL DEFAULT '',
 cover_media_id INT UNSIGNED NULL,
 active TINYINT NOT NULL DEFAULT 1,
 sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS audit_logs (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NULL,
 action VARCHAR(80) NOT NULL,
 resource_type VARCHAR(40) NOT NULL DEFAULT '',
 resource_id INT UNSIGNED NULL,
 created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS login_attempts (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 identity_hash VARCHAR(64) NOT NULL,
 attempted_at DATETIME NOT NULL,
 INDEX attempts_lookup (identity_hash,attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS password_resets (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL,
 token_hash VARCHAR(64) NOT NULL UNIQUE,
 expires_at DATETIME NOT NULL,
 used_at DATETIME NULL,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
