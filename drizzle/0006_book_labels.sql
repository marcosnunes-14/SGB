CREATE TABLE `book_labels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_id` text NOT NULL,
	`copy_number` integer NOT NULL,
	`owner` text NOT NULL,
	`institution_code` text NOT NULL,
	`code` text GENERATED ALWAYS AS ('SGB-' || institution_code || '-' || printf('%06d', id)) VIRTUAL NOT NULL,
	`print_count` integer DEFAULT 0 NOT NULL,
	`last_printed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `book_labels_book_copy` ON `book_labels` (`book_id`,`copy_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `book_labels_code` ON `book_labels` (`code`);--> statement-breakpoint
CREATE INDEX `book_labels_owner` ON `book_labels` (`owner`);--> statement-breakpoint
CREATE TABLE `label_print_events` (
	`job_id` text NOT NULL,
	`label_id` integer NOT NULL,
	`printed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`label_id`) REFERENCES `book_labels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `label_print_events_job_label` ON `label_print_events` (`job_id`,`label_id`);--> statement-breakpoint
-- Uma identidade por exemplar declarado, sem alterar os livros existentes.
INSERT INTO book_labels(book_id,copy_number,owner,institution_code)
WITH RECURSIVE copies(book_id,owner,n,total) AS (
 SELECT id,owner,1,MAX(1,CAST(COALESCE(json_extract(data,'$.copies'),1) AS INTEGER)) FROM books
 UNION ALL SELECT book_id,owner,n+1,total FROM copies WHERE n<total
)
SELECT book_id,n,owner,COALESCE((SELECT replace(code,'SGB-','') FROM institutions WHERE id=owner),'0000') FROM copies ORDER BY book_id,n;
--> statement-breakpoint
CREATE TRIGGER books_create_label AFTER INSERT ON books BEGIN
 INSERT INTO book_labels(book_id,copy_number,owner,institution_code)
 WITH RECURSIVE copies(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM copies WHERE n<MAX(1,CAST(COALESCE(json_extract(NEW.data,'$.copies'),1) AS INTEGER)))
 SELECT NEW.id,n,NEW.owner,COALESCE((SELECT replace(code,'SGB-','') FROM institutions WHERE id=NEW.owner),'0000') FROM copies;
END;
--> statement-breakpoint
-- Ao aumentar a quantidade, cria apenas identidades novas; ao reduzir, conserva as anteriores.
CREATE TRIGGER books_add_labels AFTER UPDATE OF data ON books
 WHEN MAX(1,CAST(COALESCE(json_extract(NEW.data,'$.copies'),1) AS INTEGER))>MAX(1,CAST(COALESCE(json_extract(OLD.data,'$.copies'),1) AS INTEGER)) BEGIN
 INSERT OR IGNORE INTO book_labels(book_id,copy_number,owner,institution_code)
 WITH RECURSIVE copies(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM copies WHERE n<MAX(1,CAST(COALESCE(json_extract(NEW.data,'$.copies'),1) AS INTEGER)))
 SELECT NEW.id,n,NEW.owner,COALESCE((SELECT replace(code,'SGB-','') FROM institutions WHERE id=NEW.owner),'0000') FROM copies WHERE NOT EXISTS (SELECT 1 FROM book_labels WHERE book_id=NEW.id AND copy_number=n);
END;
--> statement-breakpoint
CREATE TRIGGER book_labels_identity_immutable BEFORE UPDATE OF id,book_id,copy_number,owner,institution_code ON book_labels
 WHEN NEW.id IS NOT OLD.id OR NEW.book_id IS NOT OLD.book_id OR NEW.copy_number IS NOT OLD.copy_number OR NEW.owner IS NOT OLD.owner OR NEW.institution_code IS NOT OLD.institution_code
 BEGIN SELECT RAISE(ABORT,'A identidade da etiqueta não pode ser alterada'); END;
--> statement-breakpoint
CREATE TRIGGER label_print_events_count AFTER INSERT ON label_print_events BEGIN
 UPDATE book_labels SET print_count=print_count+1,last_printed_at=NEW.printed_at WHERE id=NEW.label_id;
END;
