CREATE TABLE "DailyAttendanceCode" (
    "id" SERIAL NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAttendanceCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyAttendanceCode_workDate_key" ON "DailyAttendanceCode"("workDate");

CREATE INDEX "DailyAttendanceCode_workDate_idx" ON "DailyAttendanceCode"("workDate");
