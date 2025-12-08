"use client"

import { useChat } from "ai/react"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Markdown } from "./markdown"
import { Bot, Loader2, Send, Sparkles, User, X, MessageSquare } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AIChatProps {
  isOpen: boolean
  onClose: () => void
  onDataChange?: () => void
}

export function AIChat({ isOpen, onClose, onDataChange }: AIChatProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: "/api/chat",
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hi! I'm your assignment assistant. I can help you manage your assignments, answer questions about your schedule, provide study tips, and more. What would you like to know?",
        },
      ],
      maxSteps: 15,
      onFinish: () => {
        refreshData()
      },
    })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  // Check if we're in the middle of a multi-step tool call
  const hasActiveToolCalls = messages.some(
    (msg) => msg.role === "assistant" && msg.toolInvocations?.some(
      (tool) => tool.state !== "result"
    )
  )
  
  // Only show error if it's not a transient error during tool execution
  const shouldShowError = error && !isLoading && !hasActiveToolCalls

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const refreshData = () => {
    const hasAssignmentChange = messages.flatMap(msg => msg.toolInvocations ?? []).some(
          (tool) => tool.toolName === "createAssignment" || tool.toolName === "updateAssignment"
        )
    if (hasAssignmentChange && onDataChange) {
      onDataChange()
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setTimeout(() => inputRef.current?.focus(), 300)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out",
        isOpen
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      )}
    >
      <Card className="w-[380px] sm:w-[440px] h-[650px] flex flex-col shadow-2xl border-0 overflow-hidden bg-white">
        {/* Header */}
        <div className="relative flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-pink-600/50 animate-pulse" />
          
          <div className="relative flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                AI Assistant
                <Sparkles className="w-4 h-4 animate-pulse" />
              </h3>
              <p className="text-xs text-blue-100">Online • Ready to help</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="relative text-white hover:bg-white/20 h-8 w-8 transition-all hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 via-blue-50/20 to-purple-50/20">
          {messages.length === 1 && (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Start a conversation</h4>
                <p className="text-sm text-gray-600 max-w-xs mx-auto">
                  Ask me anything about your assignments, deadlines, or study planning
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={cn(
                "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-300",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Avatar
                className={cn(
                  "w-8 h-8 shrink-0",
                  message.role === "assistant" &&
                    "ring-2 ring-blue-500 ring-offset-2"
                )}
              >
                <AvatarFallback
                  className={cn(
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                      : "bg-gradient-to-br from-green-500 to-teal-600 text-white"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "flex flex-col max-w-[85%]",
                  message.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-md transition-all hover:shadow-lg",
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm"
                      : "bg-white border border-gray-200 text-gray-900 rounded-tl-sm hover:border-gray-300"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  )}
                  
                  {/* Tool invocations display */}
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200/50 space-y-1.5">
                      {message.toolInvocations.map((tool, toolIndex) => (
                        <div
                          key={toolIndex}
                          className="text-xs flex items-center gap-1.5 text-blue-600"
                        >
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          <span className="font-medium">
                            {tool.state === "result"
                              ? `✓ ${formatToolName(tool.toolName)}`
                              : `⋯ ${formatToolName(tool.toolName)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-1.5 px-2">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
              <Avatar className="w-8 h-8 ring-2 ring-blue-500 ring-offset-2">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {shouldShowError && (
            <div className="flex justify-center animate-in fade-in-0 duration-300">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm shadow-sm">
                <strong>Error:</strong> {error.message}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t bg-white flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your assignments..."
            disabled={isLoading}
            className="flex-1 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </Card>
    </div>
  )
}

// Helper function to format tool names
function formatToolName(toolName: string): string {
  const names: Record<string, string> = {
    getAssignments: "Fetching assignments",
    getAssignmentSummary: "Getting overview",
    createAssignment: "Creating assignment",
    updateAssignment: "Updating assignment",
    getStudyAdvice: "Generating advice",
    answerAssignmentQuestion: "Analyzing data",
  }
  return names[toolName] || toolName
}

// Floating Chat Button
interface ChatButtonProps {
  onClick: () => void
  hasUnread?: boolean
}

export function ChatButton({ onClick, hasUnread }: ChatButtonProps) {
  const [isPulsing, setIsPulsing] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsPulsing(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button
        onClick={onClick}
        size="lg"
        className={cn(
          "h-16 w-16 rounded-full shadow-2xl",
          "bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600",
          "hover:from-blue-700 hover:via-purple-700 hover:to-pink-700",
          "transition-all duration-300 hover:scale-110 hover:rotate-12",
          "group relative overflow-hidden"
        )}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative">
          <Bot className="w-7 h-7 text-white transition-transform group-hover:scale-110" />
          {hasUnread && (
            <span className="absolute -top-2 -right-2 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          )}
          {isPulsing && (
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
          )}
        </div>
      </Button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
          Chat with AI Assistant
        </div>
      </div>
    </div>
  )
}
