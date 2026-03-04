/**
 * GymStack — storage.js
 * LocalStorage CRUD layer for exercises and workouts.
 * All data lives under two keys: 'gymstack_exercises' and 'gymstack_workouts'.
 */

const KEYS = {
  EXERCISES: 'gymstack_exercises',
  WORKOUTS:  'gymstack_workouts',
};

// ── Seed Data (from PRD §5) ──────────────────────────────────────────────────

const SEED_EXERCISES = [
  {
    id: 'ex_seed_1',
    name: 'Barbell Squat',
    description: 'A compound lower-body movement targeting quads, glutes, and hamstrings. Keep chest up and drive through the heels.',
    type: 'weights',
    mediaUrl: 'https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=600&q=80',
    mediaType: 'image',
    metrics: { sets: 4, reps: 10, weight: 80 },
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'ex_seed_2',
    name: 'HIIT Sprints',
    description: 'High-intensity interval sprints to maximise cardiovascular output and calorie burn. Push to maximum effort each work interval.',
    type: 'hiit',
    mediaUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80',
    mediaType: 'image',
    metrics: { workInterval: 30, restInterval: 30, rounds: 10 },
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'ex_seed_3',
    name: 'Evening Jog',
    description: 'Steady-state aerobic run at a comfortable conversational pace. Great for active recovery and base fitness.',
    type: 'cardio',
    mediaUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80',
    mediaType: 'image',
    metrics: { duration: 30, intensity: 5 },
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'ex_seed_4',
    name: 'Pull Ups',
    description: 'Bodyweight pulling movement targeting lats, biceps, and rear delts. Control the negative for maximum gains.',
    type: 'calisthenics',
    mediaUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=600&q=80',
    mediaType: 'image',
    metrics: { sets: 3, repsToFailure: true },
    createdAt: Date.now() - 86400000 * 2,
  },
];

const SEED_WORKOUTS = [
  {
    id: 'wk_seed_1',
    name: 'Upper Body Blast',
    date: (() => {
      // Set to tomorrow
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })(),
    exerciseIds: ['ex_seed_4'],
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'wk_seed_2',
    name: 'Leg Day',
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      return d.toISOString().split('T')[0];
    })(),
    exerciseIds: ['ex_seed_1', 'ex_seed_2'],
    createdAt: Date.now() - 86400000 * 2,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a simple unique ID.
 * @param {string} prefix
 * @returns {string}
 */
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Read an array from localStorage. Returns [] on failure.
 * @param {string} key
 * @returns {Array}
 */
function readArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    console.warn(`GymStack: Failed to parse ${key}`);
    return [];
  }
}

/**
 * Write an array to localStorage.
 * @param {string} key
 * @param {Array} data
 */
function writeArray(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`GymStack: Failed to write ${key}`, e);
  }
}

// ── Initialisation ───────────────────────────────────────────────────────────

/**
 * Seed localStorage with sample data if it is empty.
 * Only runs once (checks for the 'gymstack_seeded' flag).
 */
function initStorage() {
  const alreadySeeded = localStorage.getItem('gymstack_seeded');
  if (!alreadySeeded) {
    writeArray(KEYS.EXERCISES, SEED_EXERCISES);
    writeArray(KEYS.WORKOUTS, SEED_WORKOUTS);
    localStorage.setItem('gymstack_seeded', '1');
    console.info('GymStack: Seeded storage with sample data.');
  }
}

// ── Exercise CRUD ─────────────────────────────────────────────────────────────

const ExerciseStore = {
  /** @returns {Array} All exercises */
  getAll() {
    return readArray(KEYS.EXERCISES);
  },

  /** @param {string} id @returns {Object|undefined} */
  getById(id) {
    return this.getAll().find(ex => ex.id === id);
  },

  /**
   * Create a new exercise.
   * @param {Object} data - Exercise fields (name, description, type, metrics, mediaUrl, mediaType)
   * @returns {Object} The saved exercise
   */
  create(data) {
    const exercises = this.getAll();
    const newExercise = {
      id: generateId('ex'),
      createdAt: Date.now(),
      ...data,
    };
    exercises.push(newExercise);
    writeArray(KEYS.EXERCISES, exercises);
    return newExercise;
  },

  /**
   * Update an existing exercise by ID.
   * @param {string} id
   * @param {Object} updates
   * @returns {Object|null} Updated exercise or null if not found
   */
  update(id, updates) {
    const exercises = this.getAll();
    const idx = exercises.findIndex(ex => ex.id === id);
    if (idx === -1) return null;
    exercises[idx] = { ...exercises[idx], ...updates, updatedAt: Date.now() };
    writeArray(KEYS.EXERCISES, exercises);
    return exercises[idx];
  },

  /**
   * Delete an exercise by ID.
   * Also removes it from any workouts that reference it.
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const exercises = this.getAll();
    const filtered = exercises.filter(ex => ex.id !== id);
    if (filtered.length === exercises.length) return false;
    writeArray(KEYS.EXERCISES, filtered);

    // Clean up from workouts
    const workouts = WorkoutStore.getAll();
    workouts.forEach(wk => {
      if (wk.exerciseIds.includes(id)) {
        WorkoutStore.update(wk.id, {
          exerciseIds: wk.exerciseIds.filter(eid => eid !== id),
        });
      }
    });
    return true;
  },
};

// ── Workout CRUD ──────────────────────────────────────────────────────────────

const WorkoutStore = {
  /** @returns {Array} All workouts sorted by date ascending */
  getAll() {
    return readArray(KEYS.WORKOUTS).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
  },

  /** @param {string} id @returns {Object|undefined} */
  getById(id) {
    return this.getAll().find(wk => wk.id === id);
  },

  /**
   * Get workouts from today onwards.
   * @returns {Array}
   */
  getUpcoming() {
    const today = new Date().toISOString().split('T')[0];
    return this.getAll().filter(wk => wk.date >= today);
  },

  /**
   * Create a new workout.
   * @param {Object} data - { name, date, exerciseIds[] }
   * @returns {Object} Saved workout
   */
  create(data) {
    const workouts = readArray(KEYS.WORKOUTS);
    const newWorkout = {
      id: generateId('wk'),
      createdAt: Date.now(),
      ...data,
    };
    workouts.push(newWorkout);
    writeArray(KEYS.WORKOUTS, workouts);
    return newWorkout;
  },

  /**
   * Update a workout.
   * @param {string} id
   * @param {Object} updates
   * @returns {Object|null}
   */
  update(id, updates) {
    const workouts = readArray(KEYS.WORKOUTS);
    const idx = workouts.findIndex(wk => wk.id === id);
    if (idx === -1) return null;
    workouts[idx] = { ...workouts[idx], ...updates, updatedAt: Date.now() };
    writeArray(KEYS.WORKOUTS, workouts);
    return workouts[idx];
  },

  /**
   * Delete a workout.
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const workouts = readArray(KEYS.WORKOUTS);
    const filtered = workouts.filter(wk => wk.id !== id);
    if (filtered.length === workouts.length) return false;
    writeArray(KEYS.WORKOUTS, filtered);
    return true;
  },
};

// Expose to global scope for use by other scripts
window.GymStack = window.GymStack || {};
window.GymStack.ExerciseStore = ExerciseStore;
window.GymStack.WorkoutStore = WorkoutStore;
window.GymStack.initStorage = initStorage;

// Auto-init when script loads
initStorage();
