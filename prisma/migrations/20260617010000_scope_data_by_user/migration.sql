INSERT INTO "User" ("loginId", "passwordHash", "name", "opNo", "isAdmin", "updatedAt")
VALUES (
  'admin',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  '管理者',
  'admin',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("loginId") DO NOTHING;

ALTER TABLE "WorkEntry" ADD COLUMN "userId" INTEGER;
ALTER TABLE "DailyAttendanceCode" ADD COLUMN "userId" INTEGER;
ALTER TABLE "UserSetting" ADD COLUMN "userId" INTEGER;
ALTER TABLE "OrderPreset" ADD COLUMN "userId" INTEGER;

UPDATE "WorkEntry"
SET "userId" = (SELECT "id" FROM "User" WHERE "loginId" = 'admin')
WHERE "userId" IS NULL;

UPDATE "DailyAttendanceCode"
SET "userId" = (SELECT "id" FROM "User" WHERE "loginId" = 'admin')
WHERE "userId" IS NULL;

UPDATE "UserSetting"
SET "userId" = (SELECT "id" FROM "User" WHERE "loginId" = 'admin')
WHERE "userId" IS NULL;

UPDATE "OrderPreset"
SET "userId" = (SELECT "id" FROM "User" WHERE "loginId" = 'admin')
WHERE "userId" IS NULL;

ALTER TABLE "WorkEntry" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "DailyAttendanceCode" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "OrderPreset" ALTER COLUMN "userId" SET NOT NULL;

CREATE SEQUENCE IF NOT EXISTS "UserSetting_id_seq";
SELECT setval('"UserSetting_id_seq"', COALESCE((SELECT MAX("id") FROM "UserSetting"), 0) + 1, false);
ALTER TABLE "UserSetting" ALTER COLUMN "id" SET DEFAULT nextval('"UserSetting_id_seq"');
ALTER SEQUENCE "UserSetting_id_seq" OWNED BY "UserSetting"."id";
ALTER TABLE "UserSetting" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "DailyAttendanceCode_workDate_key";
DROP INDEX IF EXISTS "DailyAttendanceCode_workDate_idx";
DROP INDEX IF EXISTS "WorkEntry_workDate_idx";
DROP INDEX IF EXISTS "OrderPreset_displayOrder_idx";

CREATE INDEX "WorkEntry_userId_workDate_idx" ON "WorkEntry"("userId", "workDate");
CREATE UNIQUE INDEX "DailyAttendanceCode_userId_workDate_key" ON "DailyAttendanceCode"("userId", "workDate");
CREATE INDEX "DailyAttendanceCode_userId_workDate_idx" ON "DailyAttendanceCode"("userId", "workDate");
CREATE UNIQUE INDEX "UserSetting_userId_key" ON "UserSetting"("userId");
CREATE INDEX "OrderPreset_userId_displayOrder_idx" ON "OrderPreset"("userId", "displayOrder");

ALTER TABLE "WorkEntry" ADD CONSTRAINT "WorkEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyAttendanceCode" ADD CONSTRAINT "DailyAttendanceCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderPreset" ADD CONSTRAINT "OrderPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
