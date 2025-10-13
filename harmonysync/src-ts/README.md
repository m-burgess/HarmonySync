# TypeScript Implementation - VS Code Inspired UI

This directory contains a modular TypeScript implementation inspired by VS Code's architecture, as an alternative to the React-based UI.

## Architecture

The application is built using:
- **TypeScript**: Core application logic
- **HTML**: Semantic markup
- **LESS**: CSS preprocessor for styling (inspired by VS Code)
- **No Framework**: Vanilla TypeScript with a custom component system

## Directory Structure

```
src-ts/
├── components/           # Reusable components
│   ├── Component.ts     # Base component class
│   ├── setlist/         # Service order management
│   ├── slides/          # Slide grid and screen buttons
│   └── multitrack/      # Multitrack player
├── styles/              # LESS stylesheets
│   ├── variables.less   # VS Code color theme
│   ├── main.less        # Main application styles
│   └── components/      # Component-specific styles
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── App.ts               # Main application class
├── main.ts              # Entry point
└── vite-env.d.ts        # Vite environment types
```

## Components

### Base Component Class
All UI components extend the `Component` base class which provides:
- DOM element management
- Event listener tracking and cleanup
- Lifecycle methods
- Utility methods for DOM manipulation

### SetlistManager (Left Column)
Manages the service order with features like:
- Display song/presentation list
- Load/unload items
- Reorder items (drag & drop - future)
- Visual indicators for loaded items

### SlideManager (Center Area)
Displays slides in a grid layout with:
- Slide previews
- Keyboard navigation (arrow keys)
- Screen buttons (Audience, Confidence, Lower Thirds)
- Slide selection

### MultitrackPlayer (Bottom Panel)
Audio control interface with:
- Transport controls (play, pause, stop, rewind)
- Per-track volume sliders
- Pan controls (L-C-R buttons)
- Mute and solo buttons
- Time display

## Styling

The LESS stylesheets follow VS Code's Dark+ theme:
- Dark backgrounds (#1e1e1e, #252526, #2d2d30)
- Subtle borders (#3e3e42)
- Blue accents (#007acc)
- Consistent spacing and typography
- Smooth transitions

## Layout

```
┌────────────────────────────────────────┐
│          Menu Bar (Tauri)              │
├──────────┬─────────────────────────────┤
│          │   Slide Grid                │
│ Service  │   + Screen Buttons          │
│ Order    │                             │
│ (Left)   │                             │
│          │                             │
├──────────┴─────────────────────────────┤
│   Multitrack Player (Bottom)           │
└────────────────────────────────────────┘
```

## Running the TypeScript Version

### Development
```bash
npm run dev
```
Then navigate to `/index-ts.html`

### Production Build
```bash
npm run build
```
The TypeScript version will be built to `dist/index-ts.html`

## Key Features

1. **Modular Architecture**: Each component is self-contained with its own logic and styles
2. **Type Safety**: Full TypeScript support with strict type checking
3. **Performance**: No framework overhead, direct DOM manipulation
4. **VS Code-like**: Familiar look and feel for developers
5. **Maintainable**: Clear separation of concerns

## Comparison with React Version

| Aspect | React Version | TypeScript Version |
|--------|--------------|-------------------|
| Framework | React 19 | Vanilla TypeScript |
| Styling | CSS + Tailwind | LESS |
| Bundle Size | ~90KB (minified) | ~15KB (minified) |
| State Management | React hooks | Class-based state |
| Component Model | JSX components | Class-based components |
| Learning Curve | React knowledge required | Basic TS/JS knowledge |

## Future Enhancements

- [ ] Add drag-and-drop for service order
- [ ] Implement context menus
- [ ] Add keyboard shortcuts panel
- [ ] Implement split view for slides
- [ ] Add themes (light mode, high contrast)
- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Add animations and transitions
- [ ] Implement virtual scrolling for large lists

## Testing

To test the application with sample data:
1. Open the browser console
2. Run: `app.loadTestData()`

This will populate the service order with sample songs and presentations.

## Contributing

When adding new components:
1. Extend the `Component` base class
2. Create a corresponding LESS file in `styles/components/`
3. Import the LESS file in `styles/index.less`
4. Export the component in its index file
5. Add TypeScript interfaces in `types/index.ts`
