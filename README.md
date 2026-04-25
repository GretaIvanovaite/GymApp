# GymApp: Personal Workout Tracker

This application is a university project developed for the CIS3413 Advanced Web Portfolio module at Edge Hill University. It serves as a technical prototype demonstrating complex client-side data management and offline storage capabilities.

GymApp is a focused tool for users to manage their exercise library and build structured workout routines.

## Key Features
*   Exercise Management: Create and edit exercises with specific data points (weight, sets, reps, rest).
*   Routine Builder: Link exercises together into reusable workout routines.
*   Offline-First Storage: Uses IndexedDB to store all user data locally on the device, requiring no backend account.
*   High Accessibility: Designed to meet WCAG 2.1 AAA standards with high-contrast visuals and full screen-reader support.
*   Responsive Design: Adapts seamlessly to mobile, tablet, and desktop viewports.

## Tech Stack
*   Frontend: Vanilla JavaScript (ES6+), HTML5, CSS3.
*   Storage: IndexedDB API for relational-style client-side data persistence.
*   Architecture: Separation of concerns between the storage wrapper (storage.js) and the UI layer.

## How to Run
Open index.html in a modern web browser. All data is stored within your browser's IndexedDB.
