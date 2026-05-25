import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from 'src/app/core/services/mock-data.service';

interface ExploreItem {
  id: string;
  imageUrl: string;
  likes: number;
  commentsCount: number;
  caption: string;
  username: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 sm:py-4">
      <!-- Title -->
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Explore</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Discover trending content, amazing photography, and stories from our community.</p>
      </div>

      <!-- Explore Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div 
          *ngFor="let item of exploreItems(); let i = index" 
          (click)="openDetail(item)"
          class="aspect-square relative rounded-2xl overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 bg-slate-100 dark:bg-slate-900"
        >
          <!-- Photo -->
          <img 
            [src]="item.imageUrl" 
            alt="Explore post"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          >
          
          <!-- Hover Overlay -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 z-10">
            <div class="flex items-center gap-1.5 text-white font-extrabold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-6 h-6">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <span>{{ item.likes }}</span>
            </div>
            
            <div class="flex items-center gap-1.5 text-white font-extrabold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-6 h-6">
                <path fill-rule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.278.187 2.228 1.306 2.228 2.594v7.716c0 1.288-.95 2.407-2.228 2.594A48.001 48.001 0 0112 16.25c-.99 0-1.97-.03-2.94-.09l-3.1 3.1c-.24.24-.6.3-.9.18A.75.75 0 014.5 18.75V16.5c-1.353-.298-2.338-1.5-2.338-2.906V5.365c0-1.288.95-2.407 2.228-2.594z" clip-rule="evenodd" />
              </svg>
              <span>{{ item.commentsCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Lightbox Modal -->
      <div 
        *ngIf="selectedItem()" 
        class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closeDetail()"
      >
        <div 
          class="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden max-w-4xl w-full max-h-[85vh] flex flex-col md:flex-row shadow-2xl relative border border-slate-100 dark:border-slate-700"
          (click)="$event.stopPropagation()"
        >
          <!-- Image Section -->
          <div class="md:w-3/5 bg-slate-950 flex items-center justify-center relative min-h-[300px] md:min-h-0">
            <img 
              [src]="selectedItem()?.imageUrl" 
              class="w-full h-full object-contain max-h-[50vh] md:max-h-[85vh]"
              alt="detail image"
            >
          </div>

          <!-- Content Section -->
          <div class="md:w-2/5 p-6 flex flex-col justify-between bg-white dark:bg-slate-800 overflow-y-auto">
            <!-- Close Button for Mobile/Desktop -->
            <button 
              (click)="closeDetail()"
              class="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-slate-600 dark:text-slate-200 transition-colors z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <!-- User Header -->
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <img 
                  [src]="selectedItem()?.avatarUrl" 
                  alt="avatar"
                  class="w-10 h-10 rounded-full object-cover"
                >
                <div>
                  <h4 class="font-extrabold text-slate-800 dark:text-white hover:underline cursor-pointer">{{ selectedItem()?.username }}</h4>
                  <p class="text-xs text-slate-400">Public Explore Post</p>
                </div>
              </div>

              <!-- Caption -->
              <div class="bg-slate-50 dark:bg-slate-700/30 rounded-2xl p-4">
                <p class="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {{ selectedItem()?.caption }}
                </p>
              </div>
            </div>

            <!-- Fake Comments List -->
            <div class="mt-6 border-t border-slate-100 dark:border-slate-700 pt-4 flex-grow space-y-3">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comments</div>
              <div class="space-y-2">
                <div class="flex gap-2">
                  <span class="font-bold text-slate-800 dark:text-white">mikejohnson</span>
                  <span class="text-slate-600 dark:text-slate-300">Wow, this looks like an absolute dream spot! 🌟</span>
                </div>
                <div class="flex gap-2">
                  <span class="font-bold text-slate-800 dark:text-white">sarahwilson</span>
                  <span class="text-slate-600 dark:text-slate-300">Adding this to my bucket list immediately!</span>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="border-t border-slate-100 dark:border-slate-700 pt-4 mt-6 flex justify-between items-center">
              <div class="flex items-center gap-2">
                <span class="text-sm font-extrabold text-slate-800 dark:text-white">{{ selectedItem()?.likes }} likes</span>
              </div>
              <span class="text-xs text-slate-400 font-semibold">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExploreComponent {
  private mockData = inject(MockDataService);

  selectedItem = signal<ExploreItem | null>(null);

  exploreItems = this.mockData.exploreItems;

  constructor() {
    this.mockData.loadExplore();
  }

  openDetail(item: ExploreItem) {
    this.selectedItem.set(item);
  }

  closeDetail() {
    this.selectedItem.set(null);
  }
}
