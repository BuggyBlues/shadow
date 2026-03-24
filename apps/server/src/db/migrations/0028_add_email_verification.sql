-- Add email verification system

-- Create email_verifications table
CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"code" varchar(6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for email_verifications
CREATE INDEX "email_verifications_email_idx" ON "email_verifications" USING btree ("email");
CREATE INDEX "email_verifications_code_idx" ON "email_verifications" USING btree ("code");

-- Add email_verified column to users table
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
