-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "syncWithCalendar" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT;
