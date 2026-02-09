# Matter.js Body Editor

A lightweight, offline-friendly visual editor for building **usable Matter.js compound bodies**.  
PixiJS renders the preview, Matter.js renders the physics preview, and the UI uses a classic Windows look.

## Features
- Rectangle, Circle, Polygon, and Vertices tools
- Vertices editing with Ctrl-drag
- Non-uniform scaling (hold Shift)
- Copy/Paste inside the app (no system clipboard)
- Per-vertex chamfer with Apply controls
- Static and Dynamic physics tests
- Auto Refresh Static (periodic rebuild)
- JSON and Matter.js code export
- Offline use (local `vendor/` scripts and fonts)

## Quick Start
Open `index.html` in a browser. No build step required.

## Controls
- **Create shape:** select a tool, click in Pixi preview  
- **Move:** drag the shape  
- **Rotate:** drag the rotation handle (disabled for circles)  
- **Scale:** drag the scale handle (hold Shift for free scaling)  
- **Nudge:** arrow keys (Shift = larger step)  
- **Delete:** remove selected shape  

## Vertices Workflow
- Use the **Vertices** tool to add points  
- Hold **Ctrl** and drag a point to move it  
- **Node Tools**
  - **New Vertices Shape**: start a new vertices object
  - **Edit Existing Vertices**: edit the currently focused vertices object

## Canvas & Preview
- Set **Width/Height** and click **Apply Size**
- Size changes are allowed only when the scene is empty or has only a background
- **Reset Project** clears all shapes and tests and enables resizing again
- **Hide Matter Preview** toggles the Matter panel

## Testing (Matter)
- **Test Body (Static):** builds a non-moving compound body
- **Test Body (Dynamic):** builds a gravity-driven body
- **Auto Refresh Static:** periodically rebuilds the static body  
  - Mutually exclusive with Dynamic
- **Clear Body:** removes test bodies (keeps boundaries)

## Export
Two outputs are provided:
- **JSON data** (for your own pipelines)
- **Code** ready to paste into Matter.js

## Folder Layout
- `index.html` — app shell
- `app.css` — layout and styles
- `src/` — logic modules
- `vendor/` — offline PixiJS and Matter.js
- `fonts/` — local 98.css fonts

## Notes
- Only rectangles preview chamfer in Pixi (other shapes show chamfer in Matter).
- Background images are displayed at 1:1 scale in Pixi.

## License
Add your license here.
