CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "clockIn" TEXT NOT NULL,
    "clockOut" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
