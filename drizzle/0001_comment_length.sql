ALTER TABLE "comments" DROP CONSTRAINT "comments_body_length";
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_body_length" CHECK (char_length("body") between 1 and 1000);
