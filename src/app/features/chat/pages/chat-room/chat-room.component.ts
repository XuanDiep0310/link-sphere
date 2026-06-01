import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatService } from 'src/app/features/chat/services/chat.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ChatMessage } from 'src/app/core/models/chat.model';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto flex flex-col h-[calc(100vh-5.5rem)] sm:h-[calc(100vh-6.5rem)]">
      <!-- Header -->
      <div class="flex items-center gap-3 py-3 px-1 border-b border-slate-100 dark:border-slate-700/80 flex-shrink-0">
        <a
          routerLink="/chat"
          class="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </a>
        <img
          [src]="conversationAvatar()"
          alt="avatar"
          class="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
        >
        <div class="flex-1 min-w-0">
          <h2 class="font-bold text-slate-900 dark:text-white text-sm truncate">{{ conversationTitle() }}</h2>
          <span class="text-xs" [ngClass]="chatService.isConnected() ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'">
            {{ chatService.isConnected() ? 'Online' : 'Connecting...' }}
          </span>
        </div>
      </div>

      <!-- Messages Area -->
      <div
        #messagesContainer
        class="flex-1 overflow-y-auto px-2 py-4 space-y-3 scroll-smooth"
        (scroll)="onScroll($event)"
      >
        <!-- Load more indicator -->
        <div *ngIf="chatService.hasMoreMessages() && !chatService.isLoadingMessages()" class="flex justify-center pb-2">
          <button
            (click)="loadOlderMessages()"
            class="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950/30 transition-colors"
          >
            Load older messages
          </button>
        </div>

        <!-- Loading spinner for older messages -->
        <div *ngIf="chatService.isLoadingMessages()" class="flex justify-center py-4">
          <svg class="animate-spin h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <!-- Messages -->
        <ng-container *ngFor="let msg of chatService.messages(); trackBy: trackByMessageId">
          <!-- Date separator -->
          <div *ngIf="msg.messageType === 'system'" class="flex justify-center py-2">
            <span class="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
              {{ msg.content }}
            </span>
          </div>

          <!-- Chat bubble -->
          <div
            *ngIf="msg.messageType !== 'system' && !msg.isDeleted"
            class="flex gap-2.5"
            [ngClass]="isOwnMessage(msg) ? 'justify-end' : 'justify-start'"
          >
            <!-- Other user avatar -->
            <img
              *ngIf="!isOwnMessage(msg)"
              [src]="msg.sender.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'"
              alt="avatar"
              class="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-1"
            >

            <div
              class="max-w-[75%] min-w-[60px]"
              [ngClass]="isOwnMessage(msg) ? 'items-end' : 'items-start'"
            >
              <!-- Sender name for other's messages -->
              <p *ngIf="!isOwnMessage(msg)" class="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 ml-1">
                {{ msg.sender.username }}
              </p>

              <!-- Message bubble -->
              <div
                class="px-4 py-2.5 shadow-sm"
                [ngClass]="isOwnMessage(msg)
                  ? 'bg-violet-600 text-white rounded-2xl rounded-br-md'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700/80 rounded-2xl rounded-bl-md'"
              >
                <!-- Image message -->
                <div *ngIf="msg.messageType === 'image' && msg.fileUrl" class="mb-1">
                  <img
                    [src]="msg.fileUrl"
                    alt="shared image"
                    class="rounded-xl max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    (click)="openImagePreview(msg.fileUrl!)"
                  >
                </div>

                <!-- Text content -->
                <p *ngIf="msg.content" class="text-sm leading-relaxed whitespace-pre-wrap break-words">{{ msg.content }}</p>
              </div>

              <!-- Timestamp -->
              <p
                class="text-[10px] mt-1 px-1"
                [ngClass]="isOwnMessage(msg) ? 'text-right text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500'"
              >
                {{ chatService.formatMessageTime(msg.createdAt) }}
              </p>
            </div>
          </div>
        </ng-container>

        <!-- Empty state -->
        <div *ngIf="chatService.messages().length === 0 && !chatService.isLoadingMessages()" class="flex flex-col items-center justify-center py-20 space-y-3">
          <div class="w-16 h-16 bg-violet-50 dark:bg-violet-950/30 rounded-3xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-violet-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p class="text-sm text-slate-400 dark:text-slate-500 font-medium">Say hello! 👋</p>
        </div>
      </div>

      <!-- Input Area -->
      <div class="flex-shrink-0 border-t border-slate-100 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 p-3">
        <!-- Image preview -->
        <div *ngIf="imagePreview()" class="mb-3 relative inline-block">
          <img
            [src]="imagePreview()"
            alt="Upload preview"
            class="h-20 w-20 object-cover rounded-2xl border-2 border-violet-200 dark:border-violet-700"
          >
          <button
            (click)="removeImage()"
            class="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-3 h-3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex items-end gap-2">
          <!-- Image upload button -->
          <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="hidden">
          <button
            (click)="fileInput.click()"
            [disabled]="isUploading()"
            class="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all flex-shrink-0 disabled:opacity-40"
          >
            <svg *ngIf="!isUploading()" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <svg *ngIf="isUploading()" class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </button>

          <!-- Text input -->
          <div class="flex-1 relative">
            <textarea
              #messageInput
              [(ngModel)]="messageText"
              (keydown.enter)="onEnterKey($event)"
              placeholder="Type a message..."
              rows="1"
              class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 border-0 focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-all max-h-32"
            ></textarea>
          </div>

          <!-- Send button -->
          <button
            (click)="sendMessage()"
            [disabled]="(!messageText.trim() && !pendingFileUrl()) || isUploading()"
            class="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-violet-500/20 transform hover:scale-105 active:scale-95 transition-all flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Image Preview Modal -->
      <div
        *ngIf="fullImagePreview()"
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closeImagePreview()"
      >
        <img
          [src]="fullImagePreview()"
          alt="Full preview"
          class="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          (click)="$event.stopPropagation()"
        >
        <button
          (click)="closeImagePreview()"
          class="absolute top-6 right-6 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  chatService = inject(ChatService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  messageText = '';
  conversationId = '';
  imagePreview = signal<string | null>(null);
  pendingFileUrl = signal<string | null>(null);
  isUploading = signal(false);
  fullImagePreview = signal<string | null>(null);

  private shouldScrollToBottom = true;
  private previousMessageCount = 0;

  conversationTitle = computed(() => {
    const conv = this.chatService.conversations().find(c => c.id === this.conversationId);
    return conv?.title || conv?.otherParticipant || 'Chat';
  });

  conversationAvatar = computed(() => {
    const conv = this.chatService.conversations().find(c => c.id === this.conversationId);
    return conv?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
  });

  ngOnInit() {
    this.conversationId = this.route.snapshot.paramMap.get('conversationId') || '';
    if (!this.conversationId) {
      this.router.navigate(['/chat']);
      return;
    }

    // If conversations aren't loaded yet, load them for header info
    if (this.chatService.conversations().length === 0) {
      this.chatService.loadConversations();
    }

    this.chatService.clearMessages();
    this.chatService.loadMessages(this.conversationId);
    this.chatService.connectWebSocket(this.conversationId);
  }

  ngAfterViewChecked() {
    const currentCount = this.chatService.messages().length;
    if (currentCount > this.previousMessageCount && this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
    this.previousMessageCount = currentCount;
  }

  ngOnDestroy() {
    this.chatService.disconnectWebSocket();
  }

  isOwnMessage(msg: ChatMessage): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return false;
    return msg.sender.username === currentUser.username ||
           String(msg.sender.id) === String(currentUser.id);
  }

  trackByMessageId(index: number, msg: ChatMessage): number {
    return msg.id;
  }

  onScroll(event: Event) {
    const el = event.target as HTMLElement;
    // If scrolled near top, load older messages
    if (el.scrollTop < 50 && this.chatService.hasMoreMessages() && !this.chatService.isLoadingMessages()) {
      this.shouldScrollToBottom = false;
      this.chatService.loadMoreMessages(this.conversationId);
    }
    // Check if user is near bottom
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    this.shouldScrollToBottom = isNearBottom;
  }

  loadOlderMessages() {
    this.shouldScrollToBottom = false;
    this.chatService.loadMoreMessages(this.conversationId);
  }

  sendMessage() {
    const fileUrl = this.pendingFileUrl();
    const content = this.messageText.trim();

    if (!content && !fileUrl) return;

    if (fileUrl) {
      this.chatService.sendMessage(content || '', 'image', fileUrl);
    } else {
      this.chatService.sendMessage(content, 'text');
    }

    this.messageText = '';
    this.imagePreview.set(null);
    this.pendingFileUrl.set(null);
    this.shouldScrollToBottom = true;
  }

  onEnterKey(event: Event) {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.sendMessage();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      this.isUploading.set(true);
      this.chatService.uploadMedia(file).subscribe({
        next: (url) => {
          if (url) {
            this.pendingFileUrl.set(url);
          }
          this.isUploading.set(false);
        },
        error: () => {
          this.isUploading.set(false);
          this.imagePreview.set(null);
        }
      });

      // Reset file input
      input.value = '';
    }
  }

  removeImage() {
    this.imagePreview.set(null);
    this.pendingFileUrl.set(null);
  }

  openImagePreview(url: string) {
    this.fullImagePreview.set(url);
  }

  closeImagePreview() {
    this.fullImagePreview.set(null);
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }
}
