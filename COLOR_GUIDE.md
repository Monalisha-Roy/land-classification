# 🎨 Visual Style Guide - Color Preview

## Color Palette Reference

### Primary Colors (Teal/Emerald)
```
🟢 teal-50:   #f0fdfa  (Very light - backgrounds)
🟢 teal-100:  #ccfbf1  (Light - cards, hover states)
🟢 teal-200:  #99f6e4  (Soft - borders, accents)
🟢 teal-300:  #5eead4  (Medium light)
🟢 teal-400:  #2dd4bf  (Medium)
🟢 teal-500:  #14b8a6  (PRIMARY - main brand color)
🟢 teal-600:  #0d9488  (Dark - buttons, headers)
🟢 teal-700:  #0f766e  (Darker - footer)
🟢 teal-800:  #115e59  (Very dark - text)
🟢 teal-900:  #134e4a  (Darkest - headings)
```

### Accent Colors
```
💚 emerald-400: #34d399  (Positive indicators)
💚 emerald-500: #10b981  (Success states)
💚 emerald-600: #059669  (Buttons)

🔵 cyan-400:    #22d3ee  (Data/stats)
🔵 cyan-500:    #06b6d4  (Links)

🟡 amber-400:   #fbbf24  (Warnings)
🟠 orange-500:  #f59e0b  (Alerts)

🟣 purple-500:  #a855f7  (Export buttons)
🌸 pink-500:    #ec4899  (Export buttons)
```

## Component Styles

### Header
```css
Background: Animated gradient (teal-600 → teal-500 → amber-500)
Text: White with drop shadow
Border: 4px solid teal-400
Animation: 8s gradient shift
```

### Buttons
```css
Primary Action:
- Background: gradient from teal-600 to emerald-600
- Hover: gradient from teal-700 to emerald-700
- Transform: scale(1.05) on hover
- Shadow: lg → xl on hover

Export Buttons:
- CSV: teal-500 → cyan-500
- PDF: purple-500 → pink-500
- GeoJSON: orange-500 → red-500
```

### Cards
```css
Main Cards:
- Background: white with gradient to teal-50
- Border: 2px solid teal-100
- Hover: border-teal-300
- Rounded: 2xl (1rem)
- Shadow: xl

Stat Cards:
- Background: gradient (varies by type)
- Border: 2px white
- Hover: scale(1.05)
- Shadow: lg
```

### Tables
```css
Header:
- Background: gradient teal-500 → emerald-500
- Text: white, bold, uppercase
- Padding: py-4

Rows:
- Background: white
- Hover: teal-50
- Border: teal-100
```

### Status Badges
```css
Eligible (Positive):
- Background: gradient green-400 → emerald-500
- Text: white
- Icon: white checkmark
- Shadow: md

Not Eligible (Warning):
- Background: gradient yellow-400 → orange-500
- Text: white
- Icon: white warning
- Shadow: md
```

### Tabs
```css
Active Tab:
- Border-bottom: 4px teal-600
- Text: teal-700, bold
- Background: white

Inactive Tab:
- Border-bottom: transparent
- Text: teal-500
- Hover: text-teal-700, border-teal-300
```

## Gradient Combinations

### Recommended Gradients

**Data/Stats:**
```
bg-gradient-to-br from-teal-100 to-cyan-100
bg-gradient-to-br from-green-100 to-emerald-200
bg-gradient-to-r from-teal-50 to-cyan-50
```

**Warnings:**
```
bg-gradient-to-r from-amber-50 to-orange-50
bg-gradient-to-r from-yellow-50 to-orange-50
```

**Success:**
```
bg-gradient-to-r from-green-50 to-emerald-50
bg-gradient-to-br from-emerald-100 to-green-200
```

**Errors:**
```
bg-gradient-to-r from-red-50 to-pink-50
bg-gradient-to-br from-red-100 to-pink-200
```

**Backgrounds:**
```
bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50
bg-gradient-to-br from-white to-teal-50
```

## Typography

### Headings
```css
Main Title (h1):
- Size: text-3xl (1.875rem)
- Weight: bold
- Color: white (on dark bg) or teal-900
- Add emoji for visual interest

Section (h2):
- Size: text-xl (1.25rem)
- Weight: bold
- Color: teal-900
- Flex with gap-2 for emojis

Subsection (h3):
- Size: text-lg (1.125rem)
- Weight: bold
- Color: teal-900
```

### Body Text
```css
Primary: text-teal-900
Secondary: text-teal-700
Tertiary: text-teal-600
Muted: text-teal-500
```

## Spacing System

```css
Gap between cards: gap-6
Card padding: p-6
Button padding: px-6 py-3
Input padding: px-4 py-3
Section margin: mb-6
```

## Border Radius

```css
Small elements: rounded-lg (0.5rem)
Cards: rounded-xl (0.75rem)
Large cards: rounded-2xl (1rem)
Buttons: rounded-xl (0.75rem)
```

## Shadow System

```css
Small: shadow-md
Medium: shadow-lg
Large: shadow-xl
Extra large: shadow-2xl

Hover effects:
- md → lg
- lg → xl
- xl → 2xl
```

## Animation Timing

```css
Fast: 0.15s (button press)
Normal: 0.2s (most interactions)
Slow: 0.3s (complex transitions)
Background: 8s (gradient animation)
```

## Hover Effects

### Buttons
```css
- Transform: scale(1.05)
- Shadow: increase one level
- Gradient: darker variants
- Transition: all 0.2s
```

### Cards
```css
- Border: color intensifies
- Shadow: increase one level
- Optional: scale(1.02)
```

### Links/Tabs
```css
- Color: darker variant
- Border: appears/intensifies
- No transform
```

## Focus States

```css
Inputs:
- Ring: 4px ring-teal-200
- Border: border-teal-500
- Background: bg-teal-50/50

Buttons:
- Ring: 3px ring-teal-300
- Border: border-teal-600
```

## Icons & Emojis

Use emojis for visual interest:
```
🌍 - Earth/global
🗺️ - Map
🛰️ - Satellite
📊 - Statistics
💰 - Money/credits
🌳 - Trees/forest
📅 - Calendar
📄 - Document
💾 - Save/export
✓ - Success
⚠️ - Warning
```

## Accessibility Notes

- Maintain WCAG AA contrast ratios
- White text on teal-600+ is compliant
- Dark text on light backgrounds is compliant
- Focus rings are visible
- Hover states are clear

## Mobile Responsive

```css
Grid layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
Flex wraps: flex-wrap
Min widths: min-w-[200px]
Padding scales: px-4 sm:px-6 lg:px-8
```

## Quick Reference

Copy-paste ready classes:

**Primary Button:**
```
className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all"
```

**Card:**
```
className="bg-white rounded-2xl shadow-xl p-6 border-2 border-teal-100 hover:border-teal-300 transition-all"
```

**Stat Card:**
```
className="bg-gradient-to-br from-teal-100 to-cyan-100 rounded-xl p-5 shadow-lg border-2 border-white transform hover:scale-105 transition-all"
```

**Success Badge:**
```
className="px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full text-sm font-bold shadow-md"
```

**Input:**
```
className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition-all bg-teal-50/50"
```
