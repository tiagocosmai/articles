ALTER TABLE "article_locales" ADD COLUMN "objective" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE TABLE "article_linkedin_posts" (
	"article_id" uuid NOT NULL,
	"locale" "locale" NOT NULL,
	"body" text NOT NULL,
	CONSTRAINT "article_linkedin_posts_article_id_locale_pk" PRIMARY KEY("article_id","locale")
);
--> statement-breakpoint
ALTER TABLE "article_linkedin_posts" ADD CONSTRAINT "article_linkedin_posts_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
