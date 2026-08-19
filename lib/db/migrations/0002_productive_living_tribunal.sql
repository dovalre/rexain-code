CREATE TABLE "credit_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"type" varchar NOT NULL,
	"amount" numeric(12, 6) NOT NULL,
	"balance_after" numeric(12, 6) NOT NULL,
	"description" text,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"generation_id" text,
	"chatId" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "credit" numeric(12, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transaction_userId_idx" ON "credit_transaction" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "credit_transaction_type_idx" ON "credit_transaction" USING btree ("type");