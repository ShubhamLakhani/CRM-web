# Apex CRM Frontend - Client Web Portal 🎨

This is the Next.js frontend client application for **Apex CRM**. It provides sales reps, operational managers, and owners with a highly-interactive, responsive UI featuring smooth transitions, real-time dashboard updates, and robust command palette controls.

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 15.0](https://nextjs.org/) (App Router, React 19)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Vanilla CSS variables
* **Data Fetching & Cache**: [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
* **HTTP Client**: [Axios](https://axios-http.com/)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand) (toast messaging, user preference overrides)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 📁 Workspace Directory Structure

```
apps/web/
├── public/                 # Static assets & public images
└── src/
    ├── app/                # Next.js App Router (Layouts & Pages)
    │   ├── (auth)/         # Login page & signup workflows
    │   ├── (dashboard)/    # Scoped application sections
    │   │   ├── activity/   # Workspace interaction logs & timelines
    │   │   ├── automations/# Visual Rule/Action builder interfaces
    │   │   ├── contacts/   # CRM contacts and company profiling
    │   │   ├── deals/      # Drag-and-drop Sales Pipeline Kanban board
    │   │   ├── settings/   # Organization memberships and billing limits
    │   │   └── tasks/      # Collaborative task delegator table
    │   └── globals.css     # Tailwind imports and root CSS variables
    │
    ├── components/         # Shared & interactive dashboard components
    │   ├── ui/             # Core UI blocks (Buttons, Inputs, Dialogs)
    │   ├── Sidebar.tsx     # Navigation and Workspace Switcher dropdown
    │   ├── KanbanBoard.tsx # Pipeline opportunity cards
    │   └── CommandPalette.tsx # Keyboard-triggered shortcut window
    │
    ├── providers/          # Context wrapper packages (Query, Session Auth)
    └── store/              # Zustand global storage logic for notification states
```

---

## ⚡ Key Frontend Features

1. **Workspace Switcher Dropdown**: Integrates with organizational membership tables. Updates context references and retrieves active tenant profiles dynamically.
2. **Deals Kanban Pipeline**: Drag-and-drop opportunity cards with state-transition listeners. Automatically triggers background automation pipelines on stage moves.
3. **No-Code Automation Builder**: Queries `/api/automations/metadata` to dynamically populate condition options, numeric parameters, state triggers, and custom actions inside rule panels.
4. **Keyboard Command Palette**: Press `Cmd+K` (or `Ctrl+K`) to open a global command modal, enabling quick navigation, workspace searches, and entity creation.
5. **Real-time Notifications**: Custom Zustand-based toaster alerts showing execution summaries and system updates.

---

## ⚙️ Local Configuration

To run the frontend individually:

### 1. Set Environment Variables
Create a `.env.local` file containing the URL of the API gateway (refer to `.env.example`):
```env
NEXT_PUBLIC_API_URL="http://localhost:8006/api"
```

### 2. Available Scripts

From this directory (`apps/web/`):
```bash
# Start the local development server on port 3000
npm run dev

# Build the production bundle
npm run build

# Start the Next.js server with the production build
npm run start

# Run ESLint validation
npm run lint
```

---

## 💡 Monorepo Setup Note
For database integration, background workers, and REST services, refer to the main [Workspace Root README](../../README.md) for docker, seeding, and migration setups.
