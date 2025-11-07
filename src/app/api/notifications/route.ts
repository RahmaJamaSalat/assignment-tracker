import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/notifications - Fetch all notifications for the current user
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all notifications for the user, ordered by most recent first
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Generate notifications for upcoming assignments
export async function POST() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find assignments due within 3 days that are not completed
    // Using UTC dates for timezone-agnostic calculation
    const now = new Date();
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const threeDaysFromNowUTC = nowUTC + 3 * 24 * 60 * 60 * 1000;
    
    const threeDaysFromNow = new Date(threeDaysFromNowUTC);

    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        userId: user.id,
        status: { not: "completed" },
        dueDate: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
    });

    // Get existing notification IDs to avoid duplicates
    const existingNotifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        type: "deadline",
        assignmentId: { in: upcomingAssignments.map((a) => a.id) },
      },
      select: { assignmentId: true },
    });

    const existingAssignmentIds = new Set(
      existingNotifications.map((n) => n.assignmentId).filter((id): id is string => id !== null)
    );

    // Create notifications for assignments that don't have one yet
    const notificationsToCreate = upcomingAssignments
      .filter((assignment) => !existingAssignmentIds.has(assignment.id))
      .map((assignment) => {
        const dueDate = new Date(assignment.dueDate);
        
        // Calculate days using UTC dates (timezone-agnostic calendar days)
        const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
        const daysDiff = Math.ceil((dueUTC - nowUTC) / (1000 * 3600 * 24));

        let timeMessage = "";
        if (daysDiff === 0) {
          timeMessage = "Due today!";
        } else if (daysDiff === 1) {
          timeMessage = "Due tomorrow";
        } else {
          timeMessage = `Due in ${daysDiff} days`;
        }

        return {
          userId: user.id,
          assignmentId: assignment.id,
          message: `${assignment.title} - ${timeMessage}`,
          type: "deadline",
        };
      });

    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate,
      });
    }

    // Fetch all notifications to return
    const allNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      message: `Generated ${notificationsToCreate.length} new notifications`,
      notifications: allNotifications,
    });
  } catch (error) {
    console.error("Error generating notifications:", error);
    return NextResponse.json(
      { error: "Failed to generate notifications" },
      { status: 500 }
    );
  }
}
