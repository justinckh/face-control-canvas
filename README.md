# Face Detection - Eye Tracking Project

A modern face detection and eye tracking application built with Vite, featuring modular architecture and real-time camera feed processing.

## Features

- Real-time face detection using face-api.js
- Eye position tracking with visual overlays
- Performance metrics (FPS tracking)
- Modern, modular code structure
- Fullscreen video display

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. The face-api.js models are already in the `public` folder. If you need to download them:

```bash
# Models are pre-downloaded in public/ folder
# Tiny Face Detector and Face Landmark models
```

3. Start the development server:

```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically http://localhost:3000)

4. Click "Start Detection" to begin face tracking

### Building for Production

To create a production build:

```bash
npm run build
```

## How It Works

### Architecture

The application is organized into modular services:

- **FaceDetectionService**: Handles loading face detection models and extracting eye positions
- **VideoController**: Manages video stream from the camera
- **CanvasRenderer**: Renders eye tracking overlays on the canvas
- **UIManager**: Manages UI state and button controls
- **Logger**: Provides consistent logging throughout the application

### Detection Process

1. Models are loaded (Tiny Face Detector and Tiny Face Landmarks)
2. Camera feed is initialized with optimal settings
3. Detection loop runs, processing each frame:
   - Detects face and landmarks
   - Extracts eye positions
   - Applies signal processing filters (low pass and deadzone)
   - Renders visual overlays on canvas
   - Logs coordinates and performance metrics

### Signal Processing: Low Pass Filters and Deadzone

The application uses sophisticated signal processing techniques to smooth and stabilize eye tracking data before it's used to control the camera. This prevents jittery movements and creates a more natural, responsive experience.

#### Low Pass Filters

Low pass filters are used to smooth out rapid fluctuations in eye position and distance measurements. They apply exponential moving averages to reduce noise while maintaining responsiveness.

**Location**: `src/components/FaceDetectionOverlay.jsx` (lines 3-51)

**SmoothZoom Class** (lines 4-23):

- **Purpose**: Smooths eye distance measurements (used for zoom control)
- **Alpha value**: `0.1` (default, configurable in constructor)
  - Lower values (e.g., `0.05`) = smoother, more lag
  - Higher values (e.g., `0.2`) = more responsive, less smooth
- **Formula**: `smoothed = previous * (1 - alpha) + current * alpha`
- **Initialization**: On first update, directly uses the raw value
- **Usage**: Applied to normalized eye distance (0-1 range) before deadzone filtering

**SmoothPosition Class** (lines 25-51):

- **Purpose**: Smooths eye position coordinates (x, y) for camera movement
- **Alpha value**: `0.1` (default, configurable in constructor)
- **Formula**: Applied separately to x and y coordinates:
  - `smoothed.x = previous.x * (1 - alpha) + current.x * alpha`
  - `smoothed.y = previous.y * (1 - alpha) + current.y * alpha`
- **Initialization**: On first update, directly uses the raw position
- **Usage**: Applied to normalized eye position (-1 to 1 range) before deadzone filtering

**Implementation Details**:

- Both filters are instantiated in `FaceDetectionOverlay` component (lines 95-96)
- Filters maintain internal state (`smoothedDistance` or `smoothedPosition`)
- Filters can be reset when face detection stops (lines 370-371, 418)
- The alpha value of `0.1` provides a good balance between smoothness and responsiveness

#### Deadzone Filters

Deadzone filters prevent micro-movements from triggering camera updates. They only allow updates when the change exceeds a minimum threshold, reducing unnecessary processing and eliminating jitter from small detection variations.

**Location**: `src/components/FaceDetectionOverlay.jsx` (lines 53-76)

**applyDeadzone Function** (lines 54-63):

- **Purpose**: Filters scalar values (used for eye distance)
- **Parameters**:
  - `current`: Current value to check
  - `previous`: Previous filtered value
  - `threshold`: Minimum change required to update
- **Logic**:
  - If change < threshold: returns previous value (no update)
  - If change >= threshold: returns current value (allows update)
  - On first call (no previous): always returns current value
- **Threshold**: `0.001` for normalized distance (line 99)
  - This means distance must change by at least 0.001 (0.1%) to trigger an update

**applyPositionDeadzone Function** (lines 65-76):

- **Purpose**: Filters position objects with x and y coordinates
- **Parameters**:
  - `current`: Current position object `{x, y}`
  - `previous`: Previous filtered position object
  - `threshold`: Minimum change required in either axis
- **Logic**:
  - Calculates delta for both x and y axes
  - If both deltas < threshold: returns previous value (no update)
  - If either delta >= threshold: returns current value (allows update)
  - On first call (no previous): always returns current value
- **Threshold**: `0.005` for normalized position (line 100)
  - This means position must change by at least 0.005 (0.5%) in x or y to trigger an update

#### Signal Processing Pipeline

The complete filtering pipeline processes raw detection data through multiple stages:

**For Eye Position** (`updateEyePosition` function, lines 385-413):

```
1. Raw Detection → Normalize coordinates to [-1, 1] range
2. Low Pass Filter → SmoothPosition.update() applies exponential moving average
3. Deadzone Filter → applyPositionDeadzone() checks if change exceeds threshold
4. Store Result → Update lastEyePositionRef for next comparison
5. Callback → onEyePositionChange() sends filtered value to App component
```

**For Eye Distance** (`updateEyeDistance` function, lines 415-443):

```
1. Raw Detection → Normalized distance (0-1 range)
2. Low Pass Filter → SmoothZoom.update() applies exponential moving average
3. Deadzone Filter → applyDeadzone() checks if change exceeds threshold
4. Store Result → Update lastEyeDistanceRef for next comparison
5. Callback → onEyeDistanceChange() sends filtered value to App component
```

**Key Benefits**:

- **Reduced jitter**: Low pass filters smooth out rapid fluctuations
- **Noise reduction**: Deadzone filters ignore micro-movements
- **Performance**: Fewer unnecessary updates reduce processing overhead
- **Natural feel**: Combined filters create smooth, responsive camera movement
- **Stability**: Prevents camera from shaking when user holds head still

**Configuration**:

- Low pass alpha values: Set in constructor (default `0.1`)
- Deadzone thresholds: Defined as constants (lines 99-100)
  - `distanceDeadzoneThreshold = 0.001`
  - `positionDeadzoneThreshold = 0.005`
- These values can be adjusted to tune responsiveness vs. stability

### Camera Control Parameters

The application uses eye tracking to control the 3D camera position. The following parameters control how eye movements translate into camera movements:

#### Offset (offsetXRange and offsetYRange)

The **offset** parameters define the maximum range of camera movement in 3D space. These values are clamped boundaries that prevent the camera from moving beyond certain limits.

**Variable Names & Locations**:

- `offsetXRange`: Defined in `src/App.jsx` at lines 83-90, passed to `CameraFollower` component at line 123, used in `CameraFollower` at line 31
- `offsetYRange`: Defined in `src/App.jsx` at lines 91-98, passed to `CameraFollower` component at line 124, used in `CameraFollower` at line 32

- **offsetXRange**: Controls left/right camera movement limits

  - **Near zoom** (zoom = 3): Range is `[-1.8, 1.8]` units
  - **Far zoom** (zoom = 12): Range is `[-4.5, 4.5]` units
  - The range interpolates smoothly between these values based on zoom level
  - Negative values = left movement, positive values = right movement

- **offsetYRange**: Controls up/down camera movement limits
  - **Near zoom** (zoom = 3): Range is `[-1.0, 7.0]` units
  - **Far zoom** (zoom = 12): Range is `[-3.2, 3.4]` units
  - The range interpolates smoothly between these values based on zoom level
  - Negative values = downward movement, positive values = upward movement

**How it works**: After scaling the eye position coordinates, the resulting camera position is clamped to these ranges using `MathUtils.clamp()`. This ensures the camera never moves beyond the defined boundaries, creating a controlled viewing area.

#### ScaleX and ScaleY (camScaleX and camScaleY)

The **scale** parameters are multipliers that convert eye position coordinates (from face detection) into 3D camera movement values. They determine the sensitivity and magnitude of camera movement in response to eye movements.

**Variable Names & Locations**:

- `camScaleX`: Defined in `src/App.jsx` at lines 75-78, passed to `CameraFollower` component at line 121, used in `CameraFollower` at lines 17 and 28
- `camScaleY`: Defined in `src/App.jsx` at lines 79-82, passed to `CameraFollower` component at line 122, used in `CameraFollower` at lines 18 and 29

- **camScaleX**: Horizontal (left/right) movement sensitivity

  - **Near zoom** (zoom = 3): `2.5` (less sensitive, smaller movements)
  - **Far zoom** (zoom = 12): `6.0` (more sensitive, larger movements)
  - Linearly interpolates between these values based on zoom level

- **camScaleY**: Vertical (up/down) movement sensitivity
  - **Near zoom** (zoom = 3): `8.0` (less sensitive, smaller movements)
  - **Far zoom** (zoom = 12): `25.0` (more sensitive, larger movements)
  - Linearly interpolates between these values based on zoom level

**How it works**:

1. Eye position coordinates (x, y) from face detection are multiplied by their respective scale values
2. `scaledX = eyeTarget.x * camScaleX`
3. `scaledY = eyeTarget.y * camScaleY`
4. Higher scale values mean the camera moves more for the same eye movement
5. The scale values increase with zoom level, allowing more dramatic camera movements when zoomed out

#### Camera Range (Left/Right and Up/Down)

The **camera range** refers to the combined effect of scale and offset parameters, defining the actual movement limits of the camera in 3D space.

**Variable Names & Locations**:

- The camera range is determined by the combination of `offsetXRange` and `offsetYRange` (see Offset section above)
- Camera position calculation happens in `src/App.jsx` within the `CameraFollower` component's `useFrame` hook (lines 27-44)
- The actual camera position is updated at lines 34-35 in `src/App.jsx`

**Left/Right Range (X-axis)**:

- **Minimum position** (leftmost): Ranges from `-1.8` (near zoom) to `-4.5` (far zoom)
- **Maximum position** (rightmost): Ranges from `1.8` (near zoom) to `4.5` (far zoom)
- The camera can move left and right within these bounds based on horizontal eye movement
- Controlled by `offsetXRange` array values: `[minimum, maximum]`

**Up/Down Range (Y-axis)**:

- **Minimum position** (downward): Ranges from `-1.0` (near zoom) to `-3.2` (far zoom)
- **Maximum position** (upward): Ranges from `7.0` (near zoom) to `3.4` (far zoom)
- The camera can move up and down within these bounds based on vertical eye movement
- Controlled by `offsetYRange` array values: `[minimum, maximum]`

**Zoom Effect**: All ranges dynamically adjust based on the zoom level (controlled by mouse wheel):

- **Near zoom** (zoom = 3): Tighter ranges, more controlled movement
- **Far zoom** (zoom = 12): Wider ranges, more dramatic movement
- The interpolation between near and far values creates smooth transitions
- Zoom value is stored in `zoom` state variable (defined at line 51 in `src/App.jsx`)

**Calculation Flow**:

```
1. Eye position detected → (x, y) coordinates
2. Scale applied → scaledX = x * camScaleX, scaledY = y * camScaleY
3. Clamp to offset ranges → targetX = clamp(scaledX, offsetXRange[0], offsetXRange[1])
4. Smooth interpolation → camera.position.x += (targetX - camera.position.x) * damping
```

The `damping` parameter (0.02) controls how smoothly the camera follows eye movements, creating a natural, lagged response rather than instant snapping.

## Technologies

- [Vite](https://vitejs.dev/) - Build tool and dev server
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) - Face detection library
- [Three.js](https://threejs.org/) - 3D graphics library (available for future enhancements)

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (with camera permissions)

## License

MIT
