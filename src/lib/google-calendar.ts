import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from './prisma';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getCalendarClient(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      calendarSyncEnabled: true,
    },
  });

  if (!user?.googleAccessToken || !user?.googleRefreshToken) {
    throw new Error('User not authenticated with Google Calendar');
  }

  if (!user.calendarSyncEnabled) {
    throw new Error('Calendar sync is disabled for this user');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  // Handle token refresh automatically
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleAccessToken: tokens.access_token },
      });
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export async function createCalendarEvent(
  userId: number,
  event: CalendarEvent
): Promise<string> {
  const calendar = await getCalendarClient(userId);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarId: true },
  });

  const calendarId = user?.googleCalendarId || 'primary';

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  return response.data.id!;
}

export async function updateCalendarEvent(
  userId: number,
  eventId: string,
  event: CalendarEvent
): Promise<void> {
  const calendar = await getCalendarClient(userId);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarId: true },
  });

  const calendarId = user?.googleCalendarId || 'primary';

  await calendar.events.update({
    calendarId,
    eventId,
    requestBody: event,
  });
}

export async function deleteCalendarEvent(
  userId: number,
  eventId: string
): Promise<void> {
  const calendar = await getCalendarClient(userId);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarId: true },
  });

  const calendarId = user?.googleCalendarId || 'primary';

  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

export function assignmentToCalendarEvent(assignment: {
  title: string;
  description: string;
  dueDate: Date;
  subject: string;
  priority: string;
}): CalendarEvent {
  // Set event to span 1 hour before the due date/time
  const endDate = new Date(assignment.dueDate);
  const startDate = new Date(endDate.getTime() - 60 * 60 * 1000); // 1 hour before

  const priorityEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  }[assignment.priority] || '🟡';

  return {
    summary: `${priorityEmoji} ${assignment.title}`,
    description: `Subject: ${assignment.subject}\n\n${assignment.description}\n\n📚 Assignment from Assignment Tracker`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'UTC',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  };
}
