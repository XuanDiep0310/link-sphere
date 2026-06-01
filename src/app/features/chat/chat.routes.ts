import { Routes } from '@angular/router';

export const CHAT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/conversations/conversations.component').then(m => m.ConversationsComponent)
  },
  {
    path: ':conversationId',
    loadComponent: () => import('./pages/chat-room/chat-room.component').then(m => m.ChatRoomComponent)
  }
];
