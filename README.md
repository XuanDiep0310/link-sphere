# Link Sphere 🚀

Modern social media platform architected for scalability, performance, and premium user experience.

## 🛠️ Technology Stack
- **Framework**: [Angular 16](https://angular.io/) (Standalone Components)
- **State Management**: [Angular Signals](https://angular.io/guide/signals) (Developer Preview in v16)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) & [Sass/SCSS](https://sass-lang.com/)
- **API Flow**: RxJS + HttpClient with Functional Interceptors
- **Architecture**: Feature-oriented & Clean Architecture
- **CI/CD**: GitHub Actions + Vercel Deployment

## 📂 Architecture Overview
Following **Feature-based architecture** and **Clean Architecture** principles:
- `src/app/core`: Singleton services, guards, and interceptors.
- `src/app/shared`: Reusable UI components, pipes, and directives.
- `src/app/features`: Domain-specific features (Auth, Profile, Feed, etc.).
- `src/environments`: Environment-specific configurations.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Angular CLI (`npm install -g @angular/cli@16`)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/link-sphere.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run start
   ```
   Visit `http://localhost:4200` in your browser.

## 🚢 CI/CD & Deployment
This project is configured with **GitHub Actions** for automatic deployment to **Vercel**.

### Setup Secrets
In your GitHub Repository, navigate to `Settings -> Secrets and variables -> Actions` and add:
- `VERCEL_TOKEN`: Your Vercel account token.
- `VERCEL_ORG_ID`: `team_A86nqmkAgJYHh4MW2KwZwwKo`
- `VERCEL_PROJECT_ID`: `prj_gG937izUQGqszviVoCs1jwfGzGYQ`

Every push to `main` or `develop` will automatically trigger a new deployment.

## 🎨 UI/UX Design System
- **Typography**: Inter (Google Fonts)
- **Color Palette**: Custom Primary Blue (Tailwind extensions)
- **Support**: Responsive Design & Dark Mode support built-in.

---
