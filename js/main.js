/**
 * GymStack — main.js
 * Global UI logic: navigation active states, toast notifications,
 * and any shared utilities used across pages.
 */

(function () {
  'use strict';

  // ── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Highlight the correct bottom-nav item based on the current page filename.
   */
  function syncNavActiveState() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.bottom-nav__item');

    navItems.forEach(item => {
      const href = item.getAttribute('href') || '';
      const itemPage = href.split('/').pop();

      item.classList.toggle(
        'bottom-nav__item--active',
        itemPage === current || (current === '' && itemPage === 'index.html')
      );
    });
  }

  // ── Toast Notifications ────────────────────────────────────────────────────

  let toastTimer = null;

  /**
   * Show a temporary toast notification.
   * @param {string} message   - Text to display
   * @param {'success'|'error'} [type='success']
   * @param {number} [duration=2800] - Auto-hide delay in ms
   */
  function showToast(message, type = 'success', duration = 2800) {
    // Create or reuse the toast element
    let toast = document.getElementById('gs-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gs-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    // Reset classes and set new content
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '✕'}</span>
      <span>${message}</span>
    `;

    // Trigger reflow for CSS transition
    toast.offsetHeight; // eslint-disable-line no-unused-expressions
    toast.classList.add('toast--visible');

    // Auto-hide
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('toast--visible');
    }, duration);
  }

  // ── Confirm Dialog ─────────────────────────────────────────────────────────

  /**
   * Lightweight confirm dialog that replaces window.confirm for deletions.
   * Returns a Promise<boolean>.
   * @param {string} message
   * @returns {Promise<boolean>}
   */
  function confirmDialog(message) {
    return new Promise(resolve => {
      // Build modal
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 24px; backdrop-filter: blur(4px);
      `;

      overlay.innerHTML = `
        <div style="
          background: #1E1E1E; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px; padding: 24px; max-width: 320px; width: 100%;
          text-align: center;
        ">
          <p style="
            font-family: 'Barlow', sans-serif; font-size: 0.9375rem;
            color: #FFFFFF; margin-bottom: 20px; line-height: 1.5;
          ">${message}</p>
          <div style="display: flex; gap: 10px;">
            <button id="gs-confirm-cancel" style="
              flex: 1; padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
              background: #252525; color: #B3B3B3; cursor: pointer;
              font-family: 'Barlow', sans-serif; font-weight: 700;
              font-size: 0.875rem; letter-spacing: 0.06em; text-transform: uppercase;
            ">Cancel</button>
            <button id="gs-confirm-ok" style="
              flex: 1; padding: 12px; border-radius: 10px; border: none;
              background: #FF3E3E; color: #fff; cursor: pointer;
              font-family: 'Barlow', sans-serif; font-weight: 700;
              font-size: 0.875rem; letter-spacing: 0.06em; text-transform: uppercase;
            ">Delete</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#gs-confirm-ok').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
      overlay.querySelector('#gs-confirm-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
      overlay.addEventListener('click', e => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });
    });
  }

  // ── Format Helpers ─────────────────────────────────────────────────────────

  /**
   * Format an ISO date string (YYYY-MM-DD) as a friendly label.
   * e.g. "Mon 12 Jan"
   * @param {string} isoDate
   * @returns {string}
   */
  function formatDate(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  }

  /**
   * Return a human-readable metric summary for an exercise.
   * @param {Object} exercise
   * @returns {string}
   */
  function formatMetrics(exercise) {
    const m = exercise.metrics || {};
    switch (exercise.type) {
      case 'weights':
        return [
          m.sets   ? `${m.sets} sets` : null,
          m.reps   ? `${m.reps} reps` : null,
          m.weight ? `${m.weight}kg`  : null,
        ].filter(Boolean).join(' · ');
      case 'cardio':
        return [
          m.duration  ? `${m.duration} min`         : null,
          m.intensity ? `Intensity ${m.intensity}/10` : null,
        ].filter(Boolean).join(' · ');
      case 'hiit':
        return [
          m.workInterval ? `${m.workInterval}s work` : null,
          m.restInterval ? `${m.restInterval}s rest` : null,
          m.rounds       ? `${m.rounds} rounds`      : null,
        ].filter(Boolean).join(' · ');
      case 'calisthenics':
        return [
          m.sets          ? `${m.sets} sets` : null,
          m.repsToFailure ? 'To failure'     : null,
        ].filter(Boolean).join(' · ');
      default:
        return '';
    }
  }

  /**
   * Return the badge icon and modifier class for an exercise type.
   * @param {string} type
   * @returns {{ icon: string, modifier: string }}
   */
  function getTypeBadge(type) {
    const map = {
      weights:     { icon: '🏋️', modifier: 'weights' },
      cardio:      { icon: '🏃', modifier: 'cardio' },
      hiit:        { icon: '⚡', modifier: 'hiit' },
      calisthenics:{ icon: '💪', modifier: 'calisthenics' },
    };
    return map[type] || { icon: '🔥', modifier: 'weights' };
  }

  // ── DOM Ready ──────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    syncNavActiveState();
  });

  // ── Expose public API ──────────────────────────────────────────────────────

  window.GymStack = window.GymStack || {};
  Object.assign(window.GymStack, {
    showToast,
    confirmDialog,
    formatDate,
    formatMetrics,
    getTypeBadge,
  });

})();
