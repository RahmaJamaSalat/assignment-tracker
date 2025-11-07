import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/notifications/[id] - Mark notification as read/unread
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

    // Verify notification belongs to user
    const existingNotification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (existingNotification.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        read: body.read !== undefined ? body.read : true,
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
    });

    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete a notification
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

    // Verify notification belongs to user
    const existingNotification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    if (existingNotification.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
