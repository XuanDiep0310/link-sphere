export interface Conversation {
  id: string;
  title: string;
  type: 'direct' | 'group';
  avatar: string;
  lastMessage: string;
  unreadCount: number;
  otherParticipant: string;
  updatedAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: string;
  sender: { id: number; username: string; email?: string; avatar?: string };
  content: string;
  messageType: 'text' | 'image' | 'video' | 'file' | 'system';
  fileUrl?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}
