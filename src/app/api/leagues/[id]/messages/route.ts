/**
 * GET  /api/leagues/[id]/messages  - Fetch messages for the user
 * POST /api/leagues/[id]/messages  - Send a message
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getMessagesForUser, sendMessage, type MessageFilter } from '@/lib/services/messages';


function isValidPhotoUrl(url: string | undefined): boolean {
  if (!url) return true; // No photo is valid
  // Validate that URL is from Supabase storage with expected path
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  
  const expectedPrefix = `${supabaseUrl}/storage/v1/object/public/team-chat-photos/`;
  return url.startsWith(expectedPrefix) && 
         url.includes('/') && 
         !url.includes('javascript:') && 
         !url.includes('data:');
}
// ============================================================================
// GET Handler - Fetch messages
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const teamId = searchParams.get('team_id') || undefined;
    const filter = (searchParams.get('filter') as MessageFilter) || undefined;
    const adminView = searchParams.get('admin_view') === 'true';

    const messages = await getMessagesForUser(leagueId, userId, {
      cursor,
      limit,
      teamId,
      filter,
      adminView,
    });

    return NextResponse.json({
      success: true,
      data: {
        messages,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    console.error('Error in messages GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Send a message
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { content, team_id, message_type, visibility, is_important, deep_link, parent_message_id, photo_url } = body;

if ((!content || typeof content !== 'string' || content.trim().length === 0) && !photo_url) {
  return NextResponse.json(
    { error: 'Message must contain text or photo' },
    { status: 400 }
  );
}

// Validate photo_url if provided
if (photo_url && !isValidPhotoUrl(photo_url)) {
  return NextResponse.json(
    { error: 'Invalid photo URL' },
    { status: 400 }
  );
}

    const message = await sendMessage(leagueId, userId, {
      content: content?.trim() || '',
      teamId: team_id,
      messageType: message_type,
      visibility,
      isImportant: is_important,
      parentMessageId: parent_message_id,
      deepLink: deep_link,
      photoUrl: photo_url,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Error in messages POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
