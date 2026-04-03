# Bible Cross-Reference Arc Visualization

An interactive web visualization of the Bible's internal cross-references, inspired by [Chris Harrison's famous arc diagram](https://www.chrisharrison.net/index.php/Visualizations/BibleViz). Visualize the dense network of connections between Bible passages using WebGL-accelerated arcs.

**Live Site:** https://xflaviews.github.io/bible-cross-references/

![Bible Arc Visualization](./docs/screenshot.png)

## Features

- **Interactive Arc Visualization**: Explore 65,000 cross-reference arcs on desktop (12,000 on mobile) with smooth animations
- **Book & Chapter Navigation**: Search for books, drill down from book overview to chapters to specific verses
- **Hover Tooltips**: Inspect arc details and verse references with interactive tooltips
- **Verse Viewer**: Read full KJV Bible text for selected verses in an integrated panel
- **Mobile Responsive**: Optimized for mobile with reduced arc count and touch-friendly UI
- **Testament Labels**: Clear markers for Old Testament (OT) and New Testament (NT) sections
- **Color-Coded Distance**: Rainbow gradient indicates cross-reference distance:
  - Red/Orange = short distance references
  - Yellow/Green = medium distance
  - Blue/Purple = long distance (across testaments)
- **Fast Load Times**: All data bundled as static files (binary cross-refs + JSON), no external APIs

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with React 19
- **Language**: TypeScript
- **Graphics**: [regl](https://github.com/regl-project/regl) (WebGL wrapper)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Data Format**: Binary encoded cross-references + JSON metadata
- **Deployment**: Static export to GitHub Pages

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+ (or npm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/xFlaviews/bible-cross-references.git
cd bible-cross-references

# Install dependencies
pnpm install
```

### Development

```bash
# Prepare data (parse and optimize OpenBible.info + KJV data)
pnpm run prepare-data

# Start development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the visualization.

The app will hot-reload as you edit files in `src/`.

### Production Build

```bash
# Build for static export
pnpm run build

# Output generated in ./out/
```

The `out/` directory contains a fully static site ready for deployment.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ArcCanvas.tsx      # WebGL canvas wrapper
│   ├── BibleArcViz.tsx    # Main component orchestrator
│   ├── BookSearch.tsx     # Search UI
│   ├── BookLabels.tsx     # OT/NT labels overlay
│   ├── ChapterGrid.tsx    # Chapter selection grid
│   ├── VersePanel.tsx     # Verse text viewer
│   └── UIOverlay.tsx      # UI orchestrator
├── lib/
│   ├── arc-renderer.ts    # Arc rendering pipeline
│   ├── bible-data.ts      # Data loading & parsing
│   ├── colors.ts          # Hue mapping for distance
│   ├── scales.ts          # Coordinate transformations
│   └── webgl/             # WebGL shaders and utilities
└── context/               # React Context (state management)

public/data/               # Generated at build time
├── books.json            # Book metadata (66 books)
├── chapter-index.json    # Chapter metadata & cross-ref ranges
├── verses.json           # Full KJV text (31K+ verses)
└── cross-refs.bin        # Binary cross-reference data (2.6 MB)

scripts/
├── prepare-data.ts       # Build-time data pipeline
```

## Data Sources

### Cross-References
- **Source**: [OpenBible.info](https://www.openbible.info/)
- **License**: CC-BY 3.0
- **Data**: 344,000 cross-reference pairs; top-voted pairs selected for visualization
- **Attribution**: Data is provided under Creative Commons Attribution 3.0 Unported License

### Bible Text
- **Version**: King James Version (KJV)
- **License**: Public Domain
- **Verses**: 31,102 total verses across 66 books

## Architecture

### Data Pipeline

1. **Raw Data**: OpenBible.info TSV (cross-refs) + KJV JSON (verses)
2. **Parsing** (`scripts/prepare-data.ts`):
   - Build global verse index from KJV structure
   - Parse cross-reference pairs (OSIS format → global indices)
   - Sort and index by source verse for binary search
3. **Encoding**:
   - Cross-refs: Binary format (4 bytes header + 8 bytes per pair)
   - Verses & metadata: JSON for simplicity
4. **Output**: Static files in `public/data/` (no build-time computation at runtime)

### Rendering Pipeline

1. **Data Loading** (`lib/bible-data.ts`):
   - Fetch binary cross-refs and JSON metadata
   - Parse binary buffer into typed arrays
   - Build per-arc instance data for GPU

2. **WebGL Rendering** (`lib/arc-renderer.ts`):
   - Per-arc uniforms: positions, hues, heights
   - Bezier curve arcs with configurable segments
   - Instanced rendering for 65K arcs at 60 FPS

3. **Interaction**:
   - Book selection filters visible arcs
   - Chapter drill-down updates viewport scales
   - Verse selection shows full text in side panel
   - Hover tooltips display arc details

### Performance Optimizations

- **Binary Encoding**: 2.6 MB cross-refs vs ~10+ MB if JSON
- **Instanced Rendering**: Single draw call for all arcs
- **Glow Pass**: Optional bloom effect with dual rendering
- **Mobile Adaptation**: 12K arcs on mobile, 65K on desktop
- **Static Export**: No server-side rendering, pure static site

## Development Commands

```bash
pnpm run dev           # Start development server
pnpm run build         # Build for production
pnpm run prepare-data  # Regenerate data files
pnpm run lint          # Run ESLint
```

## Customization

### Adjusting Arc Count

In `src/lib/bible-data.ts`, modify `MAX_ARCS`:

```typescript
const MAX_ARCS = 65_000; // Change to desired count
```

### Changing Colors

Color mapping is in `src/lib/colors.ts`. The distance-to-hue function controls the rainbow gradient:

```typescript
export function distanceToHue(distance: number): number {
  // Returns 0-1 hue value
}
```

### Modifying Shaders

WebGL shaders are in `src/lib/webgl/shaders.ts`. Vertex/fragment shaders control:
- Arc shape (Bezier curves)
- Color blending
- Glow effects

## Deployment

### GitHub Pages

The site is configured for static export and deploys to GitHub Pages:

```bash
pnpm run build
# Commit and push to main — GitHub Actions deploys to gh-pages branch
```

See `.github/workflows/` for CI/CD configuration.

### Other Platforms

Since this is a static site, it deploys to any static host:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any CDN

Just use `pnpm run build` and serve the `out/` directory.

## License

MIT License — see LICENSE file for details.

The Bible text is in the public domain. Cross-reference data from OpenBible.info is CC-BY 3.0.

## Credits

Inspired by [Chris Harrison's Bible Visualization](https://www.chrisharrison.net/index.php/Visualizations/BibleViz) and the 2011 Astronomy article on Bible structure.

## Contributing

Contributions welcome! Areas for enhancement:

- Additional Bible translations
- Verse search/filtering
- Custom color schemes
- Export visualization as image
- Analytics on most-referenced verses

## Troubleshooting

### Data loading fails

Ensure `public/data/` exists and contains:
- `books.json`
- `chapter-index.json`
- `verses.json`
- `cross-refs.bin`

Run `pnpm run prepare-data` to regenerate.

### Arcs not rendering

Check browser console for WebGL errors. Ensure:
- WebGL 2.0 support
- Sufficient VRAM (for 65K arcs)
- No shader compilation errors

### Mobile performance

Reduce `MAX_ARCS` or use device detection to serve fewer arcs on mobile (already implemented).
