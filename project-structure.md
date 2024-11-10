# Project Structure

kyros-business-ontology/
├── app/
│ ├── fonts/
│ │ ├── GeistVF.woff
│ │ └── GeistMonoVF.woff
│ ├── layout.tsx
│ ├── page.tsx
│ └── globals.css
│
├── components/
│ └── ui/
│ ├── json-ld-table.tsx
│ ├── notes-panel.tsx
│ └── [other UI components]
│
├── lib/
│ ├── example.jsx
│ ├── graphInitializer.ts
│ └── utils.ts
│
├── types/
│ └── graph.ts
│
├── public/
│ └── [public assets]
│
├── .next/
├── node_modules/
├── .gitignore
├── components.json
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── project-structure.md
├── README.md
├── tailwind.config.ts
├── tsconfig.json
└── .eslintrc.json

## Key Files and Their Purposes

### App Directory
- `layout.tsx`: Root layout component with font configurations
- `page.tsx`: Main page component with graph visualization
- `globals.css`: Global styles and Tailwind configurations

### Components Directory
- `ui/`: Contains reusable UI components
  - `json-ld-table.tsx`: Table view for JSON-LD data
  - `notes-panel.tsx`: Side panel for displaying node details
  - [Other UI components for the application]

### Lib Directory
- `example.jsx`: Contains sample JSON-LD data structure
- `graphInitializer.ts`: D3.js graph initialization and management
- `utils.ts`: Utility functions for styling and relationship mapping

### Types Directory
- `graph.ts`: TypeScript interfaces for graph nodes and data structures

### Configuration Files
- `components.json`: shadcn/ui configuration
- `next.config.mjs`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `postcss.config.mjs`: PostCSS configuration
- `.eslintrc.json`: ESLint configuration

### Package Management
- `package.json`: Project dependencies and scripts
