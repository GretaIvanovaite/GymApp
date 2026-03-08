// storage.js
// uses indexeddb: browser-native structured storage, equivalent to sqlite.
// media files are stored as base64 data urls alongside each record.

const DB_NAME = "gymapp";
const DB_VERSION = 1;

// open db connection, run schema upgrade if version has changed
function openDB() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains("exercises")) {
        db.createObjectStore("exercises", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = function(e) { resolve(e.target.result); };
    request.onerror  = function()  { reject(request.error); };
  });
}

// crud helpers — each wraps an indexeddb transaction in a promise

async function saveRecord(storeName, data) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(storeName, "readwrite");
    var req = tx.objectStore(storeName).add(data);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror  = function() { reject(req.error); };
  });
}

async function updateRecord(storeName, data) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(storeName, "readwrite");
    var req = tx.objectStore(storeName).put(data);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror  = function() { reject(req.error); };
  });
}

async function deleteRecord(storeName, id) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(storeName, "readwrite");
    var req = tx.objectStore(storeName).delete(id);
    req.onsuccess = function() { resolve(); };
    req.onerror  = function() { reject(req.error); };
  });
}

async function getRecord(storeName, id) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(storeName, "readonly");
    var req = tx.objectStore(storeName).get(id);
    req.onsuccess = function() { resolve(req.result); };
    req.onerror  = function() { reject(req.error); };
  });
}

async function getAll(storeName) {
  var db = await openDB();
  return new Promise(function(resolve, reject) {
    var tx  = db.transaction(storeName, "readonly");
    var req = tx.objectStore(storeName).getAll();
    req.onsuccess = function() { resolve(req.result); };
    req.onerror  = function() { reject(req.error); };
  });
}

// convert a file object to a base64 data url for storage in indexeddb
function readFileAsDataURL(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload  = function() { resolve(reader.result); };
    reader.onerror = function() { reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

// inject an img or video element into the preview container by id
function showMediaPreview(previewId, src, type) {
  var preview = document.getElementById(previewId);
  if (!preview) return;
  var el;
  if (type.startsWith("image/")) {
    el = document.createElement("img");
    el.src = src;
    el.alt = "Media preview";
  } else if (type.startsWith("video/")) {
    el = document.createElement("video");
    el.src = src;
    el.controls = true;
  }
  if (el) { preview.innerHTML = ""; preview.appendChild(el); }
}

// expand a textarea to fit its content, called on input and after pre-fill
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

// attach auto-resize to all textareas with the auto-resize class on this page
document.querySelectorAll("textarea.auto-resize").forEach(function(el) {
  el.addEventListener("input", function() { autoResize(el); });
  autoResize(el);
});

// wire up a file input to show a live preview on selection
function setupMediaPreview(inputId, previewId) {
  var input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("change", function() {
    var file = input.files[0];
    if (!file) { document.getElementById(previewId).innerHTML = ""; return; }
    // createObjectURL avoids reading the full file into memory for the preview
    showMediaPreview(previewId, URL.createObjectURL(file), file.type);
  });
}

// build a homepage exercise list item
// maps exercise type to its icon asset filename
var typeIcons = {
  calisthenics: "assets/calisthenics.png",
  cardio:       "assets/cardio.png",
  core:         "assets/core.png",
  weights:      "assets/weights.png",
  hiit:         "assets/HIIT.png",
  mobility:     "assets/mobility.png"
};

function renderExercise(ex) {
  var li  = document.createElement("li");
  var p   = document.createElement("p");
  var img = document.createElement("img");
  var a   = document.createElement("a");
  p.textContent  = ex.name;
  img.src        = typeIcons[ex.type] || "";
  img.alt        = ex.type;
  img.className  = "exercise_type_icon";
  a.href         = "edit-exercise.html?id=" + ex.id;
  a.textContent  = "Edit";
  li.appendChild(p);
  li.appendChild(img);
  li.appendChild(a);
  return li;
}

// build a homepage workout tile list item
function renderWorkout(w) {
  var count = w.exercises.length;
  var li    = document.createElement("li");
  var a     = document.createElement("a");
  var sect  = document.createElement("section");
  var h3    = document.createElement("h3");
  var dur   = document.createElement("p");
  a.className     = "workout-tile";
  a.href          = "workout-details.html?id=" + w.id;
  h3.className    = "workout_title";
  h3.textContent  = w.name;
  dur.className   = "duration";
  dur.textContent = count + (count === 1 ? " exercise" : " exercises");
  sect.appendChild(h3);
  sect.appendChild(dur);
  a.appendChild(sect);
  li.appendChild(a);
  return li;
}

// seed sample exercises and workouts once on first load.
// localstorage flag prevents this running again across sessions.
// number of exercises in the seed dataset — used to detect a partial seed run
var SEED_COUNT = 9;

async function seedIfEmpty() {
  var existing = await getAll("exercises");
  // all seed exercises present — nothing to do
  if (existing.length >= SEED_COUNT) return;

  // clear any partial data left from a failed previous seed before re-seeding
  for (var i = 0; i < existing.length; i++) {
    await deleteRecord("exercises", existing[i].id);
  }
  var allWorkouts = await getAll("workouts");
  for (var i = 0; i < allWorkouts.length; i++) {
    await deleteRecord("workouts", allWorkouts[i].id);
  }

  var now = new Date().toISOString();

  // exercises
  var e1 = await saveRecord("exercises", {
    name: "Pull Ups", type: "calisthenics",
    sets: "4", reps: "8", rest_time: "90",
    notes: "Full range of motion, dead hang between reps", savedAt: now
  });
  var e2 = await saveRecord("exercises", {
    name: "Barbell Deadlift", type: "weights",
    sets: "4", reps: "5", rest_time: "180", weight_kg: "80",
    notes: "Neutral spine, drive through the floor", savedAt: now
  });
  var e3 = await saveRecord("exercises", {
    name: "Push Ups", type: "calisthenics",
    sets: "3", reps: "15", rest_time: "60",
    notes: "Keep elbows tucked at 45 degrees", savedAt: now
  });
  var e4 = await saveRecord("exercises", {
    name: "Barbell Bench Press", type: "weights",
    sets: "3", reps: "8", rest_time: "120", weight_kg: "60",
    notes: "Retract shoulder blades, controlled descent", savedAt: now
  });
  var e5 = await saveRecord("exercises", {
    name: "Barbell Squat", type: "weights",
    sets: "4", reps: "6", rest_time: "120", weight_kg: "70",
    notes: "Break parallel, knees track over toes", savedAt: now
  });
  var e6 = await saveRecord("exercises", {
    name: "5K Run", type: "cardio",
    duration: "28", distance_km: "5", target_pace: "5:36",
    cardio_intensity: "moderate", savedAt: now
  });
  var e7 = await saveRecord("exercises", {
    name: "HIIT Sprints", type: "hiit",
    rounds: "8", work_interval: "30", rest_interval: "15",
    includes_weights: null, savedAt: now
  });
  var e8 = await saveRecord("exercises", {
    name: "Plank", type: "core",
    sets: "4", hold_time: "60", rest_time: "45",
    notes: "Squeeze glutes and brace core throughout", savedAt: now
  });
  var e9 = await saveRecord("exercises", {
    name: "Hip Flexor Flow", type: "mobility",
    body_part: "hips", mobility_duration: "20", hold_time_stretch: "30",
    mobility_intensity: "light",
    notes: "Move slowly, never force the stretch", savedAt: now
  });

  // workouts referencing the exercise ids returned above
  await saveRecord("workouts", { name: "Pull Day",        exercises: [e1, e2], savedAt: now });
  await saveRecord("workouts", { name: "Push Day",        exercises: [e3, e4], savedAt: now });
  await saveRecord("workouts", { name: "Leg Day",         exercises: [e5],     savedAt: now });
  await saveRecord("workouts", { name: "Cardio Blast",    exercises: [e6, e7], savedAt: now });
  await saveRecord("workouts", { name: "Active Recovery", exercises: [e8, e9], savedAt: now });
}

// load and render homepage lists on dom ready
var exerciseList = document.getElementById("exercise-list");
var workoutList  = document.getElementById("workout-list");

// workoutList only exists on the homepage, so this guards against running on workout-details
if (workoutList) {
  (async function() {
    await seedIfEmpty();
    if (exerciseList) {
      var exercises = await getAll("exercises");
      exerciseList.innerHTML = "";
      if (exercises.length === 0) {
        var li = document.createElement("li");
        var p  = document.createElement("p");
        p.textContent = "No exercises yet.";
        li.appendChild(p);
        exerciseList.appendChild(li);
      } else {
        exercises.forEach(function(ex) { exerciseList.appendChild(renderExercise(ex)); });
      }
    }
    if (workoutList) {
      var workouts = await getAll("workouts");
      workoutList.innerHTML = "";
      if (workouts.length === 0) {
        var li = document.createElement("li");
        var p  = document.createElement("p");
        p.textContent = "No workouts yet.";
        li.appendChild(p);
        workoutList.appendChild(li);
      } else {
        workouts.forEach(function(w) { workoutList.appendChild(renderWorkout(w)); });
      }
    }
  })();
}

// maps each exercise type to the one field that must be filled in
var requiredByType = {
  calisthenics: "sets",
  weights:      "sets",
  core:         "sets",
  cardio:       "duration",
  hiit:         "rounds",
  mobility:     "mobility_duration"
};

// show the fieldset matching the chosen type, hide all others,
// then assign required to the key field so the browser only validates visible fields
function updateTypeFields(type) {
  document.querySelectorAll(".type-fields input, .type-fields select").forEach(function(el) {
    el.removeAttribute("required");
  });
  document.querySelectorAll(".type-fields").forEach(function(group) {
    var types = group.getAttribute("data-types").split(" ");
    if (types.indexOf(type) !== -1) {
      group.removeAttribute("hidden");
    } else {
      group.setAttribute("hidden", "");
    }
  });
  var reqId = requiredByType[type];
  if (reqId) {
    var reqEl = document.getElementById(reqId);
    if (reqEl) reqEl.setAttribute("required", "");
  }
}

// return the value of a field only if its parent fieldset is currently visible
function getVal(id) {
  var el = document.getElementById(id);
  if (!el) return null;
  var group = el.closest(".type-fields");
  if (group && group.hasAttribute("hidden")) return null;
  if (el.type === "checkbox") return el.checked ? true : null;
  return el.value || null;
}

// exercise form — handles both add-exercise and edit-exercise pages
var exerciseForm = document.getElementById("create_exercise");
if (exerciseForm) {
  setupMediaPreview("exercise_media", "exercise_media_preview");

  var typeSelect = document.getElementById("exercise_type");
  if (typeSelect) {
    typeSelect.addEventListener("change", function() {
      updateTypeFields(typeSelect.value);
    });
  }

  // read ?id= from the url to determine add vs edit mode
  var params = new URLSearchParams(window.location.search);
  var editId  = params.get("id") ? Number(params.get("id")) : null;

  if (editId) {
    // pre-fill all fields from the stored record
    getRecord("exercises", editId).then(function(ex) {
      if (!ex) return;
      var nameEl  = document.getElementById("exercise_name");
      var typeEl  = document.getElementById("exercise_type");
      var notesEl = document.getElementById("exercise_notes");
      if (nameEl)  { nameEl.value  = ex.name;        autoResize(nameEl); }
      if (typeEl)  { typeEl.value  = ex.type;         updateTypeFields(ex.type); }
      if (notesEl) { notesEl.value = ex.notes || "";  autoResize(notesEl); }
      var fields = ["sets","reps","rest_time","weight_kg","hold_time","duration",
                    "distance_km","target_pace","cardio_intensity","rounds",
                    "work_interval","rest_interval","body_part","mobility_duration",
                    "hold_time_stretch","mobility_intensity"];
      fields.forEach(function(id) {
        var el = document.getElementById(id);
        if (el && ex[id] != null) el.value = ex[id];
      });
      var iwEl = document.getElementById("includes_weights");
      if (iwEl && ex.includes_weights) iwEl.checked = true;
      if (ex.media) showMediaPreview("exercise_media_preview", ex.media, ex.mediaType);
    });
  }

  exerciseForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!exerciseForm.checkValidity()) { exerciseForm.reportValidity(); return; }
    var data = {
      name:               document.getElementById("exercise_name")?.value || "",
      type:               document.getElementById("exercise_type")?.value || "",
      notes:              document.getElementById("exercise_notes")?.value || "",
      sets:               getVal("sets"),
      reps:               getVal("reps"),
      rest_time:          getVal("rest_time"),
      weight_kg:          getVal("weight_kg"),
      hold_time:          getVal("hold_time"),
      duration:           getVal("duration"),
      distance_km:        getVal("distance_km"),
      target_pace:        getVal("target_pace"),
      cardio_intensity:   getVal("cardio_intensity"),
      rounds:             getVal("rounds"),
      work_interval:      getVal("work_interval"),
      rest_interval:      getVal("rest_interval"),
      includes_weights:   getVal("includes_weights"),
      body_part:          getVal("body_part"),
      mobility_duration:  getVal("mobility_duration"),
      hold_time_stretch:  getVal("hold_time_stretch"),
      mobility_intensity: getVal("mobility_intensity"),
      savedAt:            new Date().toISOString(),
    };
    var file = document.getElementById("exercise_media")?.files[0];
    if (file) {
      data.mediaName = file.name;
      data.mediaType = file.type;
      data.media     = await readFileAsDataURL(file);
    } else if (editId) {
      // preserve existing media if no new file chosen
      var existing = await getRecord("exercises", editId);
      if (existing && existing.media) {
        data.media     = existing.media;
        data.mediaType = existing.mediaType;
        data.mediaName = existing.mediaName;
      }
    }
    if (editId) {
      data.id = editId;
      await updateRecord("exercises", data);
    } else {
      await saveRecord("exercises", data);
    }
    window.location.href = "index.html";
  });
}

// workout form — dynamically populates exercise checkboxes from indexeddb
var workoutForm = document.getElementById("create_workout");
if (workoutForm) {
  setupMediaPreview("workout_media", "workout_media_preview");

  var checkboxContainer = document.getElementById("exercise_checkboxes");
  if (checkboxContainer) {
    getAll("exercises").then(function(exercises) {
      checkboxContainer.innerHTML = "";
      if (exercises.length === 0) {
        var msg  = document.createElement("p");
        var text = document.createTextNode("No exercises yet — ");
        var link = document.createElement("a");
        link.href        = "add-exercise.html";
        link.textContent = "add one first";
        msg.appendChild(text);
        msg.appendChild(link);
        checkboxContainer.appendChild(msg);
        return;
      }
      exercises.forEach(function(ex) {
        var div   = document.createElement("div");
        var input = document.createElement("input");
        var label = document.createElement("label");
        div.className     = "checkbox_row";
        input.type        = "checkbox";
        input.className   = "exercise_option";
        input.id          = "ex_" + ex.id;
        input.value       = ex.id;
        label.htmlFor     = "ex_" + ex.id;
        label.textContent = ex.name;
        div.appendChild(input);
        div.appendChild(label);
        checkboxContainer.appendChild(div);
      });
    });
  }

  workoutForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!workoutForm.checkValidity()) { workoutForm.reportValidity(); return; }
    var nameInput = document.getElementById("workout_name");
    if (!nameInput || !nameInput.value.trim()) return;
    var data = {
      name:      nameInput.value.trim(),
      exercises: Array.from(document.querySelectorAll(".exercise_option:checked")).map(function(cb) { return Number(cb.value); }),
      savedAt:   new Date().toISOString(),
    };
    var file = document.getElementById("workout_media")?.files[0];
    if (file) {
      data.mediaName = file.name;
      data.mediaType = file.type;
      data.media     = await readFileAsDataURL(file);
    }
    await saveRecord("workouts", data);
    window.location.href = "index.html";
  });
}

// workout details page
var workoutTitle    = document.getElementById("workout-title");
var workoutSubtitle = document.getElementById("workout-subtitle");
var workoutMediaDiv = document.getElementById("workout-media");

// inject a media element directly into a dom node
function showMediaInElement(el, src, type) {
  var media;
  if (type.startsWith("image/")) {
    media = document.createElement("img");
    media.src = src;
    media.alt = "Media";
  } else if (type.startsWith("video/")) {
    media = document.createElement("video");
    media.src = src;
    media.controls = true;
  }
  if (media) el.appendChild(media);
}

// build a detailed exercise list item for the workout details page.
// onRemove is an optional callback called with the exercise id when remove is clicked.
function renderExerciseDetail(ex, onRemove) {
  var li      = document.createElement("li");
  var row     = document.createElement("div");
  var info    = document.createElement("div");
  var actions = document.createElement("div");
  var p       = document.createElement("p");
  var span    = document.createElement("span");
  var a       = document.createElement("a");
  row.className     = "exercise_detail_row";
  info.className    = "exercise_detail_info";
  actions.className = "exercise_detail_actions";
  p.textContent     = ex.name;
  span.className    = "exercise_type";
  span.textContent  = ex.type;
  a.href            = "edit-exercise.html?id=" + ex.id;
  a.textContent     = "Edit";
  info.appendChild(p);
  info.appendChild(span);
  actions.appendChild(a);
  if (onRemove) {
    var removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className   = "remove-btn";
    removeBtn.setAttribute("aria-label", "Remove " + ex.name + " from workout");
    removeBtn.addEventListener("click", function() { onRemove(ex.id); });
    actions.appendChild(removeBtn);
  }
  row.appendChild(info);
  row.appendChild(actions);
  li.appendChild(row);
  // build a stat summary line based on the exercise type
  var statParts = [];
  if (ex.type === "cardio") {
    if (ex.duration)          statParts.push(ex.duration + " min");
    if (ex.distance_km)       statParts.push(ex.distance_km + " km");
    if (ex.target_pace)       statParts.push(ex.target_pace + " min/km");
    if (ex.cardio_intensity)  statParts.push(ex.cardio_intensity);
  } else if (ex.type === "hiit") {
    if (ex.rounds)            statParts.push(ex.rounds + " rounds");
    if (ex.work_interval)     statParts.push(ex.work_interval + "s on");
    if (ex.rest_interval)     statParts.push(ex.rest_interval + "s off");
    if (ex.includes_weights)  statParts.push("with weights");
  } else if (ex.type === "mobility") {
    if (ex.body_part)           statParts.push(ex.body_part.replace("_", " "));
    if (ex.mobility_duration)   statParts.push(ex.mobility_duration + " min");
    if (ex.hold_time_stretch)   statParts.push(ex.hold_time_stretch + "s holds");
    if (ex.mobility_intensity)  statParts.push(ex.mobility_intensity);
  } else {
    if (ex.sets)       statParts.push(ex.sets + " sets");
    if (ex.reps)       statParts.push(ex.reps + " reps");
    if (ex.weight_kg)  statParts.push(ex.weight_kg + " kg");
    if (ex.hold_time)  statParts.push(ex.hold_time + "s hold");
    if (ex.rest_time)  statParts.push(ex.rest_time + "s rest");
  }
  if (statParts.length > 0) {
    var stats = document.createElement("p");
    stats.className = "exercise_stats";
    stats.textContent = statParts.join(" · ");
    li.appendChild(stats);
  }
  if (ex.notes) {
    var notes = document.createElement("p");
    notes.className = "exercise_notes";
    notes.textContent = ex.notes;
    li.appendChild(notes);
  }
  if (ex.media) {
    var mediaDiv = document.createElement("div");
    mediaDiv.className = "exercise_media_detail";
    showMediaInElement(mediaDiv, ex.media, ex.mediaType);
    li.appendChild(mediaDiv);
  }
  return li;
}

// confirm then delete the current workout and return to homepage
var deleteBtn = document.getElementById("delete-workout");
if (deleteBtn) {
  deleteBtn.addEventListener("click", async function() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") ? Number(params.get("id")) : null;
    if (!id) return;
    if (confirm("Delete this workout?")) {
      await deleteRecord("workouts", id);
      window.location.href = "index.html";
    }
  });
}

// load (or re-load) all workout details — called on page load and after any change
async function loadWorkoutDetails(detailId) {
  var workout = await getRecord("workouts", detailId);
  if (!workout) {
    if (workoutTitle) workoutTitle.textContent = "Workout not found";
    return;
  }

  if (workoutTitle) workoutTitle.textContent = workout.name;

  if (workoutSubtitle) {
    var n = workout.exercises.length;
    workoutSubtitle.textContent = n + (n === 1 ? " exercise" : " exercises");
  }

  // only inject media once to avoid duplicating it on re-renders
  if (workout.media && workoutMediaDiv && workoutMediaDiv.children.length === 0) {
    workoutMediaDiv.className = "workout_media_detail";
    showMediaInElement(workoutMediaDiv, workout.media, workout.mediaType);
  }

  // render exercises currently in this workout with remove buttons
  var detailExList = document.getElementById("exercise-list");
  if (detailExList) {
    detailExList.innerHTML = "";
    if (workout.exercises.length === 0) {
      var li = document.createElement("li");
      var p  = document.createElement("p");
      p.textContent = "No exercises in this workout.";
      li.appendChild(p);
      detailExList.appendChild(li);
    } else {
      // sequential await preserves display order matching the saved exercise array
      for (var i = 0; i < workout.exercises.length; i++) {
        var ex = await getRecord("exercises", workout.exercises[i]);
        if (ex) {
          detailExList.appendChild(renderExerciseDetail(ex, async function(exId) {
            // remove this exercise from the workout and re-render
            workout.exercises = workout.exercises.filter(function(id) { return id !== exId; });
            await updateRecord("workouts", workout);
            loadWorkoutDetails(detailId);
          }));
        }
      }
    }
  }

  // render exercises from the library not yet in this workout as checkboxes
  var addContainer = document.getElementById("add-exercise-checkboxes");
  if (addContainer) {
    var allExercises = await getAll("exercises");
    var notInWorkout = allExercises.filter(function(ex) {
      return workout.exercises.indexOf(ex.id) === -1;
    });
    addContainer.innerHTML = "";
    if (notInWorkout.length === 0) {
      var msg = document.createElement("p");
      msg.textContent = "All exercises are already in this workout.";
      addContainer.appendChild(msg);
    } else {
      notInWorkout.forEach(function(ex) {
        var div   = document.createElement("div");
        var input = document.createElement("input");
        var label = document.createElement("label");
        div.className  = "checkbox_row";
        input.type     = "checkbox";
        input.className = "add_exercise_option";
        input.id       = "add_ex_" + ex.id;
        input.value    = ex.id;
        label.htmlFor  = "add_ex_" + ex.id;
        label.textContent = ex.name;
        div.appendChild(input);
        div.appendChild(label);
        addContainer.appendChild(div);
      });
    }
  }
}

if (workoutTitle) {
  var detailParams = new URLSearchParams(window.location.search);
  var detailId     = detailParams.get("id") ? Number(detailParams.get("id")) : null;

  if (!detailId) {
    workoutTitle.textContent = "Workout not found";
  } else {
    loadWorkoutDetails(detailId);

    // add selected exercises to the workout and re-render
    var addExBtn = document.getElementById("add-exercises-btn");
    if (addExBtn) {
      addExBtn.addEventListener("click", async function() {
        var checked = Array.from(document.querySelectorAll(".add_exercise_option:checked"));
        if (checked.length === 0) return;
        var workout = await getRecord("workouts", detailId);
        checked.forEach(function(cb) { workout.exercises.push(Number(cb.value)); });
        await updateRecord("workouts", workout);
        loadWorkoutDetails(detailId);
      });
    }
  }
}
