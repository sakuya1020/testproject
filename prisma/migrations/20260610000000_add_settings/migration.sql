CREATE TABLE "UserSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "opNo" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderPreset" (
    "id" SERIAL NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "orderNo" VARCHAR(9) NOT NULL,
    "orderName" TEXT NOT NULL,
    "time1Start" VARCHAR(5) NOT NULL,
    "time1End" VARCHAR(5) NOT NULL,
    "time2Start" VARCHAR(5) NOT NULL,
    "time2End" VARCHAR(5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderPreset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderPreset_displayOrder_idx" ON "OrderPreset"("displayOrder");
