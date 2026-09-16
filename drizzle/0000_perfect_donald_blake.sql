CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`registration` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_owner_registration` ON `books` (`owner`,`registration`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`data` text NOT NULL
);
