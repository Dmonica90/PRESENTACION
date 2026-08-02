# CLAUDE.md - Burnout Prevention & Workplace Well-being Course

## Project Overview

This is an **interactive e-learning course** in Spanish titled *"Prevención y atención del Burnout y Bienestar Laboral"* (Burnout Prevention and Workplace Well-being). It's a SCORM 1.2-compliant course designed to be delivered through Learning Management Systems (LMS), with rich multimedia content and interactive assessments.

**Key Info:**
- **Language:** Spanish
- **Format:** SCORM 1.2 package
- **Target:** Corporate training for burnout awareness and prevention
- **Delivery:** Browser-based, LMS-integrated
- **Author/Owner:** GS1 (based on logo usage)

---

## Project Structure

### Root Directory Files
- **`index.html`** - Main entry point and course container (157KB)
- **`imsmanifest.xml`** - SCORM package manifest defining course structure and resources
- **`metadata.xml`** - Course metadata
- **SCORM Schema Files** (`.xsd`) - XML validation schemas for SCORM/IMS standards
  - `adlcp_rootv1p2.xsd`, `imscp_rootv1p1p2.xsd`, `imsmd_rootv1p2p1.xsd`, `ims_xml.xsd`

### Core Directories

#### `/js` - JavaScript Engine
- **`SCORM_API_wrapper.js`** (29KB) - Pipwerks SCORM API wrapper for LMS communication
- **`script.js`** (97KB) - Main course engine handling:
  - Navigation (previous/next/menu)
  - Slide management and transitions
  - Quiz/assessment logic
  - SCORM data reporting (scores, time, completion status)
  - Video/media playback
  - Feedback popups
  - Progress tracking
- **`burnout.js`** (9.5KB) - Course-specific helper functions:
  - Info popup handling
  - Video playback wrappers
  - Button state management (viewed/active)
  - Panel/tab content display
  - Course-specific interactions
- **`libs/lottie.min.js`** - Animation library for Lottie JSON animations

#### `/css` - Styling
- **`styles.css`** - Main course styles (navigation, slides, forms)
- **`burnout.css`** - Course-specific styling (colors, layouts, animations)
- Uses CSS custom properties (variables) for theming (e.g., `--color-naranja-gs1`)

#### `/img` - Images & Assets
- **Logo:** `logo/Logo GS1 azul.png`
- **Content Images:** `001-032_Burnout_GS1.jpg`, `001-002_IntroRetro_GS1.*` 
- **UI Icons:** `bullet.svg`, `icon_clic.svg`, `scroll.svg` (navigation indicators)
- PNG and JPG formats used for responsive layouts

#### `/fonts` - Typography
- **Montserrat Font Family** (WOFF2 format, subsetted)
  - Weights: Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black
  - Italic variants available
  - Modern, clean sans-serif for corporate design

#### `/audios` - Audio Content
- **Course Narration:** MP3 files for slide content
  - `1-5. OPORTUNIDAD, CLARIDAD, OBJETIVIDAD, RESPETO, EQUILIBRIO.mp3`
  - `Situacion.mp3`, `SegundaConversacion.mp3`
  - `Fase2_1-5.mp3` - Multi-part phase content
- Used for voiceover/narration of course sections

#### `/animations` - Lottie Animations (JSON)
- **`courses.json`** - Main course animation
- **`credit-score.json`** - Credit score animation (likely for a quiz/assessment slide)
- Embedded and rendered by Lottie.js for smooth web animations

#### `/Guiones` - Course Scripts & Metadata (Word/PDF)
- **Unit Scripts:** Structured scripts for course content
  - Unidad_01, Unidad_02, Unidad_03, Unidad_Cierre (units + closing)
  - Content Types:
    - `*_video.docx` - Video narration scripts
    - `*_infografia.docx` - Infographic/visual content
    - `*_interactivo_*.docx` - Interactive scenario content
    - `*_documento_cuestionario.docx/pdf` - Assessment questionnaires
- **Main Presentation:** `Guion_BURNOUT_GS1_vf.pptx` - Presentation outline

#### `/test` - Test & Demo Pages
- `index.html` - Test home
- `Test_MBI.html` - MBI (Maslach Burnout Inventory) test
- `Caso_1.html`, `Caso_2.html` - Interactive case studies
- `interactivo_caso.html` - Interactive scenario template

---

## Architecture & Technical Stack

### Course Engine (script.js)
The main JavaScript engine provides:

1. **SCORM Integration**
   - Pipwerks API wrapper for LMS communication
   - Tracks: lesson status, scores, session time
   - Reports: completion, pass/fail, time spent
   - Gracefully degrades to local mode if no LMS present

2. **Navigation System**
   - Slide-based architecture (`.slide` elements)
   - Modular dropdown menu for jumping to units
   - Previous/Next buttons with state management
   - Home button to return to intro
   - Progress bar visualization

3. **Quiz/Assessment System**
   - Question index tracking
   - Answer validation and scoring
   - Score reporting to LMS (0-100 scale)
   - Pass/Fail determination
   - Feedback presentation

4. **Media Handling**
   - Video playback in fullscreen overlay
   - Audio playback with global object management
   - Lottie animation rendering
   - Image optimization for responsive design

5. **State Management**
   - `currentSlideIndex` - Current slide position
   - `currentQuestionIndex` - Quiz question counter
   - `finalExamPassed` - Assessment completion flag
   - Audio/video state tracking

### Course-Specific Helpers (burnout.js)
Provides:
- `bnOpenInfo(btn, contentId, title, wide)` - Info popup handler
- `bnOpenVideo(btn, url, slideId)` - Video playback launcher
- `bnMarkViewed(btn)` - Button state management
- `bnShowPanel(btn, panelId)` - Tab/panel content display
- Icon and color management for interactive elements

### Styling System
- **CSS Variables** for theming: `--color-naranja-gs1`, `--color-azul-gs1`, etc.
- **Responsive Design** using flexbox/grid
- **Color Scheme:** Corporate GS1 branding (orange, blue, white)
- **Typography:** Montserrat family for modern, clean look

---

## Key Features

### Interactive Elements
1. **Info Tiles/Buttons** - Click to reveal detailed information
   - Visual badges (numbers, SVG icons)
   - Color-coded by section
   - Pulsing animation to draw attention
   - State tracking (viewed/unviewed)

2. **Video Playback** - Full-screen video overlay with controls
   - Integrated with SCORM tracking
   - Marked as viewed when played

3. **Case Studies** - Interactive scenario-based learning
   - Multiple branching options
   - Feedback on choices
   - Named scenarios (Caso_1, Caso_2)

4. **Quizzes & Assessments** 
   - Embedded assessment (MBI test reference)
   - Score tracking
   - Pass/fail determination
   - Result feedback

5. **Navigation Aids**
   - Navigation guide overlay (shown at start)
   - Scroll indicators for content overflow
   - Progress bar showing course completion
   - Module dropdown for quick access

### Content Organization
- **Unidad_01** - Burnout introduction and basics
- **Unidad_02** - Document/questionnaire phase
- **Unidad_03** - Case studies and advanced scenarios
- **Unidad_Cierre** - Course closing and evaluation

---

## Development Workflows

### Adding New Slides

1. **Create HTML Structure** in `index.html`
   ```html
   <div class="slide" id="slide-X">
       <div class="slide-header">
           <img class="logo-img" src="img/logo/Logo GS1 azul.png" alt="Logo">
           <p class="page-title">Título</p>
       </div>
       <div class="slide-content">
           <!-- Content here -->
       </div>
   </div>
   ```

2. **Add Navigation Logic** in `script.js`
   - Update `totalSlides` if needed
   - Add slide-specific interactions if needed

3. **Style in CSS**
   - Use classes matching pattern: `.slide`, `.slide-content`, etc.
   - Leverage CSS variables for colors
   - Ensure responsive design

4. **Test**
   - Verify slide appears in menu
   - Test navigation forward/backward
   - Verify SCORM tracking if applicable

### Adding Interactive Content

1. **For Info Popups:**
   - Create button with `onclick="bnOpenInfo(this, 'contentId', 'Title', false)"`
   - Create hidden div with `id="contentId"` and `class="bn-popup-src"`
   - Content is extracted and displayed in popup

2. **For Videos:**
   - Add button: `onclick="bnOpenVideo(this, 'video-url', 'slideId')"`
   - Video plays in fullscreen overlay
   - Marked as viewed after playback

3. **For Animations:**
   - Load Lottie JSON via `lottie.loadAnimation()`
   - Reference animation in `/animations` folder
   - Ensure animation JSON is included in `imsmanifest.xml`

### Adding Audio

1. Place `.mp3` files in `/audios`
2. Reference in HTML or JavaScript
3. Consider adding to `imsmanifest.xml` resource list
4. Manage global audio object via `globalAudioObject` in script.js

### Modifying Styles

- **Colors:** Update CSS variables in `:root` or class-specific rules
- **Fonts:** Montserrat is pre-loaded; add new weights to `/fonts`
- **Layout:** Use flexbox/grid for responsive design
- **Animations:** Add keyframe animations to `burnout.css`

---

## SCORM Integration

### How It Works
1. **Initialization:** `initSCORM()` called on page load
   - Connects to LMS via Pipwerks wrapper
   - Marks lesson as "incomplete" on first attempt
   
2. **Score Reporting:** `reportScoreToLMS(score, passed)`
   - Sets `cmi.core.score.raw` (0-100)
   - Sets `cmi.core.lesson_status` (passed/failed/completed)
   - Saves data via `scorm.save()`

3. **Time Tracking:** `finishSCORM()`
   - Calculates total session time from `startTime`
   - Formats as SCORM 1.2 time: `HH:MM:SS`
   - Reports via `cmi.core.session_time`

4. **Course Exit:** `exitCourse()`
   - Finalizes SCORM connection
   - Attempts to close browser window
   - Shows fallback message if close blocked

### SCORM Data Tracked
- **Lesson Status:** not attempted → incomplete → (passed/failed) → completed
- **Score:** Raw score (0-100), Min (0), Max (100)
- **Time:** Total session duration
- **Exit:** Normal exit indication

### Local/Offline Mode
If no LMS connection detected, course still runs with console logging for testing.

---

## File Dependencies

### Critical Files
- `index.html` - Must be entry point (defined in `imsmanifest.xml`)
- `js/script.js` - Must load before course functionality works
- `js/burnout.js` - Must load after script.js (depends on functions there)
- `js/SCORM_API_wrapper.js` - Must load for LMS integration

### Resource References
- All assets in `imsmanifest.xml` should match actual file paths
- Image paths: `img/` directory relative to root
- Font paths: `fonts/` directory (WOFF2 for modern browsers)
- Audio paths: `audios/` directory
- Animation paths: `animations/` directory

### Package Contents for SCORM Deployment
When packaging for LMS delivery:
1. Compress entire directory as ZIP
2. Include all files and folder structure
3. `imsmanifest.xml` must be at root
4. SCORM validator will check schema compliance
5. Deploy ZIP to LMS as course package

---

## Common Tasks for AI Assistants

### Content Updates
- **Text changes:** Edit directly in `index.html` slide content
- **Image replacement:** Drop new image in `/img`, update `<img src=` paths
- **Audio updates:** Replace MP3s in `/audios`, update `src=` attributes
- **Styling tweaks:** Modify `css/burnout.css` for course-specific changes

### Debugging
- **Not visible:** Check `display: none` in CSS, verify slide ID is referenced
- **SCORM not tracking:** Open DevTools, check `console.log()` output for connection status
- **Video not playing:** Verify video URL is accessible, check fullscreen overlay styling
- **Animations not rendering:** Ensure Lottie.min.js loaded, check JSON path in `lottie.loadAnimation()`

### Performance Optimization
- **Large images:** Compress JPGs, consider WebP with fallbacks
- **Audio optimization:** Use MP3 128kbps minimum for clarity
- **Font loading:** WOFF2 is already optimized; avoid additional font families
- **SCORM data:** Clean up unused CMI entries to reduce LMS traffic

### Accessibility
- Always include `alt` text on images
- Use semantic HTML (`<h1>`, `<button>`, `<nav>`)
- Ensure color contrast meets WCAG standards
- Test keyboard navigation (Tab, Enter, Arrow keys)
- Consider captions for audio/video content

---

## Conventions & Best Practices

### Naming Conventions
- **Slide IDs:** `slide-X` (where X is numeric sequence)
- **CSS Classes:** 
  - `.slide` - Slide container
  - `.bn-` prefix for burnout-specific components
  - `.active` for active state
  - `.viewed` for interacted elements
- **JavaScript Functions:**
  - `bn*` prefix for burnout helpers
  - `SCORM` connection via `pipwerks.SCORM`
  - Global: `currentSlideIndex`, `currentQuestionIndex`

### HTML Structure
- Each slide is a `.slide` `<div>`
- Slides contain `.slide-header` (logo + title) and content area
- Interactive elements use buttons with descriptive `onclick` handlers
- Hidden content stored in divs with `bn-popup-src` class

### CSS Classes for Interactive States
- `.active` - Currently active/selected
- `.viewed` - Already interacted with
- `.pulse-attention` / `.js-init-pulse` - Animation to draw attention
- `.is-wide` - Popup width variant for tables

### Linting & Code Quality
- No formal linter configured; follow patterns in existing code
- Comment SCORM sections and complex logic
- Keep functions modular and reusable
- Use consistent indentation (4 spaces visible in HTML)

### Testing & QA
- Test slide navigation (all forward/back paths)
- Verify all interactive elements work
- Check SCORM reporting (if LMS available)
- Validate audio/video playback
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test responsive design on mobile (if target audience includes mobile)

---

## Version Control

### Branch Strategy
Main branch contains stable, deployable code.

### Commit Messages
Recent commits follow pattern: "NewContent", "Update_Text_interfce", "Modificaion_deTexto", etc.
When contributing:
- Use descriptive messages
- Reference slide/section affected: `Update Unidad_02 video content`
- Keep commits atomic when possible

### Deployment
Course is packaged and deployed to LMS as SCORM ZIP.
After changes:
1. Test locally in browser
2. Verify SCORM manifest is current
3. Re-zip entire directory
4. Deploy to LMS
5. Test completion and score tracking in LMS

---

## Resources & References

### External Libraries
- **Pipwerks SCORM API Wrapper** - Open-source SCORM 1.2 integration
- **Lottie.js** - Animation library for JSON-based animations
- **Montserrat Font** - Google Fonts (pre-downloaded as WOFF2)

### Standards Compliance
- **SCORM 1.2** - Course packaged and compliant
- **IMS Global Learning** - Manifest structure follows IMS Content Packaging
- **XML Schemas** - SCORM validation via included `.xsd` files

### LMS Compatibility
- Tested with LMS systems supporting SCORM 1.2
- Graceful degradation for offline/local use
- Compatible with major LMS platforms (Moodle, Blackboard, Canvas, etc.)

---

## Future Enhancement Ideas

- Add offline mode with service workers
- Implement progress saving/resumption
- Add multilingual support (currently Spanish only)
- Enhance mobile responsiveness
- Add accessibility features (captions, ARIA labels)
- Implement adaptive learning paths based on quiz scores
- Add downloadable certificates
- Integrate with analytics platforms

---

## Contact & Maintenance

**Repository:** Dmonica90/PRESENTACION  
**Primary Language:** Spanish  
**Format:** SCORM 1.2 Package  
**Last Updated:** August 2026

For questions about course content, refer to `/Guiones` directory for source scripts.  
For technical issues, check console logs and SCORM wrapper output in DevTools.
