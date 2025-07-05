import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../_lib/auth';
import { storage } from '../_lib/storage';

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const token = req.cookies.get('session')?.value || req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get aiMentorId from query parameters
    const aiMentorId = req.nextUrl.searchParams.get("aiMentorId");
    
    if (!aiMentorId) {
      return NextResponse.json({
        success: false,
        error: 'aiMentorId is required'
      }, { status: 400 });
    }

    // Fetch chat messages
    const messages = await storage.getChatMessages(
      payload.userId, 
      parseInt(aiMentorId), 
      50
    );

    // Return messages in chronological order
    return NextResponse.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch messages'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const token = req.cookies.get('session')?.value || req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { content, aiMentorId } = body;

    if (!content || !aiMentorId) {
      return NextResponse.json({
        success: false,
        error: 'Content and aiMentorId are required'
      }, { status: 400 });
    }

    // Check user's message limit
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    if (user.messagesUsed >= user.messagesLimit) {
      return NextResponse.json({
        success: false,
        error: 'Message limit reached'
      }, { status: 403 });
    }

    // Increment user's message count
    await storage.updateUser(payload.userId, {
      messagesUsed: user.messagesUsed + 1
    });

    // Save user message
    const userMessage = await storage.createChatMessage({
      userId: payload.userId,
      aiMentorId,
      content,
      role: 'user'
    });

    return NextResponse.json({
      success: true,
      data: userMessage
    });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create message'
    }, { status: 500 });
  }
}