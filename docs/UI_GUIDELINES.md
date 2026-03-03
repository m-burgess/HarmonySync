# HarmonySync UI/UX Design Guidelines

## 1. Core Philosophy
HarmonySync uses a highly structured, "VS Code-style" dark theme layout [7]. The interface must maximize space for presentation editing and live controls while remaining distraction-free. 

**Agent Directive:** Do not invent new color palettes or custom CSS classes. You MUST use the exact Tailwind CSS utility classes defined in this document for all structural and UI elements [1]. All overlays and interactive components must leverage the Angular CDK [4].

## 2. Global Color Palette (Tailwind CSS)
We use Tailwind's `slate` palette to achieve a professional, slightly cool-tinted dark mode (matching the VS Code default dark theme).

*   **App Background (The Shell):** `bg-slate-900`
*   **Panels & Sidebars:** `bg-slate-800`
*   **Borders & Dividers:** `border-slate-700`
*   **Primary Text:** `text-slate-100`
*   **Muted/Secondary Text:** `text-slate-400`
*   **Accents/Active States:** `bg-blue-600` (Hover: `bg-blue-500`)
*   **Confidence Monitor Next Lyric:** `text-yellow-400`

## 3. Application Layout (VS Code Structure)
The main control window must always implement a strict flexbox/grid layout that mirrors Visual Studio Code [2, 7].

```html
<!-- Main App Shell -->
<div class="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
  
  <!-- Left: Service Order (Primary Side Bar) -->
  <aside class="w-64 flex-shrink-0 bg-slate-800 border-r border-slate-700 flex flex-col">
    <!-- Sidebar Content -->
  </aside>

  <!-- Center: Slide Grid (Editor) -->
  <main class="flex-1 flex flex-col min-w-0 overflow-y-auto p-4">
    <!-- Grid Content -->
  </main>

  <!-- Right: Stem Mixer (Secondary Side Bar) -->
  <aside class="w-72 flex-shrink-0 bg-slate-800 border-l border-slate-700 flex flex-col">
    <!-- Mixer Content -->
  </aside>
  
</div>
4. Modals & Overlays (Strict Requirements)
AI Agents often build poor modals. To prevent this, all modals MUST be implemented using the Angular CDK Dialog module (@angular/cdk/dialog) to handle accessibility, focus trapping, and backdrop clicks.
The visual design must use the following Tailwind template:
<!-- CDK Backdrop Class -->
<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"></div>

<!-- CDK Panel Class (The Modal Body) -->
<div class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50 flex flex-col overflow-hidden">
  
  <!-- Modal Header -->
  <div class="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
    <h2 class="text-lg font-semibold text-slate-100">Modal Title</h2>
    <button class="text-slate-400 hover:text-white transition-colors">
      <!-- Close Icon -->
    </button>
  </div>

  <!-- Modal Body -->
  <div class="p-6 text-slate-300">
    <!-- Content goes here -->
  </div>

  <!-- Modal Footer -->
  <div class="px-6 py-4 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3">
    <!-- Action Buttons -->
  </div>
</div>
5. UI Components
Buttons
All buttons must have a clear hierarchy, rounded corners, and smooth transition effects.
Primary Button: px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors shadow-sm
Secondary Button: px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md font-medium transition-colors border border-slate-600
Danger/Mute Button: px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-md font-medium transition-colors border border-red-900/50
Forms & Inputs
Inputs should look indented and dark, separating them from the panel backgrounds.
Text Inputs: w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500
6. Infrastructure Screens (Confidence Monitor)
The Stage/Confidence Monitor must strictly prioritize legibility from a distance over aesthetics.
Background: bg-black (Absolute black, not slate).
Current Time / Timers: text-6xl font-mono text-slate-300
Selected (Current) Lyric: text-6xl font-bold text-white leading-tight
Next Lyric: text-6xl font-semibold text-yellow-400 leading-snug mt-4
Layout: Content must be centered vertically and horizontally using flexbox (flex flex-col items-center justify-center h-screen).