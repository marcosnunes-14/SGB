CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`grade` text NOT NULL,
	`name_key` text NOT NULL,
	`grade_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_owner_identity` ON `students` (`owner`,`name_key`,`grade_key`);--> statement-breakpoint
CREATE INDEX `students_owner_name` ON `students` (`owner`,`name_key`);--> statement-breakpoint
ALTER TABLE `loans` ADD `student_id` integer;--> statement-breakpoint
CREATE INDEX `loans_owner_student` ON `loans` (`owner`,`student_id`);