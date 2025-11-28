import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTokensFromCode } from '@/lib/google-calendar';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.redirect(
        new URL('/sign-in', request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Calendar connection failed')}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=No authorization code', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/?error=User not found', request.url)
      );
    }

    // Save tokens to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        calendarSyncEnabled: true,
      },
    });

    return NextResponse.redirect(
      new URL('/?success=Calendar connected successfully', request.url)
    );
  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    return NextResponse.redirect(
      new URL('/?error=Failed to connect calendar', request.url)
    );
  }
}
