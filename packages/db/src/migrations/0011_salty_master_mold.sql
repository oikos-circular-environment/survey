CREATE TABLE `usability_deleted_testers` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`participant_code` char(26) NOT NULL,
	`persona` enum('COLLECTOR','RECYCLING_COMPANY','GENERAL_COMPANY','CITIZEN','GOVERNMENT') NOT NULL,
	`status` enum('IN_PROGRESS','COMPLETED','ABANDONED','DISCARDED') NOT NULL,
	`state_uf` varchar(64) NOT NULL,
	`city_name` varchar(128) NOT NULL,
	`age_range` enum('UNDER_18','AGE_18_24','AGE_25_34','AGE_35_44','AGE_45_54','AGE_55_64','OVER_64') NOT NULL,
	`education_level` enum('NONE','ELEMENTARY_INCOMPLETE','ELEMENTARY_COMPLETE','HIGHSCHOOL_INCOMPLETE','HIGHSCHOOL_COMPLETE','HIGHER_INCOMPLETE','HIGHER_COMPLETE','POSTGRADUATE') NOT NULL,
	`device_os` varchar(32) NOT NULL,
	`device_os_version` varchar(32) NOT NULL,
	`started_at` timestamp(3) NOT NULL,
	`finished_at` timestamp(3),
	`active_ms` int NOT NULL DEFAULT 0,
	`deleted_at` timestamp(3) NOT NULL,
	`deleted_by_user_id` varchar(64) NOT NULL,
	CONSTRAINT `usability_deleted_testers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `deleted_testers_deleted_at` ON `usability_deleted_testers` (`deleted_at`);