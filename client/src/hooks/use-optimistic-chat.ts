import { useState, useCallback } from 'react';
import { ChatMessage } from '@/types';

interface OptimisticMessage extends ChatMessage {
  isOptimistic?: boolean;
  isStreaming?: boolean;
}

export function useOptimisticChat() {
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  const addOptimisticUserMessage = useCallback((
    content: string,
    userId: number,
    mentorId: number
  ): OptimisticMessage => {
    return {
      id: Date.now(),
      userId,
      aiMentorId: mentorId,
      content,
      role: 'user',
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
  }, []);

  const startStreamingResponse = useCallback((mentorId: number, userId: number) => {
    setIsStreaming(true);
    setStreamingContent('');
    
    return {
      id: Date.now() + 1,
      userId,
      aiMentorId: mentorId,
      content: '',
      role: 'assistant' as const,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      isStreaming: true,
    };
  }, []);

  const updateStreamingContent = useCallback((chunk: string) => {
    setStreamingContent(prev => prev + chunk);
  }, []);

  const completeStreaming = useCallback(() => {
    setIsStreaming(false);
    const finalContent = streamingContent;
    setStreamingContent('');
    return finalContent;
  }, [streamingContent]);

  return {
    streamingContent,
    isStreaming,
    addOptimisticUserMessage,
    startStreamingResponse,
    updateStreamingContent,
    completeStreaming,
  };
}