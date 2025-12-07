import { auth } from "@clerk/nextjs/server";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { Prisma, Assignment } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateNotificationsForAssignment } from "@/lib/notifications";
import { geminiFlashModel } from ".";

/**
 * Get all assignments for the current user with optional filtering
 */
export async function getAssignments({
  status,
  priority,
  subject,
  dueDateRange,
}: {
  status?: "not-started" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
  subject?: string;
  dueDateRange?: "today" | "this-week" | "this-month" | "overdue";
}) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const where: Prisma.AssignmentWhereInput = { userId: user.id };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (subject) {
      where.subject = { contains: subject, mode: "insensitive" };
    }

    // Handle date range filtering
    if (dueDateRange) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (dueDateRange) {
        case "today":
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          where.dueDate = { gte: today, lt: tomorrow };
          break;
        case "this-week":
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          where.dueDate = { gte: today, lt: weekEnd };
          break;
        case "this-month":
          const monthEnd = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            1
          );
          where.dueDate = { gte: today, lt: monthEnd };
          break;
        case "overdue":
          where.dueDate = { lt: today };
          where.status = { not: "completed" };
          break;
      }
    }

    const assignments = await prisma.assignment.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    return {
      success: true,
      count: assignments.length,
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        subject: a.subject,
        dueDate: a.dueDate.toISOString(),
        status: a.status,
        priority: a.priority,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching assignments:", error);
    throw error;
  }
}

/**
 * Get detailed statistics and summary of user's assignments
 */
export async function getAssignmentSummary() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      total,
      notStarted,
      inProgress,
      completed,
      overdue,
      dueToday,
      dueThisWeek,
    ] = await Promise.all([
      prisma.assignment.count({ where: { userId: user.id } }),
      prisma.assignment.count({
        where: { userId: user.id, status: "not-started" },
      }),
      prisma.assignment.count({
        where: { userId: user.id, status: "in-progress" },
      }),
      prisma.assignment.count({
        where: { userId: user.id, status: "completed" },
      }),
      prisma.assignment.count({
        where: {
          userId: user.id,
          dueDate: { lt: today },
          status: { not: "completed" },
        },
      }),
      prisma.assignment.count({
        where: {
          userId: user.id,
          dueDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.assignment.count({
        where: {
          userId: user.id,
          dueDate: {
            gte: today,
            lt: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        userId: user.id,
        dueDate: { gte: today },
        status: { not: "completed" },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    return {
      success: true,
      summary: {
        total,
        byStatus: { notStarted, inProgress, completed },
        overdue,
        dueToday,
        dueThisWeek,
      },
      upcomingAssignments: upcomingAssignments.map((a) => ({
        title: a.title,
        subject: a.subject,
        dueDate: a.dueDate.toISOString(),
        priority: a.priority,
        status: a.status,
      })),
    };
  } catch (error) {
    console.error("Error fetching assignment summary:", error);
    throw error;
  }
}

/**
 * Create a new assignment with AI-enhanced details
 */
export async function createAssignment({
  title,
  description,
  subject,
  dueDate,
  priority,
}: {
  title: string;
  description?: string;
  subject?: string;
  dueDate: string;
  priority?: "low" | "medium" | "high";
}) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Use AI to enhance the assignment details if description is minimal or missing
    let enhancedDescription = description || "";
    let detectedSubject = subject || "";

    if (!description || description.length < 20 || !subject) {
      const result = await generateObject({
        model: geminiFlashModel,
        prompt: `You are helping a student organize their assignments. Given the following assignment information, provide enhanced details:

                Title: ${title}
                Description: ${description || "Not provided"}
                Subject: ${subject || "Not provided"}

                Please:
                1. Generate a helpful description if missing or too brief (focus on what the assignment might entail based on the title)
                2. Infer the subject/course if not provided (e.g., Math, Science, English, History, Computer Science, etc.)
                3. Keep descriptions concise but informative (2-3 sentences max)

                Only enhance missing information. If good information is already provided, keep it as is.`,
        schema: z.object({
          description: z.string().describe("Enhanced or original description"),
          subject: z
            .string()
            .describe("Detected or original subject/course name"),
        }),
      });

      const enhancedDetails = result.object as {
        description: string;
        subject: string;
      };
      enhancedDescription = description || enhancedDetails.description;
      detectedSubject = subject || enhancedDetails.subject;
    }

    // Create the assignment
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description: enhancedDescription,
        subject: detectedSubject,
        dueDate: new Date(dueDate),
        priority: priority || "medium",
        status: "not-started",
        userId: user.id,
      },
    });

    // Generate notifications for the assignment
    await generateNotificationsForAssignment(assignment.id, user.id);

    return {
      success: true,
      message: "Assignment created successfully",
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        subject: assignment.subject,
        dueDate: assignment.dueDate.toISOString(),
        priority: assignment.priority,
        status: assignment.status,
      },
    };
  } catch (error) {
    console.error("Error creating assignment:", error);
    throw error;
  }
}

/**
 * Update an existing assignment
 */
export async function updateAssignment({
  assignmentId,
  title,
  description,
  subject,
  dueDate,
  priority,
  status,
}: {
  assignmentId: string;
  title?: string;
  description?: string;
  subject?: string;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
  status?: "not-started" | "in-progress" | "completed";
}) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      throw new Error("Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify the assignment belongs to the user
    const existingAssignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, userId: user.id },
    });

    if (!existingAssignment) {
      throw new Error("Assignment not found or unauthorized");
    }

    // Build update data
    const updateData: Prisma.AssignmentUpdateInput = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (subject !== undefined) updateData.subject = subject;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return {
      success: true,
      message: "Assignment updated successfully",
      assignment: {
        id: updatedAssignment.id,
        title: updatedAssignment.title,
        description: updatedAssignment.description,
        subject: updatedAssignment.subject,
        dueDate: updatedAssignment.dueDate.toISOString(),
        priority: updatedAssignment.priority,
        status: updatedAssignment.status,
      },
    };
  } catch (error) {
    console.error("Error updating assignment:", error);
    throw error;
  }
}

/**
 * Get AI-powered study tips and time management advice
 */
export async function getStudyAdvice({
  assignmentCount,
  overdueCount,
  context,
}: {
  assignmentCount: number;
  overdueCount: number;
  context?: string;
}) {
  try {
    const { text } = await generateText({
      model: geminiFlashModel,
      prompt: `You are a helpful academic advisor assistant. A student has:
                - ${assignmentCount} total assignments
                - ${overdueCount} overdue assignments
                ${context ? `- Additional context: ${context}` : ""}

                Provide brief, actionable study tips and time management advice (2-3 short paragraphs max). Focus on:
                1. How to prioritize their work
                2. Strategies to catch up if they have overdue assignments
                3. General tips for staying organized

                Be encouraging and practical.`,
    });

    return {
      success: true,
      advice: text,
    };
  } catch (error) {
    console.error("Error generating study advice:", error);
    throw error;
  }
}

/**
 * Answer general questions about assignments and schedules
 */
export async function answerAssignmentQuestion({
  question,
  assignments,
}: {
  question: string;
  assignments: Assignment[];
}) {
  try {
    const assignmentContext = assignments
      .map(
        (a) =>
          `- ${a.title} (${a.subject}) - Due: ${new Date(
            a.dueDate
          ).toLocaleDateString()}, Status: ${a.status}, Priority: ${a.priority}`
      )
      .join("\n");

    const { text } = await generateText({
      model: geminiFlashModel,
      prompt: `You are a helpful assignment tracking assistant. A student is asking about their assignments.

                Current assignments:
                ${assignmentContext || "No assignments yet"}

                Student's question: ${question}

                Provide a helpful, concise answer based on their assignments. If the question is about specific assignments, reference them directly. If they're asking for advice, be encouraging and practical.`,
    });

    return {
      success: true,
      answer: text,
    };
  } catch (error) {
    console.error("Error answering question:", error);
    throw error;
  }
}
