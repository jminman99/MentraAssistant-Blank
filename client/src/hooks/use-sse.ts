import { useState, useCallback, useRef, useEffect } from 'react';

interface SSEMessage {
  type: 'chunk' | 'complete' | 'error';
  content: string;
}

interface UseSSEOptions {
  onMessage?: (message: SSEMessage) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startStream = useCallback(async (
    endpoint: string, 
    data: any, 
    options: UseSSEOptions = {}
  ) => {
    if (isStreaming) {
      console.warn('Stream already in progress');
      return;
    }

    setIsStreaming(true);

    try {
      // Make POST request to initiate streaming
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const message: SSEMessage = JSON.parse(data);
                
                if (message.type === 'complete') {
                  setIsStreaming(false);
                  options.onComplete?.();
                  return;
                } else if (message.type === 'error') {
                  setIsStreaming(false);
                  options.onError?.(message.content);
                  return;
                } else {
                  options.onMessage?.(message);
                }
              } catch (e) {
                console.error('Failed to parse SSE message:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('SSE stream error:', error);
      setIsStreaming(false);
      options.onError?.(error instanceof Error ? error.message : 'Stream failed');
    }
  }, [isStreaming]);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    startStream,
    stopStream,
  };
}