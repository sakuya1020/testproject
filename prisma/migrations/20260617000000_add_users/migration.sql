CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "loginId" VARCHAR(50) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opNo" VARCHAR(20) NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
CREATE INDEX "User_loginId_idx" ON "User"("loginId");
