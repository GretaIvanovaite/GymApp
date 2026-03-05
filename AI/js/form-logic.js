/**
 * GymStack — form-logic.js
 * Handles the conditional field display on the Add Exercise form.
 * When the user picks an exercise type, only the relevant metric
 * inputs are shown (with animation) and required attributes are managed.
 */

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────

  /**
   * Maps each exercise type to the IDs of metric sections that should be shown.
   * All other sections are hidden.
   */
  const TYPE_SECTIONS = {
    weights:      ['metrics-weights'],
    cardio:       ['metrics-cardio'],
    hiit:         ['metrics-hiit'],
    calisthenics: ['metrics-calisthenics'],
  };

  // ── Core Logic ─────────────────────────────────────────────────────────────

  /**
   * Show only the metric sections relevant to the selected type.
   * Manages `required` attributes so non-visible fields don't block submission.
   * @param {string} selectedType
   */
  function showMetricSections(selectedType) {
    const allSections = document.querySelectorAll('.metric-section');

    allSections.forEach(section => {
      const shouldShow = (TYPE_SECTIONS[selectedType] || []).includes(section.id);

      if (shouldShow) {
        section.style.display = 'block';
        // Re-enable required on mandatory inputs
        section.querySelectorAll('[data-required]').forEach(input => {
          input.required = true;
        });
      } else {
        section.style.display = 'none';
        // Remove required so hidden fields don't block form submission
        section.querySelectorAll('input, select').forEach(input => {
          input.required = false;
        });
      }
    });
  }

  /**
   * Read all currently visible metric inputs and return them as an object.
   * @param {string} type - exercise type
   * @returns {Object}
   */
  function collectMetrics(type) {
    const metrics = {};

    switch (type) {
      case 'weights':
        metrics.sets   = parseInt(document.getElementById('w-sets')?.value)   || null;
        metrics.reps   = parseInt(document.getElementById('w-reps')?.value)   || null;
        metrics.weight = parseFloat(document.getElementById('w-weight')?.value) || null;
        break;
      case 'cardio':
        metrics.duration  = parseInt(document.getElementById('c-duration')?.value)  || null;
        metrics.intensity = parseInt(document.getElementById('c-intensity')?.value) || null;
        break;
      case 'hiit':
        metrics.workInterval = parseInt(document.getElementById('h-work')?.value)   || null;
        metrics.restInterval = parseInt(document.getElementById('h-rest')?.value)   || null;
        metrics.rounds       = parseInt(document.getElementById('h-rounds')?.value) || null;
        break;
      case 'calisthenics': {
        const toggle = document.getElementById('cal-failure');
        metrics.sets        = parseInt(document.getElementById('cal-sets')?.value) || null;
        metrics.repsToFailure = toggle ? toggle.checked : false;
        break;
      }
      default:
        break;
    }

    return metrics;
  }

  // ── Intensity Slider Live Preview ──────────────────────────────────────────

  function initIntensitySlider() {
    const slider = document.getElementById('c-intensity');
    const display = document.getElementById('c-intensity-display');
    if (!slider || !display) return;

    const update = () => {
      display.textContent = slider.value;
      // Colour the label based on value
      const v = parseInt(slider.value);
      if (v <= 3)       display.style.color = '#00FFCC';
      else if (v <= 6)  display.style.color = '#FFB830';
      else              display.style.color = '#FF3E3E';
    };

    slider.addEventListener('input', update);
    update(); // initialise
  }

  // ── Form Submission ────────────────────────────────────────────────────────

  function initForm() {
    const form = document.getElementById('exercise-form');
    if (!form) return;

    // Type selectors
    const typeRadios = document.querySelectorAll('.type-selector__option');
    typeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) showMetricSections(radio.value);
      });
    });

    // Show sections for the initially selected type (default: 'weights')
    const defaultType = form.querySelector('.type-selector__option:checked');
    if (defaultType) showMetricSections(defaultType.value);

    // Media URL preview
    const mediaUrlInput = document.getElementById('media-url');
    const mediaPreview  = document.getElementById('media-preview');
    if (mediaUrlInput && mediaPreview) {
      mediaUrlInput.addEventListener('blur', () => {
        const url = mediaUrlInput.value.trim();
        if (!url) return;

        const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) || url.includes('youtube') || url.includes('vimeo');
        mediaPreview.innerHTML = isVideo
          ? `<video src="${url}" muted loop autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></video>`
          : `<img src="${url}" alt="Exercise media preview" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<span style=color:#FF3E3E>Invalid URL</span>'">`;
      });
    }

    // Submit
    form.addEventListener('submit', e => {
      e.preventDefault();

      const selectedTypeEl = form.querySelector('.type-selector__option:checked');
      if (!selectedTypeEl) {
        window.GymStack?.showToast('Please select an exercise type', 'error');
        return;
      }

      const type = selectedTypeEl.value;
      const data = {
        name:        document.getElementById('ex-name').value.trim(),
        description: document.getElementById('ex-description').value.trim(),
        type,
        mediaUrl:    document.getElementById('media-url')?.value.trim() || '',
        mediaType:   'image', // default; could be extended to detect video
        metrics:     collectMetrics(type),
      };

      if (!data.name) {
        window.GymStack?.showToast('Exercise name is required', 'error');
        return;
      }

      const saved = window.GymStack?.ExerciseStore?.create(data);
      if (saved) {
        window.GymStack?.showToast(`"${saved.name}" saved!`, 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      } else {
        window.GymStack?.showToast('Failed to save exercise', 'error');
      }
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    initForm();
    initIntensitySlider();
  });

})();
