import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generateNotificationsForAssignment } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";

// GET /api/assignments - Fetch all assignments for the current user
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch all assignments for the user
    const assignments = await prisma.assignment.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST /api/assignments - Create a new assignment
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      // Create user if doesn't exist
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
        },
      });
    }

    // Parse request body
    const body = await request.json();
    const { title, description, subject, dueDate, priority } = body;

    // Validate required fields
    if (!title || !dueDate) {
      return NextResponse.json(
        { error: "Title and due date are required" },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: description || "",
        subject: subject || "",
        dueDate: new Date(dueDate),
        priority: priority || "medium",
        status: "not-started",
        userId: user.id,
      },
    });

    // Generate notification for the new assignment if it's due soon
    await generateNotificationsForAssignment(assignment.id, user.id);

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
