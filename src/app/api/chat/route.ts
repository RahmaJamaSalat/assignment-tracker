import { auth } from "@clerk/nextjs/server";
import { streamText, convertToCoreMessages } from "ai";
import { z } from "zod";

import {
  createAssignment,
  getAssignments,
  getAssignmentSummary,
  updateAssignment,
  getStudyAdvice,
  answerAssignmentQuestion,
} from "../../../ai/actions";
import { geminiProModel } from "@/ai";

export async function POST(request: Request) {
  const { messages } = await request.json();

  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);

  const currentDateTime = new Date().toISOString();
  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result = await streamText({
    model: geminiProModel,
    system: `Current date and time: ${currentDateTime} (${currentDateFormatted})
            You are a helpful assignment tracking and study assistant. Your role is to:
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
            
            IMPORTANT: After calling any tool, you MUST provide a detailed text response explaining the results to the user. Never just call a tool without following up with an explanation in natural language.
            
            Be friendly, encouraging, and practical. When students ask about their schedule or assignments, use the appropriate tools to fetch real data, then explain what you found. When giving advice, be specific and actionable.`,
    messages: coreMessages,
    tools: {
      getAssignments: {
        description:
          "Retrieve all assignments for the user. Returns the complete list of assignments. Supports optional filtering by status, priority, subject, or due date range.",
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
            .describe(
              "Filter by subject/course name (case-insensitive partial match)"
            ),
          dueDateRange: z
            .enum(["today", "this-week", "this-month", "overdue"])
            .optional()
            .describe("Filter by due date range"),
        }),
        execute: async (params) => {
          return await getAssignments({
            status: params.status,
            priority: params.priority,
            subject: params.subject,
            dueDateRange: params.dueDateRange,
          });
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
            .array(
              z.object({
                id: z.string(),
                title: z.string(),
                subject: z.string(),
                dueDate: z.string(),
                status: z.enum(["not-started", "in-progress", "completed"]),
                priority: z.enum(["low", "medium", "high"]),
              })
            )
            .describe("Array of relevant assignments to reference"),
        }),
        execute: async (params) => {
          return await answerAssignmentQuestion(params);
        },
      },
    },
    maxSteps: 10,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}
