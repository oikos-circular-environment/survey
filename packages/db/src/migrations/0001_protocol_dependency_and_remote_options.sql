ALTER TABLE `usability_questions` MODIFY COLUMN `type` enum('SCALE','CHOICE','TEXT') NOT NULL;--> statement-breakpoint
ALTER TABLE `usability_questions` ADD `options_source` json;--> statement-breakpoint
ALTER TABLE `usability_questions` ADD `depends_on` json;--> statement-breakpoint
ALTER TABLE `usability_questions` DROP COLUMN `anchor_min`;--> statement-breakpoint
ALTER TABLE `usability_questions` DROP COLUMN `anchor_max`;--> statement-breakpoint
ALTER TABLE `usability_questions` DROP COLUMN `repeat_anchors`;--> statement-breakpoint
ALTER TABLE `usability_questions` DROP COLUMN `polarity`;