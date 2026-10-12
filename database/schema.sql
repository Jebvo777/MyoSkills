-- MyoSkills / MySQL 5.7+ or MariaDB 10.4+ / utf8mb4
-- Import into the existing system404_mio database selected in phpMyAdmin.
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
 verified TINYINT NOT NULL DEFAULT 0,
 active TINYINT NOT NULL DEFAULT 1,
 contact_public TINYINT NOT NULL DEFAULT 0,
 latitude DECIMAL(10,7) NULL,
 longitude DECIMAL(10,7) NULL,
 preferences_json TEXT NULL,
 consent_at DATETIME NULL,
 created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS patients (
 user_id INT UNSIGNED PRIMARY KEY,
 access_code VARCHAR(40) NOT NULL UNIQUE,
 status VARCHAR(30) NOT NULL DEFAULT 'active',
 claimed TINYINT NOT NULL DEFAULT 1,
 appliance VARCHAR(160) NOT NULL DEFAULT '',
 treatment_plan TEXT NULL,
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
 active TINYINT NOT NULL DEFAULT 1,
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
 to_doctor INT UNSIGNED NOT NULL,
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
