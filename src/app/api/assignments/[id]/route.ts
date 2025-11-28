import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateNotificationsForAssignment } from "@/lib/notifications";
import { updateCalendarEvent, deleteCalendarEvent, assignmentToCalendarEvent } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/assignments/[id] - Update an assignment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    // Verify assignment belongs to user
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (existingAssignment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update assignment
    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.subject !== undefined && { subject: body.subject }),
        ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
        ...(body.status && { status: body.status }),
        ...(body.priority && { priority: body.priority }),
      },
    });

    // Update notification for the assignment
    await generateNotificationsForAssignment(updatedAssignment.id, user.id);

    // Update Google Calendar event if synced
    try {
      if (updatedAssignment.googleEventId && updatedAssignment.syncWithCalendar) {
        const userWithCalendar = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            calendarSyncEnabled: true,
            googleAccessToken: true,
          },
        });

        if (userWithCalendar?.calendarSyncEnabled && userWithCalendar.googleAccessToken) {
          const calendarEvent = assignmentToCalendarEvent(updatedAssignment);
          await updateCalendarEvent(user.id, updatedAssignment.googleEventId, calendarEvent);
        }
      }
    } catch (calendarError) {
      console.error('Failed to update calendar event:', calendarError);
      // Don't fail the assignment update if calendar sync fails
    }

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/[id] - Delete an assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify assignment belongs to user
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    if (existingAssignment.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete Google Calendar event if synced
    try {
      if (existingAssignment.googleEventId) {
        const userWithCalendar = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            calendarSyncEnabled: true,
            googleAccessToken: true,
          },
        });

        if (userWithCalendar?.calendarSyncEnabled && userWithCalendar.googleAccessToken) {
          await deleteCalendarEvent(user.id, existingAssignment.googleEventId);
        }
      }
    } catch (calendarError) {
      console.error('Failed to delete calendar event:', calendarError);
      // Continue with assignment deletion even if calendar deletion fails
    }

    // Delete assignment
    await prisma.assignment.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
