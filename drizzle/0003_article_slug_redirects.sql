CREATE TABLE "article_slug_redirects" (
	"slug" text PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_slug_redirects" ADD CONSTRAINT "article_slug_redirects_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE no action ON UPDATE no action;
