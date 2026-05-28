-- CreateTable
CREATE TABLE "QueueCounter" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "dateStr" TEXT NOT NULL,
    "lastToken" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QueueCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QueueCounter_doctorId_dateStr_key" ON "QueueCounter"("doctorId", "dateStr");
