import { auth } from "@clerk/nextjs/server";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  createAssignment,
  getAssignments,
  getAssignmentSummary,
  updateAssignment,
  getStudyAdvice,
  answerAssignmentQuestion,
} from "../../../ai/actions";

export async function POST(request: Request) {
  const { messages }: { messages: Array<Message> } = await request.json();

  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0
  );

  const result = await streamText({
    model: geminiProModel,
    system: `You are a helpful assignment tracking and study assistant. Your role is to:
- Help students manage their assignments and track deadlines
- Answer questions about their current assignments and schedules
- Provide study tips and time management advice
- Create, update, and organize assignments
- Provide insights about workload and upcoming deadlines

You have access to tools to:
1. View assignments with various filters
2. Get summaries and statistics about assignments
3. Create new assignments with AI-enhanced details
4. Update existing assignments
5. Provide personalized study advice
6. Answer specific questions about assignments

Be friendly, encouraging, and practical. When students ask about their schedule or assignments, use the appropriate tools to fetch real data. When giving advice, be specific and actionable.`,
    messages: coreMessages,
    tools: {
      getAssignments: {
        description:
          "Retrieve assignments for the user. Use filters to narrow down results (e.g., by status, priority, subject, or time range). Use this when the user asks about their assignments, schedule, or what's due.",
        parameters: z.object({
          status: z
            .enum(["not-started", "in-progress", "completed"])
            .optional()
            .describe("Filter by assignment status"),
          priority: z
            .enum(["low", "medium", "high"])
            .optional()
            .describe("Filter by priority level"),
          subject: z
            .string()
            .optional()
            .describe("Filter by subject or course name"),
          dueDateRange: z
            .enum(["today", "this-week", "this-month", "overdue"])
            .optional()
            .describe("Filter by when assignments are due"),
        }),
        execute: async (params) => {
          return await getAssignments(params);
        },
      },
      getAssignmentSummary: {
        description:
          "Get a comprehensive overview of the user's assignments including counts by status, overdue assignments, and upcoming deadlines. Use this when user asks for an overview, summary, or dashboard of their work.",
        parameters: z.object({}),
        execute: async () => {
          return await getAssignmentSummary();
        },
      },
      createAssignment: {
        description:
          "Create a new assignment. The AI will enhance minimal descriptions and infer subjects if not provided. Require at least a title and due date.",
        parameters: z.object({
          title: z.string().describe("The assignment title or name"),
          description: z
            .string()
            .optional()
            .describe("Details about what the assignment involves"),
          subject: z
            .string()
            .optional()
            .describe("The course or subject (e.g., Math, English, History)"),
          dueDate: z
            .string()
            .describe("Due date in ISO format (YYYY-MM-DD or full ISO string)"),
          priority: z
            .enum(["low", "medium", "high"])
            .optional()
            .describe("Priority level, defaults to medium"),
        }),
        execute: async (params) => {
          return await createAssignment(params);
        },
      },
      updateAssignment: {
        description:
          "Update an existing assignment's details (title, description, subject, due date, priority, or status). Use this when user wants to modify, change status, or mark an assignment as complete.",
        parameters: z.object({
          assignmentId: z
            .string()
            .describe("The ID of the assignment to update"),
          title: z.string().optional().describe("New title"),
          description: z.string().optional().describe("New description"),
          subject: z.string().optional().describe("New subject"),
          dueDate: z.string().optional().describe("New due date in ISO format"),
          priority: z
            .enum(["low", "medium", "high"])
            .optional()
            .describe("New priority level"),
          status: z
            .enum(["not-started", "in-progress", "completed"])
            .optional()
            .describe("New status"),
        }),
        execute: async (params) => {
          return await updateAssignment(params);
        },
      },
      getStudyAdvice: {
        description:
          "Get personalized study tips and time management advice based on the user's current workload. Use this when user asks for study tips, advice on managing their work, or help with time management.",
        parameters: z.object({
          assignmentCount: z
            .number()
            .describe("Total number of assignments the user has"),
          overdueCount: z.number().describe("Number of overdue assignments"),
          context: z
            .string()
            .optional()
            .describe("Additional context about the user's situation"),
        }),
        execute: async (params) => {
          return await getStudyAdvice(params);
        },
      },
      answerAssignmentQuestion: {
        description:
          "Answer specific questions about assignments using the provided assignment data. Use this for analytical questions about the user's schedule.",
        parameters: z.object({
          question: z
            .string()
            .describe("The user's question about their assignments"),
          assignments: z
            .array(z.any())
            .describe("Array of relevant assignments to reference"),
        }),
        execute: async (params) => {
          return await answerAssignmentQuestion(params);
        },
      },
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}
