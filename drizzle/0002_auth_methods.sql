ALTER TYPE "public"."identity_provider" ADD VALUE 'gmail';--> statement-breakpoint
ALTER TYPE "public"."identity_provider" ADD VALUE 'magiclink';--> statement-breakpoint
ALTER TYPE "public"."identity_provider" ADD VALUE 'microsoft';--> statement-breakpoint
ALTER TYPE "public"."identity_provider" ADD VALUE 'guest';--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
