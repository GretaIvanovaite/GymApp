/**
 * GymStack — workout-player.js
 * Handles the Workout Builder (create-workout.html):
 *  - Renders the exercise checklist
 *  - Manages selected exercise state
 *  - Renders the order panel with move-up/down controls
 *  - Handles form submission to WorkoutStore
 */

(function () {
  'use strict';

  // State
  let selectedIds = []; // Ordered array of selected exercise IDs

  // ── Render Helpers ─────────────────────────────────────────────────────────

  /**
   * Render the full exercise selection list.
   */
  function renderExerciseList() {
    const container = document.getElementById('exercise-pick-list');
    if (!container) return;

    const exercises = window.GymStack?.ExerciseStore?.getAll() || [];

    if (exercises.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px 0; color: #555;">
          <div style="font-size: 2rem; margin-bottom: 12px; opacity:0.4">💪</div>
          <p style="font-size:0.875rem;">No exercises yet. <a href="add-exercise.html" style="color:#00FFCC">Add one first</a>.</p>
        </div>`;
      return;
    }

    container.innerHTML = exercises.map(ex => {
      const badge   = window.GymStack?.getTypeBadge(ex.type);
      const metrics = window.GymStack?.formatMetrics(ex);
      const isSelected = selectedIds.includes(ex.id);

      return `
        <div
          class="workout-builder__exercise-item ${isSelected ? 'workout-builder__exercise-item--selected' : ''}"
          data-id="${ex.id}"
          role="checkbox"
          aria-checked="${isSelected}"
          tabindex="0"
        >
          <div class="workout-builder__check">${isSelected ? '✓' : ''}</div>
          <div class="exercise-card__badge exercise-card__badge--${badge.modifier}">
            ${badge.icon}
          </div>
          <div class="exercise-card__info">
            <div class="exercise-card__name">${ex.name}</div>
            <div class="exercise-card__meta">${metrics || ex.type}</div>
          </div>
        </div>`;
    }).join('');

    // Bind click & keyboard events
    container.querySelectorAll('.workout-builder__exercise-item').forEach(item => {
      const toggle = () => toggleExercise(item.dataset.id);
      item.addEventListener('click', toggle);
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /**
   * Render the order panel showing selected exercises with move controls.
   */
  function renderOrderPanel() {
    const panel = document.getElementById('order-panel');
    const empty = document.getElementById('order-empty');
    const countEl = document.getElementById('selected-count');

    if (countEl) countEl.textContent = selectedIds.length;

    if (!panel) return;

    if (selectedIds.length === 0) {
      panel.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    panel.innerHTML = selectedIds.map((id, idx) => {
      const ex = window.GymStack?.ExerciseStore?.getById(id);
      if (!ex) return '';
      return `
        <div class="workout-builder__order-item" data-id="${ex.id}">
          <span class="workout-builder__order-num">${idx + 1}</span>
          <span class="workout-builder__order-name">${ex.name}</span>
          <div class="workout-builder__order-btns">
            <button
              class="move-btn"
              data-dir="up"
              data-idx="${idx}"
              aria-label="Move ${ex.name} up"
              ${idx === 0 ? 'disabled' : ''}
            >▲</button>
            <button
              class="move-btn"
              data-dir="down"
              data-idx="${idx}"
              aria-label="Move ${ex.name} down"
              ${idx === selectedIds.length - 1 ? 'disabled' : ''}
            >▼</button>
          </div>
        </div>`;
    }).join('');

    // Move buttons
    panel.querySelectorAll('.move-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const dir = btn.dataset.dir;
        moveExercise(idx, dir);
      });
    });
  }

  // ── State Mutators ─────────────────────────────────────────────────────────

  function toggleExercise(id) {
    const pos = selectedIds.indexOf(id);
    if (pos === -1) {
      selectedIds.push(id);
    } else {
      selectedIds.splice(pos, 1);
    }
    renderExerciseList();
    renderOrderPanel();
  }

  function moveExercise(idx, direction) {
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= selectedIds.length) return;
    [selectedIds[idx], selectedIds[swapWith]] = [selectedIds[swapWith], selectedIds[idx]];
    renderOrderPanel();
  }

  // ── Date Picker ────────────────────────────────────────────────────────────

  function initDatePicker() {
    const strip    = document.getElementById('date-strip');
    const input    = document.getElementById('workout-date');
    const display  = document.getElementById('date-display');
    if (!strip || !input || !display) return;

    // Default to today
    const today = new Date().toISOString().split('T')[0];
    input.value = today;
    display.textContent = window.GymStack?.formatDate(today);

    // Open native date picker on strip click
    strip.addEventListener('click', () => input.showPicker?.());

    input.addEventListener('change', () => {
      display.textContent = window.GymStack?.formatDate(input.value) || 'Pick a date';
    });
  }

  // ── Form Submit ────────────────────────────────────────────────────────────

  function initForm() {
    const form = document.getElementById('workout-form');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();

      const name = document.getElementById('workout-name')?.value.trim();
      const date = document.getElementById('workout-date')?.value;

      if (!name) {
        window.GymStack?.showToast('Please enter a workout name', 'error');
        return;
      }
      if (!date) {
        window.GymStack?.showToast('Please pick a date', 'error');
        return;
      }
      if (selectedIds.length === 0) {
        window.GymStack?.showToast('Add at least one exercise', 'error');
        return;
      }

      const saved = window.GymStack?.WorkoutStore?.create({
        name,
        date,
        exerciseIds: [...selectedIds],
      });

      if (saved) {
        window.GymStack?.showToast(`"${saved.name}" saved!`, 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        window.GymStack?.showToast('Failed to save workout', 'error');
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    renderExerciseList();
    renderOrderPanel();
    initDatePicker();
    initForm();
  });

})();
