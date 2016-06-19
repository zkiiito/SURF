-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               5.6.26-log - MySQL Community Server (GPL)
-- Server OS:                    Win32
-- HeidiSQL Verzió:              9.3.0.4984
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

-- Dumping structure for tábla surf.invite
CREATE TABLE IF NOT EXISTS `invite` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `wave_id` bigint(20) unsigned NOT NULL,
  `code` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used_at` datetime DEFAULT NULL,
  `used_user_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `FK_invite_user` (`user_id`),
  KEY `FK_invite_wave` (`wave_id`),
  CONSTRAINT `FK_invite_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK_invite_wave` FOREIGN KEY (`wave_id`) REFERENCES `wave` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.


-- Dumping structure for tábla surf.message
CREATE TABLE IF NOT EXISTS `message` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `wave_id` bigint(20) unsigned NOT NULL,
  `parent_id` bigint(20) unsigned DEFAULT NULL,
  `root_id` bigint(20) unsigned DEFAULT NULL,
  `message` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `root_id` (`root_id`,`wave_id`,`id`),
  KEY `parent_id` (`parent_id`,`wave_id`),
  KEY `FK_message_wave` (`wave_id`),
  CONSTRAINT `FK_message_message` FOREIGN KEY (`parent_id`) REFERENCES `message` (`id`),
  CONSTRAINT `FK_message_message_2` FOREIGN KEY (`root_id`) REFERENCES `message` (`id`),
  CONSTRAINT `FK_message_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK_message_wave` FOREIGN KEY (`wave_id`) REFERENCES `wave` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.


-- Dumping structure for tábla surf.unread
CREATE TABLE IF NOT EXISTS `unread` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `wave_id` bigint(20) unsigned NOT NULL,
  `message_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `message_id` (`message_id`),
  KEY `wave_id` (`wave_id`,`user_id`),
  CONSTRAINT `FK_unread_message` FOREIGN KEY (`message_id`) REFERENCES `message` (`id`),
  CONSTRAINT `FK_unread_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK_unread_wave` FOREIGN KEY (`wave_id`) REFERENCES `wave` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.


-- Dumping structure for tábla surf.user
CREATE TABLE IF NOT EXISTS `user` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `google_avatar` varchar(255) DEFAULT NULL,
  `facebook_id` varchar(255) DEFAULT NULL,
  `facebook_avatar` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `google_id` (`google_id`),
  UNIQUE KEY `facebook_id` (`facebook_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.


-- Dumping structure for tábla surf.wave
CREATE TABLE IF NOT EXISTS `wave` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.


-- Dumping structure for tábla surf.wave_user
CREATE TABLE IF NOT EXISTS `wave_user` (
  `wave_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  UNIQUE KEY `wave_user_unique` (`wave_id`,`user_id`),
  KEY `FK_wave_user_user` (`user_id`),
  CONSTRAINT `FK_wave_user_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `FK_wave_user_wave` FOREIGN KEY (`wave_id`) REFERENCES `wave` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
