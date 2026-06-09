CREATE TABLE "WorkEntry" (
    "id" SERIAL NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "orderCode" VARCHAR(9) NOT NULL,
    "isTravel" BOOLEAN NOT NULL DEFAULT false,
    "process" VARCHAR(2) NOT NULL,
    "detail" VARCHAR(2) NOT NULL,
    "orderName" TEXT NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,
    "workContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorkEntry_workDate_idx" ON "WorkEntry"("workDate");
