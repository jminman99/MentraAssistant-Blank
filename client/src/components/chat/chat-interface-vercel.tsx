import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-hook";
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { AiMentorSelector } from "@/components/mentors/ai-mentor-selector";
import { MessageCircle, Send } from "lucide-react";
import { AiMentor, ChatMessage } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { vercelApiClient } from "@/lib/api-client-vercel";
export function ChatInterfaceVercel() {
  const [selectedMentorId, setSelectedMentorId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { getToken } = useClerkAuth();
  const { toast } = useToast();

  // Token provider is now handled globally in ClerkTokenProvider component



  // Fetch AI mentors with defensive data extraction
  const { 
    data: aiMentors = [], 
    isLoading: isLoadingMentors,
    error: mentorsError 
  } = useQuery<AiMentor[]>({
    queryKey: ['/api/ai-mentors'],
    queryFn: () => vercelApiClient.getAiMentors(),
    select: (res) => {
      // Defensive data extraction - handle multiple response formats
      if (Array.isArray(res)) return res;
      if (res?.data && Array.isArray(res.data)) return res.data;
      if (res?.success && Array.isArray(res.data)) return res.data;
      console.warn('Unexpected AI mentors response format:', res);
      return [];
    },
    enabled: !!user,
    retry: 2,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch chat messages with defensive data extraction
  const { 
    data: serverMessages = [], 
    isLoading: isLoadingMessages 
  } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', selectedMentorId],
    queryFn: () => vercelApiClient.getChatMessages(selectedMentorId!),
    select: (res) => {
      // Defensive data extraction - handle multiple response formats
      if (Array.isArray(res)) return res;
      if (res?.data && Array.isArray(res.data)) return res.data;
      if (res?.success && Array.isArray(res.data)) return res.data;
      console.warn('Unexpected chat messages response format:', res);
      return [];
    },
    enabled: !!selectedMentorId && !!user,
    retry: 1,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Combine server messages with optimistic messages
  const messages = [...serverMessages, ...optimisticMessages];

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; aiMentorId: number }) => {
      return vercelApiClient.sendChatMessage(data.content, data.aiMentorId);
    },
    onMutate: async (variables) => {
      // Clear input immediately for better UX
      setMessageInput("");
      
      // Create optimistic user message
      const tempId = Date.now();
      const optimisticUserMessage: ChatMessage = {
        id: tempId,
        content: variables.content,
        role: 'user',
        createdAt: new Date().toISOString(),
        userId: user?.id || 0,
        aiMentorId: variables.aiMentorId,
      };

      // Add optimistic user message immediately
      setOptimisticMessages(prev => [...prev, optimisticUserMessage]);
      setIsTyping(true);

      return { tempId };
    },
    onSuccess: (data) => {
      setIsTyping(false);
      
      // Add AI response to optimistic messages
      if (data?.aiMessage?.data?.reply) {
        const aiMessage: ChatMessage = {
          id: Date.now() + 1,
          content: data.aiMessage.data.reply,
          role: 'assistant',
          createdAt: new Date().toISOString(),
          userId: user?.id || 0,
          aiMentorId: selectedMentorId || 0,
        };
        
        setOptimisticMessages(prev => [...prev, aiMessage]);
      }

      // Refresh server data in background
      queryClient.invalidateQueries({ queryKey: ['/api/chat', selectedMentorId] });
      
      toast({
        title: "Response received",
        description: "Your mentor has responded",
      });
    },
    onError: (error, variables, context) => {
      setIsTyping(false);
      
      // Remove the optimistic user message on error
      if (context?.tempId) {
        setOptimisticMessages(prev => prev.filter(msg => msg.id !== context.tempId));
      }
      
      let title = "Message Failed";
      let description = "Please try again";
      
      if (error instanceof Error) {
        const message = error.message;
        
        // Provide user-friendly titles and descriptions based on error type
        if (message.includes('log in')) {
          title = "Authentication Required";
          description = "Please log in to continue chatting with mentors";
        } else if (message.includes('temporarily unavailable')) {
          title = "Service Temporarily Down";
          description = "Our AI mentors are temporarily unavailable. Please try again in a few minutes";
        } else if (message.includes('usage limits exceeded') || message.includes('limit reached')) {
          title = "Monthly Limit Reached";
          description = "You've reached your monthly message limit. Limit resets next month";
        } else if (message.includes('wait a moment')) {
          title = "Please Slow Down";
          description = "You're sending messages too quickly. Please wait a moment";
        } else if (message.includes('mentor is not available')) {
          title = "Mentor Unavailable";
          description = "This mentor is currently unavailable. Please try a different mentor";
        } else if (message.includes('Network error')) {
          title = "Connection Problem";
          description = "Please check your internet connection and try again";
        } else if (message.includes('Server error')) {
          title = "Server Issue";
          description = "Our servers are experiencing issues. Please try again in a moment";
        } else {
          // Use the original error message for other cases
          description = message;
        }
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Restore previously selected mentor from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedAiMentorId');
    const id = saved ? Number(saved) : null;
    if (id && Number.isFinite(id)) {
      setSelectedMentorId(id);
    }
  }, []);

  // When mentors load, if no selection or saved selection is not in the list, default to first
  useEffect(() => {
    if (!Array.isArray(aiMentors) || aiMentors.length === 0) return;
    if (!selectedMentorId || !aiMentors.some(m => m.id === selectedMentorId)) {
      setSelectedMentorId(aiMentors[0].id);
    }
  }, [aiMentors, selectedMentorId]);

  // Clear optimistic messages when changing mentors
  useEffect(() => {
    setOptimisticMessages([]);
  }, [selectedMentorId]);

  // Clear optimistic messages when server data is updated
  useEffect(() => {
    if (serverMessages.length > 0) {
      setOptimisticMessages([]);
    }
  }, [serverMessages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedMentorId || sendMessageMutation.isPending) return;

    const content = messageInput.trim();

    // Use optimistic UI - mutation handles input clearing and optimistic updates
    sendMessageMutation.mutate({
      content,
      aiMentorId: selectedMentorId,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedMentor = Array.isArray(aiMentors) ? aiMentors.find(m => m.id === selectedMentorId) : undefined;

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Mentors</h2>
        <p className="text-slate-600">Please log in to chat with mentors.</p>
      </div>
    );
  }

  // Handle loading states
  if (isLoadingMentors) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading AI mentors...</p>
        </div>
      </div>
    );
  }

  // Handle error states
  if (mentorsError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Mentors</h2>
          <p className="text-red-600 mb-4">Failed to load mentors. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  // Handle empty mentors state
  if (!Array.isArray(aiMentors) || aiMentors.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Mentors</h2>
          <p className="text-slate-600">No AI mentors are currently available.</p>
        </div>
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
          onSelect={(id) => {
            setSelectedMentorId(id);
            try { localStorage.setItem('selectedAiMentorId', String(id)); } catch {}
          }}
        />
      </div>

      {/* Chat Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex items-start space-x-3 max-w-xs lg:max-w-md">
              {message.role === 'assistant' && selectedMentor && (
                <img 
                  src={selectedMentor.avatar} 
                  alt={selectedMentor.name} 
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              )}
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-slate-900 text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1 opacity-60">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
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
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <Textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            size="sm"
            className="px-3 py-2 h-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
