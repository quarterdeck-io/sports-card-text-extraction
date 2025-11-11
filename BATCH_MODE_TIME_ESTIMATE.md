# Batch Mode Feature - Time Estimate

## Overview
This document provides a detailed time estimate for implementing the batch mode features for multi-card lot processing.

## Features to Implement

### 1. **Persistent Batch Mode Toggle**
- User setting to enable/disable batch mode (stored in localStorage or backend)
- UI toggle in header/settings
- **Time Estimate: 2-3 hours**

### 2. **Multi-Card Lot Identification**
- UI to identify if a card is part of a lot (small or complete)
- Lot type selection (small lot vs complete lot)
- Create lot data structure
- **Time Estimate: 4-5 hours**

### 3. **Group Scanning (3x3 Grid)**
- UI for grid-based card scanning
- Support for multiple cards in a single image or multiple images
- Grid layout interface (3x3, 2x2, or custom)
- Card position tracking within grid
- **Time Estimate: 8-12 hours**
  - *Note: If automatic grid detection is needed, add 4-6 hours for image segmentation*

### 4. **Lot Completion Workflow**
- Mark lot as complete functionality
- Validation before completion (all cards processed)
- Lot status tracking
- **Time Estimate: 3-4 hours**

### 5. **Standard Lot Title/Description Generation**
- Backend service for lot title/description generation using Gemini
- Different templates for small vs complete lots
- Aggregate card information for lot descriptions
- **Time Estimate: 6-8 hours**

## Technical Implementation Breakdown

### Backend Changes (Total: 12-16 hours)

#### Data Models & Storage
- Create `LotRecord` interface
- Extend storage to handle lots (lotStore)
- Lot-card relationship management
- **Time: 2-3 hours**

#### API Endpoints
- `POST /api/lots` - Create new lot
- `GET /api/lots/:id` - Get lot details
- `POST /api/lots/:id/cards` - Add cards to lot
- `POST /api/lots/:id/complete` - Mark lot as complete
- `POST /api/lots/:id/generate-title` - Generate lot title/description
- `GET /api/lots` - List all lots
- **Time: 4-5 hours**

#### Batch Processing Service
- Queue management for batch operations
- Parallel processing support
- Progress tracking
- **Time: 3-4 hours**

#### Lot Title/Description Service
- Gemini integration for lot descriptions
- Template system for small vs complete lots
- Aggregate card data processing
- **Time: 3-4 hours**

### Frontend Changes (Total: 14-20 hours)

#### Batch Mode Toggle
- Settings component
- Persistent storage (localStorage)
- UI integration
- **Time: 2-3 hours**

#### Lot Creation & Management UI
- Lot creation modal/form
- Lot type selection (small/complete)
- Lot list view
- Lot detail view
- **Time: 4-5 hours**

#### Grid Scanning Interface
- Grid layout component (3x3, 2x2, etc.)
- Card position assignment
- Image upload per grid cell
- Visual grid overlay
- **Time: 6-8 hours**
  - *If automatic grid detection: +4-6 hours*

#### Lot Completion Workflow
- Completion validation
- Review screen for lot
- Completion confirmation
- **Time: 2-4 hours**

### Testing & Refinement (Total: 6-8 hours)
- Unit tests for new services
- Integration testing
- UI/UX refinement
- Error handling
- Edge case handling

## Total Time Estimate

### Conservative Estimate (with buffer)
- **Backend: 16 hours (2 days)**
- **Frontend: 20 hours (2.5 days)**
- **Testing: 8 hours (1 day)**
- **Total: 44 hours (~5.5 days)**

### Optimistic Estimate (best case)
- **Backend: 12 hours (1.5 days)**
- **Frontend: 14 hours (1.75 days)**
- **Testing: 6 hours (0.75 days)**
- **Total: 32 hours (~4 days)**

### Realistic Estimate (most likely)
- **Backend: 14 hours (~2 days)**
- **Frontend: 17 hours (~2 days)**
- **Testing: 7 hours (~1 day)**
- **Total: 38 hours (~5 days)**

## Assumptions

1. **Grid Detection**: Assumes manual grid selection OR simple automatic detection. If complex computer vision is needed for automatic card detection in images, add 4-6 hours.

2. **Image Processing**: Assumes existing OCR pipeline can handle individual card images. If grid images need segmentation, add 6-8 hours.

3. **Storage**: Uses existing in-memory storage pattern. If database migration is needed, add 4-6 hours.

4. **UI Framework**: Uses existing Next.js/React/Tailwind setup. No new framework learning curve.

5. **API Integration**: Gemini API already integrated. Just need to extend for lot descriptions.

## Risk Factors That Could Increase Time

1. **Automatic Grid Detection**: If automatic card detection in grid images is required (+4-6 hours)
2. **Complex Image Segmentation**: If cards need to be extracted from single images (+6-8 hours)
3. **Database Migration**: If moving from in-memory to database (+4-6 hours)
4. **Performance Optimization**: For large batches (50+ cards) (+4-6 hours)
5. **Advanced Error Handling**: Complex retry logic, partial failures (+3-4 hours)

## Recommended Approach

### Phase 1: Core Functionality (Week 1)
- Batch mode toggle
- Lot creation and identification
- Basic lot management
- **Time: ~20 hours**

### Phase 2: Grid Scanning (Week 2)
- Grid UI implementation
- Card scanning in groups
- Lot completion workflow
- **Time: ~12 hours**

### Phase 3: Title/Description Generation (Week 2-3)
- Lot title/description service
- Gemini integration
- Template system
- **Time: ~6 hours**

### Total: ~38 hours over 2-3 weeks

## Questions to Clarify

1. **Grid Detection**: Manual selection or automatic? If automatic, what's the expected accuracy?
2. **Image Input**: Single image with multiple cards, or multiple images (one per card)?
3. **Lot Size**: Typical lot sizes? (affects UI design)
4. **Title/Description Format**: Do you have specific templates/formats for small vs complete lots?
5. **Storage**: Should lots persist across sessions, or just during active batch?
6. **Export**: Should lots export differently than individual cards?

