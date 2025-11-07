import prisma from "@/lib/prisma";

export async function generateNotificationsForAssignment(
  assignmentId: string,
  userId: number
) {
  try {
    // Get the assignment
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.status === "completed") {
      return;
    }

    // Check if notification already exists for this assignment
    const existingNotification = await prisma.notification.findFirst({
      where: {
        assignmentId: assignmentId,
        userId: userId,
        type: "deadline",
      },
    });

    // Calculate days until due using UTC dates (timezone-agnostic calendar days)
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    // Get start of day in UTC for both dates
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    
    // Calculate difference in days
    const daysDiff = Math.ceil((dueUTC - nowUTC) / (1000 * 3600 * 24));

    // Only create notification if due within 3 days and not past due
    if (daysDiff <= 3 && daysDiff >= 0) {
      let timeMessage = "";
      if (daysDiff === 0) {
        timeMessage = "Due today!";
      } else if (daysDiff === 1) {
        timeMessage = "Due tomorrow";
      } else {
        timeMessage = `Due in ${daysDiff} days`;
      }

      if (existingNotification) {
        // Update existing notification
        await prisma.notification.update({
          where: { id: existingNotification.id },
          data: {
            message: `${assignment.title} - ${timeMessage}`,
            read: false, // Mark as unread since it's updated
          },
        });
      } else {
        // Create new notification
        await prisma.notification.create({
          data: {
            userId: userId,
            assignmentId: assignmentId,
            message: `${assignment.title} - ${timeMessage}`,
            type: "deadline",
          },
        });
      }
    } else if (existingNotification && daysDiff < 0) {
      // Delete notification if assignment is past due
      await prisma.notification.delete({
        where: { id: existingNotification.id },
      });
    }
  } catch (error) {
    console.error("Error generating notification for assignment:", error);
  }
}
