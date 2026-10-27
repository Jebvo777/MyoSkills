-- Shared application content only. No accounts or clinical records.
SET NAMES utf8mb4;
INSERT IGNORE INTO planets (id,slug,title,subtitle,description,color,secondary_color,image,icon,sort_order) VALUES (1,'posture','Вертикаль','Осанка','Кристаллы собирают твою устойчивую орбиту.','#9d89f8','#7357e8','assets/images/planet-posture.webp','body',1);
INSERT IGNORE INTO app_settings (setting_key,setting_value) VALUES ('about','MyoSkills объединяет домашние занятия и обратную связь специалистов. Пациент получает персональный маршрут, а команда врачей — общую картину занятий и лечения.');
