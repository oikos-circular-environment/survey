CREATE TABLE `usability_answers` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`suite_run_id` char(36),
	`question_id` char(36) NOT NULL,
	`value_text` text,
	`value_number` int,
	`created_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	CONSTRAINT `usability_answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `answers_session_run_question` UNIQUE(`session_id`,`suite_run_id`,`question_id`)
);
--> statement-breakpoint
CREATE TABLE `usability_events` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`client_event_id` char(36) NOT NULL,
	`seq` int NOT NULL,
	`type` varchar(48) NOT NULL,
	`suite_code` varchar(8),
	`task_code` varchar(8),
	`occurred_at` timestamp(3) NOT NULL,
	`received_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	`payload` json NOT NULL,
	CONSTRAINT `usability_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `events_session_client_event` UNIQUE(`session_id`,`client_event_id`)
);
--> statement-breakpoint
CREATE TABLE `usability_sessions` (
	`id` char(36) NOT NULL,
	`protocol_version_id` char(36) NOT NULL,
	`participant_code` int AUTO_INCREMENT NOT NULL,
	`persona` enum('COLLECTOR','RECYCLING_COMPANY','GENERAL_COMPANY','CITIZEN','GOVERNMENT') NOT NULL,
	`status` enum('IN_PROGRESS','COMPLETED','ABANDONED','DISCARDED') NOT NULL DEFAULT 'IN_PROGRESS',
	`state_uf` char(2) NOT NULL,
	`city_name` varchar(128) NOT NULL,
	`age_range` enum('UNDER_18','AGE_18_24','AGE_25_34','AGE_35_44','AGE_45_54','AGE_55_64','OVER_64') NOT NULL,
	`education_level` enum('NONE','ELEMENTARY_INCOMPLETE','ELEMENTARY_COMPLETE','HIGHSCHOOL_INCOMPLETE','HIGHSCHOOL_COMPLETE','HIGHER_INCOMPLETE','HIGHER_COMPLETE','POSTGRADUATE') NOT NULL,
	`chain_role` enum('INDEPENDENT_COLLECTOR','COOPERATIVE_MEMBER','RECYCLING_BUSINESS','GENERAL_BUSINESS','PUBLIC_SERVANT','RESEARCHER','NONE','OTHER') NOT NULL,
	`waste_contact_frequency` int NOT NULL,
	`app_experience` int NOT NULL,
	`consent_version` varchar(32) NOT NULL,
	`consent_at` timestamp(3) NOT NULL,
	`device_os` varchar(32) NOT NULL,
	`device_os_version` varchar(32) NOT NULL,
	`app_version` varchar(32) NOT NULL,
	`screen_size` enum('SMALL','MEDIUM','LARGE') NOT NULL,
	`started_at` timestamp(3) NOT NULL,
	`finished_at` timestamp(3),
	`active_ms` int NOT NULL DEFAULT 0,
	`wall_ms` int NOT NULL DEFAULT 0,
	`abandon_reason` varchar(512),
	`superseded_by` char(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	CONSTRAINT `usability_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `usability_sessions_participant_code_unique` UNIQUE(`participant_code`)
);
--> statement-breakpoint
CREATE TABLE `usability_suite_runs` (
	`id` char(36) NOT NULL,
	`session_id` char(36) NOT NULL,
	`suite_id` char(36) NOT NULL,
	`position` int NOT NULL,
	`started_at` timestamp(3) NOT NULL,
	`finished_at` timestamp(3),
	`active_ms` int NOT NULL DEFAULT 0,
	`wall_ms` int NOT NULL DEFAULT 0,
	`outcome` enum('YES','PARTIAL','NO'),
	`created_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	CONSTRAINT `usability_suite_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `suite_runs_session_suite` UNIQUE(`session_id`,`suite_id`)
);
--> statement-breakpoint
CREATE TABLE `usability_task_runs` (
	`id` char(36) NOT NULL,
	`suite_run_id` char(36) NOT NULL,
	`task_id` char(36) NOT NULL,
	`position` int NOT NULL,
	`started_at` timestamp(3) NOT NULL,
	`finished_at` timestamp(3),
	`active_ms` int NOT NULL DEFAULT 0,
	`outcome` enum('YES','PARTIAL','NO'),
	`auto_detected` boolean NOT NULL DEFAULT false,
	`self_reported` enum('YES','PARTIAL','NO'),
	`created_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	CONSTRAINT `usability_task_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_runs_suite_run_task` UNIQUE(`suite_run_id`,`task_id`)
);
--> statement-breakpoint
CREATE TABLE `usability_persona_defs` (
	`id` char(36) NOT NULL,
	`protocol_version_id` char(36) NOT NULL,
	`key` enum('COLLECTOR','RECYCLING_COMPANY','GENERAL_COMPANY','CITIZEN','GOVERNMENT') NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` varchar(512) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `usability_persona_defs_id` PRIMARY KEY(`id`),
	CONSTRAINT `persona_defs_version_key` UNIQUE(`protocol_version_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `usability_persona_suites` (
	`persona_id` char(36) NOT NULL,
	`suite_id` char(36) NOT NULL,
	`position` int NOT NULL,
	CONSTRAINT `usability_persona_suites_persona_id_suite_id_pk` PRIMARY KEY(`persona_id`,`suite_id`)
);
--> statement-breakpoint
CREATE TABLE `usability_protocol_versions` (
	`id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`version` int NOT NULL,
	`published_at` timestamp(3) NOT NULL DEFAULT (now(3)),
	CONSTRAINT `usability_protocol_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `protocol_versions_key_version` UNIQUE(`key`,`version`)
);
--> statement-breakpoint
CREATE TABLE `usability_questions` (
	`id` char(36) NOT NULL,
	`protocol_version_id` char(36) NOT NULL,
	`key` varchar(64) NOT NULL,
	`scope` enum('SCREENER','PER_SUITE','FINAL') NOT NULL,
	`type` enum('SCALE','CHOICE','TEXT','LOCATION') NOT NULL,
	`position` int NOT NULL,
	`label` varchar(512) NOT NULL,
	`helper_text` varchar(512),
	`required` boolean NOT NULL DEFAULT true,
	`options` json,
	`anchor_min` varchar(128),
	`anchor_max` varchar(128),
	`repeat_anchors` boolean NOT NULL DEFAULT false,
	`max_length` int,
	`polarity` enum('POSITIVE','NEGATIVE'),
	CONSTRAINT `usability_questions_id` PRIMARY KEY(`id`),
	CONSTRAINT `questions_version_key` UNIQUE(`protocol_version_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `usability_suite_defs` (
	`id` char(36) NOT NULL,
	`protocol_version_id` char(36) NOT NULL,
	`code` varchar(8) NOT NULL,
	`title` varchar(128) NOT NULL,
	`objective` varchar(512) NOT NULL,
	CONSTRAINT `usability_suite_defs_id` PRIMARY KEY(`id`),
	CONSTRAINT `suite_defs_version_code` UNIQUE(`protocol_version_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `usability_task_defs` (
	`id` char(36) NOT NULL,
	`suite_id` char(36) NOT NULL,
	`code` varchar(8) NOT NULL,
	`title` varchar(128) NOT NULL,
	`instruction` varchar(512) NOT NULL,
	`position` int NOT NULL,
	`success_rule` json NOT NULL,
	CONSTRAINT `usability_task_defs_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_defs_suite_code` UNIQUE(`suite_id`,`code`)
);
--> statement-breakpoint
ALTER TABLE `usability_answers` ADD CONSTRAINT `fk_answers_session` FOREIGN KEY (`session_id`) REFERENCES `usability_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_answers` ADD CONSTRAINT `fk_answers_suite_run` FOREIGN KEY (`suite_run_id`) REFERENCES `usability_suite_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_answers` ADD CONSTRAINT `fk_answers_question` FOREIGN KEY (`question_id`) REFERENCES `usability_questions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_events` ADD CONSTRAINT `fk_events_session` FOREIGN KEY (`session_id`) REFERENCES `usability_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_sessions` ADD CONSTRAINT `fk_sessions_version` FOREIGN KEY (`protocol_version_id`) REFERENCES `usability_protocol_versions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_suite_runs` ADD CONSTRAINT `fk_suite_runs_session` FOREIGN KEY (`session_id`) REFERENCES `usability_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_suite_runs` ADD CONSTRAINT `fk_suite_runs_suite` FOREIGN KEY (`suite_id`) REFERENCES `usability_suite_defs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_task_runs` ADD CONSTRAINT `fk_task_runs_suite_run` FOREIGN KEY (`suite_run_id`) REFERENCES `usability_suite_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_task_runs` ADD CONSTRAINT `fk_task_runs_task` FOREIGN KEY (`task_id`) REFERENCES `usability_task_defs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_persona_defs` ADD CONSTRAINT `fk_persona_defs_version` FOREIGN KEY (`protocol_version_id`) REFERENCES `usability_protocol_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_persona_suites` ADD CONSTRAINT `fk_persona_suites_persona` FOREIGN KEY (`persona_id`) REFERENCES `usability_persona_defs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_persona_suites` ADD CONSTRAINT `fk_persona_suites_suite` FOREIGN KEY (`suite_id`) REFERENCES `usability_suite_defs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_questions` ADD CONSTRAINT `fk_questions_version` FOREIGN KEY (`protocol_version_id`) REFERENCES `usability_protocol_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_suite_defs` ADD CONSTRAINT `fk_suite_defs_version` FOREIGN KEY (`protocol_version_id`) REFERENCES `usability_protocol_versions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usability_task_defs` ADD CONSTRAINT `fk_task_defs_suite` FOREIGN KEY (`suite_id`) REFERENCES `usability_suite_defs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `events_session_seq` ON `usability_events` (`session_id`,`seq`);--> statement-breakpoint
CREATE INDEX `sessions_status_created_at` ON `usability_sessions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `sessions_persona` ON `usability_sessions` (`persona`);