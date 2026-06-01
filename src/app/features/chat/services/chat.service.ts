import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Conversation, ChatMessage } from 'src/app/core/models/chat.model';
import { Observable, of, catchError, switchMap, tap } from 'rxjs';
import { User } from 'src/app/core/models/auth.model';
import { MockDataService } from 'src/app/core/services/mock-data.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private mockData = inject(MockDataService);

  // ─── State ──────────────────────────────────────────────────────────────
  conversations = signal<Conversation[]>([]);
  messages = signal<ChatMessage[]>([]);
  isLoadingConversations = signal(false);
  isLoadingMessages = signal(false);
  isConnected = signal(false);
  wsStatus = signal<'connecting' | 'connected' | 'disconnected'>('disconnected');
  nextCursor = signal<string | null>(null);
  hasMoreMessages = signal(true);
  totalUnreadCount = computed(() =>
    this.conversations().reduce((sum, c) => sum + c.unreadCount, 0)
  );

  private ws: WebSocket | null = null;
  private currentConversationId: string | null = null;
  private connectTimeoutId: any = null;

  // ─── Conversations ─────────────────────────────────────────────────────

  loadConversations() {
    this.isLoadingConversations.set(true);
    this.http.get<any>(`${environment.apiUrl}/v1/chat/conversations/`).subscribe({
      next: (res) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) {
          rawList = res;
        } else if (res) {
          if (res.success && res.data) {
            rawList = Array.isArray(res.data) ? res.data : (res.data.results || []);
          } else if (Array.isArray(res.results)) {
            rawList = res.results;
          }
        }
        const mapped: Conversation[] = rawList.map((c: any) => this.mapConversation(c));
        this.conversations.set(mapped);
        this.isLoadingConversations.set(false);
      },
      error: (err) => {
        console.warn('Failed to load conversations:', err);
        this.isLoadingConversations.set(false);
      }
    });
  }

  createConversation(recipientId: number): Observable<Conversation | null> {
    return this.http.post<any>(
      `${environment.apiUrl}/v1/chat/conversations/`,
      { type: 'direct', recipient_id: recipientId }
    ).pipe(
      switchMap(res => {
        let rawConv: any = null;
        if (res) {
          if (res.success && res.data) {
            rawConv = res.data;
          } else if (res.id) {
            rawConv = res;
          }
        }
        if (rawConv) {
          const conv = this.mapConversation(rawConv);
          // Add to conversations list if not already there
          this.conversations.update(list => {
            const exists = list.find(c => c.id === conv.id);
            if (exists) return list;
            return [conv, ...list];
          });
          return of(conv);
        }
        return of(null);
      }),
      catchError(err => {
        console.warn('Failed to create conversation:', err);
        return of(null);
      })
    );
  }

  // ─── Messages ──────────────────────────────────────────────────────────

  loadMessages(conversationId: string, cursor?: string) {
    if (!cursor) {
      this.isLoadingMessages.set(true);
    }
    let url = `${environment.apiUrl}/v1/chat/conversations/${conversationId}/messages/`;
    if (cursor) {
      url += `?cursor=${cursor}`;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        let results: any[] = [];
        let nextCursor: string | null = null;

        if (Array.isArray(res)) {
          results = res;
        } else if (res) {
          if (res.success && res.data) {
            results = Array.isArray(res.data) ? res.data : (res.data.results || []);
            nextCursor = res.data.next_cursor || res.data.next || null;
          } else if (Array.isArray(res.results)) {
            results = res.results;
            nextCursor = res.next || res.next_cursor || null;
          } else if (res.id) {
            results = [res];
          }
        }

        const mapped: ChatMessage[] = results.map((m: any) => this.mapMessage(m, conversationId));

        if (cursor) {
          // Prepend older messages
          this.messages.update(current => [...mapped.reverse(), ...current]);
        } else {
          // Initial load – messages come newest-first from API, reverse for display
          this.messages.set(mapped.reverse());
        }

        this.nextCursor.set(nextCursor);
        this.hasMoreMessages.set(!!nextCursor);
        this.isLoadingMessages.set(false);
      },
      error: (err) => {
        console.warn('Failed to load messages:', err);
        this.isLoadingMessages.set(false);
      }
    });
  }

  loadMoreMessages(conversationId: string) {
    const cursor = this.nextCursor();
    if (cursor) {
      this.loadMessages(conversationId, cursor);
    }
  }

  // ─── Media Upload ──────────────────────────────────────────────────────

  uploadMedia(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<{ success: boolean; message: string; timestamp: string; data: any }>(
      `${environment.apiUrl}/v1/chat/media/upload/`,
      formData
    ).pipe(
      switchMap(res => {
        if (res.success && res.data) {
          return of(res.data.file_url || res.data.url || res.data);
        }
        return of(null);
      }),
      catchError(err => {
        console.warn('Failed to upload media:', err);
        return of(null);
      })
    );
  }

  // ─── WebSocket ─────────────────────────────────────────────────────────

  connectWebSocket(conversationId: string) {
    this.disconnectWebSocket();
    this.currentConversationId = conversationId;

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No JWT token found, cannot connect to chat WebSocket.');
      this.wsStatus.set('disconnected');
      return;
    }

    // Build WebSocket URL: environment.wsUrl holds the base like wss://host
    // Chat WS pattern: wss://host/ws/chat/{conversationId}/?token={jwt}
    let wsBase = environment.wsUrl;
    // Ensure ws:// or wss:// protocol
    if (wsBase.startsWith('https://')) {
      wsBase = wsBase.replace('https://', 'wss://');
    } else if (wsBase.startsWith('http://')) {
      wsBase = wsBase.replace('http://', 'ws://');
    }
    // Extract just the host part (remove any path like /notifications)
    try {
      const wsUrlObj = new URL(wsBase);
      wsBase = `${wsUrlObj.protocol}//${wsUrlObj.host}`;
    } catch {
      // Fallback: just strip known suffixes
      wsBase = wsBase.replace(/\/notifications\/?$/, '').replace(/\/ws\/.*$/, '');
    }

    const wsUrl = `${wsBase}/ws/chat/${conversationId}/?token=${token}&access_token=${token}`;

    this.wsStatus.set('connecting');

    // Set connection timeout (5 seconds)
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
    }
    this.connectTimeoutId = setTimeout(() => {
      if (this.wsStatus() === 'connecting') {
        console.warn('WebSocket connection attempt timed out.');
        this.wsStatus.set('disconnected');
        this.isConnected.set(false);
        if (this.ws) {
          try {
            this.ws.close();
          } catch {}
        }
      }
    }, 5000);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.connectTimeoutId) clearTimeout(this.connectTimeoutId);
        this.isConnected.set(true);
        this.wsStatus.set('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message = this.mapMessage(data, conversationId);
          // Only add if not already in the list
          this.messages.update(current => {
            if (current.some(m => m.id === message.id)) return current;
            return [...current, message];
          });
          // Update conversation's last message
          this.conversations.update(list =>
            list.map(c =>
              c.id === conversationId
                ? { ...c, lastMessage: message.content, updatedAt: message.createdAt }
                : c
            )
          );
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        if (this.connectTimeoutId) clearTimeout(this.connectTimeoutId);
        this.isConnected.set(false);
        this.wsStatus.set('disconnected');
        console.warn(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
        if (this.connectTimeoutId) clearTimeout(this.connectTimeoutId);
        this.isConnected.set(false);
        this.wsStatus.set('disconnected');
      };
    } catch (err) {
      console.warn('Failed to create WebSocket connection:', err);
      if (this.connectTimeoutId) clearTimeout(this.connectTimeoutId);
      this.isConnected.set(false);
      this.wsStatus.set('disconnected');
    }
  }

  sendMessage(content: string, messageType: 'text' | 'image' = 'text', fileUrl?: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected. HTTP Fallback not available as backend lacks a POST endpoint. Will retry loading messages.');
      if (this.currentConversationId) {
        this.loadMessages(this.currentConversationId);
      }
      return;
    }
    const payload: any = {
      content,
      message_type: messageType
    };
    if (fileUrl) {
      payload.file_url = fileUrl;
    }
    this.ws.send(JSON.stringify(payload));
  }

  disconnectWebSocket() {
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected.set(false);
    this.wsStatus.set('disconnected');
    this.currentConversationId = null;
  }

  // ─── User Search (for new conversation) ────────────────────────────────

  searchUsers(query: string): Observable<User[]> {
    if (!query.trim()) return of([]);
    return this.http.get<{ success: boolean; data?: { results: any[] } }>(
      `${environment.apiUrl}/v1/search/users/`, { params: { q: query } }
    ).pipe(
      switchMap(res => {
        if (res?.data?.results) {
          const mapped = res.data.results.map((u: any) => ({
            id: u.id,
            email: u.email || '',
            username: u.username,
            avatarUrl: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            followersCount: u.followers_count || 0,
            followingCount: u.following_count || 0,
            bio: u.bio
          }));
          return of(mapped);
        }
        return of([]);
      }),
      catchError(() => of([]))
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  clearMessages() {
    this.messages.set([]);
    this.nextCursor.set(null);
    this.hasMoreMessages.set(true);
  }

  showToast(message: string) {
    this.mockData.showToast(message);
  }

  private mapConversation(c: any): Conversation {
    return {
      id: String(c.id),
      title: c.title || c.name || c.other_participant?.username || 'Chat',
      type: c.type || 'direct',
      avatar: c.avatar || c.other_participant?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      lastMessage: c.last_message?.content || c.last_message || '',
      unreadCount: c.unread_count || 0,
      otherParticipant: c.other_participant?.username || c.title || '',
      updatedAt: c.updated_at || c.updatedAt || '',
      createdAt: c.created_at || c.createdAt || ''
    };
  }

  private mapMessage(m: any, conversationId: string): ChatMessage {
    return {
      id: m.id,
      conversationId: conversationId,
      sender: {
        id: m.sender?.id || m.sender_id || 0,
        username: m.sender?.username || m.username || 'unknown',
        email: m.sender?.email,
        avatar: m.sender?.avatar || m.sender?.avatarUrl
      },
      content: m.content || m.message || '',
      messageType: m.message_type || m.messageType || 'text',
      fileUrl: m.file_url || m.fileUrl,
      createdAt: m.created_at || m.createdAt || new Date().toISOString(),
      updatedAt: m.updated_at || m.updatedAt || '',
      isDeleted: m.is_deleted || false
    };
  }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 7) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      if (diffDays > 0) return `${diffDays}d`;
      if (diffHours > 0) return `${diffHours}h`;
      if (diffMin > 0) return `${diffMin}m`;
      return 'now';
    } catch {
      return '';
    }
  }

  formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
