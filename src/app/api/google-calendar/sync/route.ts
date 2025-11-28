import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  assignmentToCalendarEvent,
} from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        calendarSyncEnabled: true,
        googleAccessToken: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.calendarSyncEnabled || !user.googleAccessToken) {
      return NextResponse.json(
        { error: 'Calendar sync is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (assignment.googleEventId) {
      return NextResponse.json(
        { error: 'Assignment is already synced with calendar' },
        { status: 400 }
      );
    }

    // Create calendar event
    const calendarEvent = assignmentToCalendarEvent(assignment);
    const eventId = await createCalendarEvent(user.id, calendarEvent);

    // Update assignment with event ID
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        googleEventId: eventId,
        syncWithCalendar: true,
      },
    });

    return NextResponse.json({
      success: true,
      eventId,
      message: 'Assignment synced to calendar',
    });
  } catch (error) {
    console.error('Error syncing assignment to calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync assignment to calendar' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        calendarSyncEnabled: true,
        googleAccessToken: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.calendarSyncEnabled || !user.googleAccessToken) {
      return NextResponse.json(
        { error: 'Calendar sync is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (!assignment.googleEventId) {
      return NextResponse.json(
        { error: 'Assignment is not synced with calendar' },
        { status: 400 }
      );
    }

    // Update calendar event
    const calendarEvent = assignmentToCalendarEvent(assignment);
    await updateCalendarEvent(user.id, assignment.googleEventId, calendarEvent);

    return NextResponse.json({
      success: true,
      message: 'Calendar event updated',
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        calendarSyncEnabled: true,
        googleAccessToken: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.calendarSyncEnabled || !user.googleAccessToken) {
      return NextResponse.json(
        { error: 'Calendar sync is not enabled' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.userId !== user.id) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    if (!assignment.googleEventId) {
      return NextResponse.json(
        { error: 'Assignment is not synced with calendar' },
        { status: 400 }
      );
    }

    // Delete calendar event
    await deleteCalendarEvent(user.id, assignment.googleEventId);

    // Clear the event ID from assignment
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        googleEventId: null,
        syncWithCalendar: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Calendar event deleted',
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
