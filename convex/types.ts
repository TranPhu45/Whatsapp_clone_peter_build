import { Id } from "./_generated/dataModel";

/**
 * Type definitions for the application.
 * These types are used across the application to ensure type safety and maintain consistency.
 */

// Type definition for a user
export interface User {
    _id: string; // Unique identifier for the user
    email: string; // Email of the user
    image?: string; // Optional profile image
    tokenIdentifier: string; // Unique token identifier for authentication
    isOnline: boolean; // Indicates if the user is online
  }
  
  // Type definition for a conversation
  export interface Conversation {
    _id: string; // Unique identifier for the conversation
    participants: string[]; // Array of user IDs who are part of the conversation
    isGroup: boolean; // Indicates if the conversation is a group chat
    groupName?: string; // Optional group name (for group chats)
    groupImage?: string; // Optional group image (for group chats)
    admin?: string; // Optional ID of the group admin (for group chats)
  }
  
  // Type definition for a message
  export type MessageType = "text" | "image" | "video" | "file" | "audio" | "voice";

  export interface Message {
    _id: Id<"messages">;
    _creationTime: number;
    content: string;
    sender: string;
    conversation: Id<"conversations">;
    messageType: MessageType;
    fileName?: string;
  }
  
// Valid roles for OpenAI chat completion messages
export type AIMessageRole = "system" | "user" | "assistant" | "tool" | "function";

// Type definition for an AI message
export interface AIResponse {
  role: AIMessageRole; // Role must match OpenAI's expected values
  content: string; // The content of the message
}
  