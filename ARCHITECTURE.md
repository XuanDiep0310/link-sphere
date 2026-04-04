# Link Sphere: Architecture Documentation

Welcome to the **Link Sphere** project. This document outlines the architectural decisions and patterns used in this enterprise-ready social media platform.

## 1. Project Structure
The project follows a **Feature-based architecture** combined with **Clean Architecture** principles.

```text
link-sphere/
├── .github/workflows/          # CI/CD: Vercel deployment
├── src/
│   ├── app/
│   │   ├── core/               # Singleton services, interceptors, guards
│   │   │   ├── interceptors/   # Global HTTP handling (JWT, Errors)
│   │   │   ├── guards/         # AuthGuard, GuestGuard
│   │   │   ├── services/       # AuthService, StorageService
│   │   │   └── models/         # Core User and Auth models
│   │   ├── shared/             # Reusable UI/logic
│   │   │   ├── components/     # Button, Input, Avatar, Navbar
│   │   │   ├── pipes/          # RelativeTime, Truncate
│   │   │   └── models/         # Global shared types
│   │   ├── features/           # Domain-specific modules
│   │   │   ├── auth/           # Login, Register, Logout
│   │   │   ├── post/           # Feed, Detail, Creation
│   │   │   ├── user/           # Profiles, Followers/Following
│   │   │   ├── notification/   # Real-time updates
│   │   │   ├── interaction/    # Likes, Comments
│   │   │   └── search/         # User/Post discovery
│   │   ├── app.config.ts       # Global providers (Standalone configuration)
│   │   ├── app.routes.ts       # Main routing definitions (Lazy Loading)
│   │   └── app.component.ts    # Root component (Standalone)
│   ├── environments/           # Environment configurations (API/WS URLs)
│   └── styles.css              # Global styles + Tailwind directives
├── tailwind.config.js          # Theme design system & Dark Mode
└── package.json                # Dependencies & Scripts
```

## 2. Key Patterns

### Standalone Components
The project is built entirely using **Standalone Components** (`standalone: true`). Modern Angular 16+ development avoids `NgModule` for better tree-shaking and simpler component management.

### Signal-based State Management
We use **Angular Signals** for reactive state.
- **Signal**: Internal private state in services (`_posts = signal<Post[]>([])`).
- **Read-only Signal**: Exposing state safely to components (`posts = this._posts.asReadonly()`).
- **Computed**: Derived state (`postCount = computed(() => this.posts().length)`).

### Smart/Dumb Component Pattern
- **Smart Components** (Pages): Handle data orchestration, inject services, and manage state transitions.
- **Dumb Components** (Shared/UI): Pure presentation logic, receiving data via `@Input` and emitting events via `@Output`.

### Performance & Optimization
- **OnPush Change Detection**: Every component uses `ChangeDetectionStrategy.OnPush`.
- **Lazy Loading**: Every feature domain is lazy-loaded using `loadChildren`.
- **TrackBy**: Used in all `*ngFor` loops for efficient DOM updates.
- **Image Strategy**: Implementation plan for lazy loading and optimized srcsets.

## 3. Real-time Notifications
The `NotificationService` acts as an abstraction over WebSockets or SSE, using Signals to maintain a real-time list of notifications without unnecessary RxJS complexity in the view.

## 4. CI/CD Logic
The `.github/workflows/deploy.yml` specifies a full pipeline:
1. Lint and Build on every PR.
2. Build production assets with optimization.
3. Automatically deploy to **Vercel** on merge to `main`.
