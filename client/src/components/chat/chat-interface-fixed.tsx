import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/lib/auth";
import { AiMentorSelector } from "@/components/mentors/ai-mentor-selector";
import { MessageCircle, Send } from "lucide-react";
import { AiMentor, ChatMessage } from "@/types";
import { useToast } from "@/hooks/use-toast";

export function ChatInterface() {
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedResponsesRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage, lastMessage } = useWebSocket();

  const { data: aiMentors = [] } = useQuery<AiMentor[]>({
    queryKey: ['/api/ai-mentors'],
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', selectedMentorId],
    queryFn: async () => {
      if (!selectedMentorId) return [];
      const response = await apiRequest('GET', `/api/chat?aiMentorId=${selectedMentorId}`);
      return response.json();
    },
    enabled: !!selectedMentorId && !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; aiMentorId: number; role: 'user' | 'assistant' }) => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      const response = await apiRequest('POST', '/api/chat', data);
      return response.json();
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/chat', selectedMentorId] });

      // Get previous messages
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['/api/chat', selectedMentorId]);

      // Optimistically add user message
      if (previousMessages) {
        const optimisticMessage: ChatMessage = {
          id: Date.now(),
          userId: user!.id,
          aiMentorId: data.aiMentorId,
          content: data.content,
          role: data.role,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData(['/api/chat', selectedMentorId], [...previousMessages, optimisticMessage]);
      }

      setIsTyping(true);
      return { previousMessages };
    },
    onError: (error: any, data, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(['/api/chat', selectedMentorId], context.previousMessages);
      }
      setIsTyping(false);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Only refresh user data, not chat messages (WebSocket will handle that)
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    }
  });

  // Auto-select first mentor when available
  useEffect(() => {
    if (aiMentors.length > 0 && !selectedMentorId) {
      setSelectedMentorId(aiMentors[0].id);
    }
  }, [aiMentors, selectedMentorId]);

  // Handle WebSocket AI responses - with optimistic updates
  useEffect(() => {
    if (lastMessage?.type === 'ai_response' && 
        lastMessage.mentorId === selectedMentorId &&
        lastMessage.content &&
        lastMessage.timestamp) {
      
      const responseKey = `${lastMessage.mentorId}-${lastMessage.timestamp}`;
      
      // Prevent processing the same response multiple times
      if (!processedResponsesRef.current.has(responseKey)) {
        processedResponsesRef.current.add(responseKey);
        setIsTyping(false);
        
        // Optimistically add AI response to avoid flash
        const currentMessages = queryClient.getQueryData<ChatMessage[]>(['/api/chat', selectedMentorId]);
        if (currentMessages) {
          const aiMessage: ChatMessage = {
            id: Date.now() + 1, // Temporary unique ID
            userId: user!.id,
            aiMentorId: lastMessage.mentorId,
            content: lastMessage.content,
            role: 'assistant',
            createdAt: lastMessage.timestamp,
          };
          queryClient.setQueryData(['/api/chat', selectedMentorId], [...currentMessages, aiMessage]);
        }
        
        // Sync with server after a short delay to get real message ID
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/chat', selectedMentorId] });
        }, 500);
      }
    }
  }, [lastMessage?.type, lastMessage?.mentorId, lastMessage?.content, lastMessage?.timestamp, selectedMentorId, queryClient, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer && messages?.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [messages?.length]);

  const handleSendMessage = useCallback(async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedMentorId || !user || sendMessageMutation.isPending) return;

    // Check message limit
    if (user.messagesUsed >= user.messagesLimit) {
      toast({
        title: "Message limit reached",
        description: "Upgrade your plan to send more messages",
        variant: "destructive",
      });
      return;
    }

    const content = messageInput.trim();
    setMessageInput("");
    
    try {
      // Send user message
      await sendMessageMutation.mutateAsync({
        content,
        aiMentorId: selectedMentorId,
        role: 'user',
      });

      // Send to WebSocket for AI response
      setIsTyping(true);
      sendMessage({
        type: 'chat_message',
        mentorId: selectedMentorId,
        content,
        userId: user.id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsTyping(false);
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  }, [messageInput, selectedMentorId, user, sendMessageMutation, toast, sendMessage]);

  const selectedMentor = aiMentors.find(m => m.id === selectedMentorId);

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Mentors</h2>
        <p className="text-slate-600">Please log in to chat with mentors.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Chat Header */}
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">AI Mentors</h2>
          {/* Message Usage Counter */}
          <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full">
            <MessageCircle className="text-slate-500 h-4 w-4" />
            <span className="text-sm text-slate-600">{user?.messagesUsed || 0}</span>
            <span className="text-sm text-slate-400">/</span>
            <span className="text-sm text-slate-600">{user?.messagesLimit || 0}</span>
          </div>
        </div>
        
        {/* AI Mentor Selection */}
        <AiMentorSelector
          mentors={aiMentors}
          selectedId={selectedMentorId}
          onSelect={setSelectedMentorId}
        />
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 scroll-smooth" id="chatMessages">
        {messages.length === 0 && selectedMentor && (
          <div className="flex items-start space-x-3">
            <img 
              src={selectedMentor.avatar} 
              alt={selectedMentor.name} 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3 max-w-xs lg:max-w-md">
              <div className="text-xs font-medium text-slate-600 mb-1">{selectedMentor.name}</div>
              <p className="text-sm text-slate-800">
                Welcome! I'm {selectedMentor.name}, and I'm here to guide you. {selectedMentor.personality} 
                What's on your mind today?
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.role === 'user' ? 'justify-end' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <img 
                src={selectedMentor?.avatar} 
                alt={selectedMentor?.name} 
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div
              className={`rounded-2xl px-4 py-3 max-w-xs lg:max-w-md ${
                message.role === 'user'
                  ? 'bg-primary text-white rounded-tr-md'
                  : 'bg-slate-100 rounded-tl-md'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="text-xs font-medium text-slate-600 mb-1">
                  {selectedMentor?.name}
                </div>
              )}
              <p className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-slate-800'}`}>
                {message.content}
              </p>
            </div>
            {message.role === 'user' && (
              <img 
                src={user?.profileImage || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50`} 
                alt="You" 
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-start space-x-3">
            <img 
              src={selectedMentor?.avatar} 
              alt={selectedMentor?.name} 
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full typing-indicator"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full typing-indicator" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full typing-indicator" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-200 p-4">
        <form onSubmit={handleSendMessage} className="space-y-3">
          <div className="relative">
            <Textarea
              placeholder={`Ask ${selectedMentor?.name || 'your mentor'} for guidance...`}
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="min-h-[60px] max-h-[120px] pr-12 resize-none overflow-y-auto"
              disabled={sendMessageMutation.isPending || !selectedMentorId}
              rows={1}
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-2 bottom-2 h-8 w-8 p-0"
              disabled={!messageInput.trim() || sendMessageMutation.isPending || !selectedMentorId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Press Enter to send</span>
          <span>
            {user ? user.messagesLimit - user.messagesUsed : 0} messages remaining this month
          </span>
        </div>
      </div>
    </div>
  );
}