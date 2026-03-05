
function dashboard() {

    function renderStats() {
      const exercises = GymStack.ExerciseStore.getAll();
      const workouts  = GymStack.WorkoutStore.getAll();
      const upcoming  = GymStack.WorkoutStore.getUpcoming();

      document.getElementById('stat-exercises').textContent = exercises.length;
      document.getElementById('stat-workouts').textContent  = workouts.length;
      document.getElementById('stat-upcoming').textContent  = upcoming.length;
    }

    function renderNextWorkout() {
      const container = document.getElementById('next-workout-container');
      const upcoming  = GymStack.WorkoutStore.getUpcoming();

      if (!upcoming.length) {
        container.innerHTML = `
          <div class="dashboard_empty-state">
            <div class="dashboard_empty-state-icon">🗓️</div>
            <p class="dashboard_empty-state-text">No workouts planned</p>
            <p class="dashboard_empty-state-sub">Build your first session to get started.</p>
            <a href="create-workout.html" class="btn btn--primary">Create Workout</a>
          </div>`;
        return;
      }

      const next = upcoming[0];
      const exercises = next.exerciseIds
        .map(id => GymStack.ExerciseStore.getById(id))
        .filter(Boolean);

      container.innerHTML = `
        <div class="dashboard_next-workout">
          <p class="dashboard_next-date">${GymStack.formatDate(next.date)}</p>
          <h2 class="dashboard_next-title">${next.name}</h2>
          <div class="dashboard_next-tags">
            ${exercises.map(ex => `<span class="workout-card_tag">${ex.name}</span>`).join('')}
          </div>
          <a href="create-workout.html" class="btn btn--ghost-neon btn--sm">View Plan</a>
        </div>`;
    }

    function renderExerciseList() {
      const container = document.getElementById('exercise-list');
      const exercises = GymStack.ExerciseStore.getAll();

      if (!exercises.length) {
        container.innerHTML = `<p style="color:#555; font-size:0.875rem; padding:16px 0;">No exercises yet. <a href="add-exercise.html" style="color:#00FFCC">Add one →</a></p>`;
        return;
      }

      container.innerHTML = exercises.map(ex => {
        const badge   = GymStack.getTypeBadge(ex.type);
        const metrics = GymStack.formatMetrics(ex);
        return `
          <article class="exercise-card" role="listitem">
            <div class="exercise-card_badge exercise-card_badge--${badge.modifier}" aria-hidden="true">
              ${badge.icon}
            </div>
            <div class="exercise-card_info">
              <div class="exercise-card_name">${ex.name}</div>
              <div class="exercise-card_meta">${metrics || ex.type}</div>
            </div>
            <div class="exercise-card_actions">
              <button
                class="btn btn--icon"
                aria-label="Delete ${ex.name}"
                style="border:1px solid rgba(255,62,62,0.3); color:#FF3E3E; background:rgba(255,62,62,0.08);"
                onclick="deleteExercise('${ex.id}', '${ex.name.replace(/'/g, "\\'")}')"
              >✕</button>
            </div>
          </article>`;
      }).join('');
    }

    function renderWorkoutList() {
      const container = document.getElementById('workout-list');
      const workouts  = GymStack.WorkoutStore.getAll();

      if (!workouts.length) {
        container.innerHTML = `<p style="color:#555; font-size:0.875rem; padding:16px 0;">No workouts yet. <a href="create-workout.html" style="color:#00FFCC">Create one →</a></p>`;
        return;
      }

      container.innerHTML = workouts.map(wk => {
        const exercises = wk.exerciseIds.map(id => GymStack.ExerciseStore.getById(id)).filter(Boolean);
        return `
          <article class="workout-card" role="listitem">
            <div class="workout-card_header">
              <span class="workout-card_date">${GymStack.formatDate(wk.date)}</span>
              <button
                class="btn btn--icon btn--sm"
                style="border:1px solid rgba(255,62,62,0.3); color:#FF3E3E; background:rgba(255,62,62,0.08); width:30px; height:30px; border-radius:8px; font-size:0.7rem;"
                aria-label="Delete ${wk.name}"
                onclick="deleteWorkout('${wk.id}', '${wk.name.replace(/'/g, "\\'")}')"
              >✕</button>
            </div>
            <h3 class="workout-card_title">${wk.name}</h3>
            <div class="workout-card_exercises">
              ${exercises.map(ex => `<span class="workout-card_tag">${ex.name}</span>`).join('')}
            </div>
          </article>`;
      }).join('');
    }

    window.deleteExercise = async function(id, name) {
      const confirmed = await GymStack.confirmDialog(`Delete "${name}"?`);
      if (confirmed) {
        GymStack.ExerciseStore.delete(id);
        GymStack.showToast(`"${name}" deleted`, 'success');
        renderAll();
      }
    };

    window.deleteWorkout = async function(id, name) {
      const confirmed = await GymStack.confirmDialog(`Delete "${name}"?`);
      if (confirmed) {
        GymStack.WorkoutStore.delete(id);
        GymStack.showToast(`"${name}" deleted`, 'success');
        renderAll();
      }
    };

    function renderAll() {
      renderStats();
      renderNextWorkout();
      renderExerciseList();
      renderWorkoutList();
    }

    document.addEventListener('DOMContentLoaded', renderAll);

};

dashboard();