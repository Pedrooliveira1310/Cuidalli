CREATE TABLE IF NOT EXISTS care_settings (
 elder_id BIGINT UNSIGNED PRIMARY KEY,
 inactivity_hours INT UNSIGNED NOT NULL DEFAULT 24,
 FOREIGN KEY(elder_id) REFERENCES users(id),
 CHECK(inactivity_hours BETWEEN 1 AND 168)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS care_alerts (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 elder_id BIGINT UNSIGNED NOT NULL,
 kind ENUM('sos','inactivity','pain') NOT NULL,
 status ENUM('open','accepted','resolved') NOT NULL DEFAULT 'open',
 episode_key VARCHAR(100) UNIQUE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 accepted_by BIGINT UNSIGNED NULL,
 accepted_at DATETIME NULL,
 resolved_at DATETIME NULL,
 FOREIGN KEY(elder_id) REFERENCES users(id),
 FOREIGN KEY(accepted_by) REFERENCES users(id),
 INDEX(elder_id,status,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS assistant_messages (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 elder_id BIGINT UNSIGNED NOT NULL,
 content VARCHAR(500) NOT NULL,
 reply TEXT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(elder_id) REFERENCES users(id),
 INDEX(elder_id,id)
) ENGINE=InnoDB;
