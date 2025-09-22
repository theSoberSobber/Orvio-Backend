-- First check if the column exists and is an integer
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'cashbackPoints'
        AND data_type = 'integer'
    ) THEN
        -- Alter column to NUMERIC(10,2) to support decimal values
        ALTER TABLE "user" ALTER COLUMN "cashbackPoints" TYPE NUMERIC(10,2);
    ELSIF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'user' 
        AND column_name = 'cashbackPoints'
    ) THEN
        -- Add cashbackPoints column if it doesn't exist
        ALTER TABLE "user" ADD COLUMN "cashbackPoints" NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- Check the column was altered successfully
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user' AND column_name = 'cashbackPoints';

-- Optional: Update specific users with initial cashback points (example)
-- UPDATE "user" SET "cashbackPoints" = 50 WHERE "phoneNumber" = '+911234567890';

-- Optional: View all users with their credits and cashback points
SELECT id, "phoneNumber", credits, "cashbackPoints", "creditMode" FROM "user"; 