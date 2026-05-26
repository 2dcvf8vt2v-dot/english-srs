const DB_NAME = "english-srs-db";
const DB_VERSION = 1;
const APP_VERSION = "1.0.0";
const CACHE_VERSION_LABEL = "english-srs-v4";
const SUPPORTED_EXERCISE_TYPES = [
  "choose_sentence",
  "fill_blank",
  "choose_meaning",
  "choose_word"
];
const WORDS_JSON_PROMPT = `Generate English SRS vocabulary JSON.

Return ONLY valid JSON.
No markdown.
No comments.
No explanations.
Everything must be in English.
Do not translate anything into Russian.
Use simple, natural English meanings.
Meanings should explain the word clearly, not sound like a dictionary dump.
Examples should be natural and useful.
For phrases and idioms, explain the whole phrase.
Keep the original word or phrase spelling, but fix obvious capitalization if needed.
Skip proper names unless they are useful as vocabulary.
If a word has many meanings, choose the most common meaning.
Tags should be short and useful.
Use 2-5 tags per item.
Do not include duplicate words.
Do not include extra fields.
Make sure the JSON can be parsed by JSON.parse().

Use SOURCE_NAME as the source value.
Use these words or phrases:
PASTE_WORDS_HERE

Return JSON in this shape:
{
  "app": "english-srs",
  "type": "words",
  "version": 1,
  "words": [
    {
      "word": "target word or phrase",
      "meaning": "clear English-only meaning, simple and useful",
      "example": "natural example sentence using the word or phrase",
      "tags": ["tag1", "tag2", "tag3"],
      "source": "SOURCE_NAME"
    }
  ]
}`;
const EXERCISE_PACK_PROMPT = `Generate an English SRS exercise pack JSON.

Return ONLY valid JSON.
No markdown.
No comments.
No explanations.
Everything must be in English.
Do not translate anything into Russian.
Generate 1 exercise per word.
Use only these exercise types:
- choose_sentence
- fill_blank
- choose_meaning
- choose_word
Mix the exercise types naturally.
Exactly 4 options per exercise.
The answer must exactly match one of the options.
Do not add explanations.
Do not add extra fields.
Do not include duplicate words.
Keep the target word exactly as provided.
For phrases and idioms, test the meaning of the whole phrase.
Distractors must be plausible, but clearly wrong.
Avoid weird, unnatural, or overly academic sentences.
Make examples useful for real reading comprehension.
Do not use unescaped double quotes inside JSON strings.
If quotes are needed inside a sentence, use single quotes.

Use SOURCE_NAME in the pack name.
Use these words or word objects:
PASTE_WORDS_OR_WORD_OBJECTS_HERE

Return JSON in this shape:
{
  "app": "english-srs",
  "type": "exercisePack",
  "version": 1,
  "pack": {
    "name": "SOURCE_NAME — Practice Pack 1",
    "description": "English-only multiple choice practice based on imported vocabulary.",
    "source": "GPT"
  },
  "exercises": [
    {
      "word": "target word or phrase",
      "type": "choose_sentence",
      "question": "Choose the sentence where 'target word' is used correctly.",
      "options": [
        "correct option",
        "wrong option",
        "wrong option",
        "wrong option"
      ],
      "answer": "correct option"
    }
  ]
}`;

let db;

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".nav-btn");
const screenTitle = document.querySelector("#screenTitle");

const dueCountEl = document.querySelector("#dueCount");
const totalWordsEl = document.querySelector("#totalWords");
const totalPacksEl = document.querySelector("#totalPacks");
const startReviewBtn = document.querySelector("#startReviewBtn");
const homeSmartPracticeBtn = document.querySelector("#homeSmartPracticeBtn");
const homeOpenPracticeBtn = document.querySelector("#homeOpenPracticeBtn");
const homeWeakWordsSummary = document.querySelector("#homeWeakWordsSummary");
const homeStatsLine = document.querySelector("#homeStatsLine");
const reviewCard = document.querySelector("#reviewCard");
const reviewProgressEl = document.querySelector("#reviewProgress");
const reviewWordEl = document.querySelector("#reviewWord");
const reviewHintEl = document.querySelector("#reviewHint");
const reviewAnswerEl = document.querySelector("#reviewAnswer");
const reviewMeaningEl = document.querySelector("#reviewMeaning");
const reviewExampleEl = document.querySelector("#reviewExample");
const reviewActionsEl = document.querySelector("#reviewActions");
const backHomeFromReviewBtn = document.querySelector("#backHomeFromReviewBtn");
const copyWordsPromptBtn = document.querySelector("#copyWordsPromptBtn");
const copyExercisePromptBtn = document.querySelector("#copyExercisePromptBtn");
const promptSourceInput = document.querySelector("#promptSourceInput");
const promptWordsInput = document.querySelector("#promptWordsInput");
const exerciseCoverageText = document.querySelector("#exerciseCoverageText");
const missingExerciseBatchSizeSelect = document.querySelector("#missingExerciseBatchSizeSelect");
const copyMissingExercisesPromptBtn = document.querySelector("#copyMissingExercisesPromptBtn");
const weakWordsExportSummary = document.querySelector("#weakWordsExportSummary");
const weakWordsBatchSizeSelect = document.querySelector("#weakWordsBatchSizeSelect");
const genericJsonInput = document.querySelector("#genericJsonInput");
const genericJsonFileLabel = document.querySelector("#genericJsonFileLabel");
const genericJsonFileButtonText = document.querySelector("#genericJsonFileButtonText");
const selectedJsonFileName = document.querySelector("#selectedJsonFileName");
const importJsonBtn = document.querySelector("#importJsonBtn");
const exportBackupBtn = document.querySelector("#exportBackupBtn");
const exportWeakWordsPromptBtn = document.querySelector("#exportWeakWordsPromptBtn");
const clearAllDataBtn = document.querySelector("#clearAllDataBtn");
const importResultEl = document.querySelector("#importResult");
const inlineImportResultEl = document.querySelector("#inlineImportResult");
const appVersionTextEl = document.querySelector("#appVersionText");
const topHelpBtn = document.querySelector("#topHelpBtn");
const letsGetStartedBtn = document.querySelector("#letsGetStartedBtn");
const onboardingCard = document.querySelector("#onboardingCard");
const installTipCard = document.querySelector("#installTipCard");
const dismissInstallTipBtn = document.querySelector("#dismissInstallTipBtn");
const backFromHelpBtn = document.querySelector("#backFromHelpBtn");
const pasteJsonInput = document.querySelector("#pasteJsonInput");
const wordSearchInput = document.querySelector("#wordSearchInput");
const addWordBtn = document.querySelector("#addWordBtn");
const wordForm = document.querySelector("#wordForm");
const wordIdInput = document.querySelector("#wordIdInput");
const wordInput = document.querySelector("#wordInput");
const meaningInput = document.querySelector("#meaningInput");
const exampleInput = document.querySelector("#exampleInput");
const tagsInput = document.querySelector("#tagsInput");
const sourceInput = document.querySelector("#sourceInput");
const deleteWordBtn = document.querySelector("#deleteWordBtn");
const cancelWordBtn = document.querySelector("#cancelWordBtn");
const practicePackList = document.querySelector("#practicePackList");
const practiceEmptyState = document.querySelector("#practiceEmptyState");
const startSmartPracticeBtn = document.querySelector("#startSmartPracticeBtn");
const smartPracticeLimitSelect = document.querySelector("#smartPracticeLimitSelect");
const weakPracticeLimitSelect = document.querySelector("#weakPracticeLimitSelect");
const startWeakPracticeBtn = document.querySelector("#startWeakPracticeBtn");
const toggleWeakWordsBtn = document.querySelector("#toggleWeakWordsBtn");
const weakWordsPracticeSummary = document.querySelector("#weakWordsPracticeSummary");
const weakWordsList = document.querySelector("#weakWordsList");
const practiceProgressEl = document.querySelector("#practiceProgress");
const practiceQuestionEl = document.querySelector("#practiceQuestion");
const practiceOptionsEl = document.querySelector("#practiceOptions");
const practiceFeedbackEl = document.querySelector("#practiceFeedback");
const nextPracticeBtn = document.querySelector("#nextPracticeBtn");
const backToPacksBtn = document.querySelector("#backToPacksBtn");
let practiceQueue = [];
let currentPracticeExercise = null;
let practiceTotal = 0;
let isPracticeAnswered = false;
let isWeakWordsListVisible = false;
let cachedExerciseCoverage = null;
let cachedWeakWords = [];
async function renderPracticePacks() {
  const packs = await getAll("exercisePacks");
  const attempts = await getAll("practiceAttempts");

  practicePackList.innerHTML = "";
  practiceEmptyState.style.display = packs.length ? "none" : "block";

  packs
    .sort((a, b) => b.importedAt - a.importedAt)
    .forEach(pack => {
      const packAttempts = attempts.filter(attempt => attempt.packId === pack.id);
      const correctAttempts = packAttempts.filter(attempt => attempt.isCorrect).length;
      const mistakes = packAttempts.length - correctAttempts;
      const accuracy = packAttempts.length
        ? Math.round((correctAttempts / packAttempts.length) * 100)
        : null;
      const shouldShowDescription =
        pack.description &&
        pack.description !== "English-only multiple choice practice based on imported vocabulary.";

      const card = document.createElement("article");
      card.className = "practice-pack-card";
      card.dataset.packId = pack.id;

      card.innerHTML = `
        <label class="pack-select">
          <input type="checkbox" data-pack-select="true" value="${escapeHTML(pack.id)}" checked />
        </label>
        <div>
          <h3>${escapeHTML(pack.name)}</h3>
          ${shouldShowDescription ? `<p>${escapeHTML(pack.description)}</p>` : ""}
          <div class="pack-meta">
            <span>${pack.exerciseCount || 0} exercises</span>
            ${pack.source ? `<span>${escapeHTML(pack.source)}</span>` : ""}
            <span>${packAttempts.length} attempts</span>
            <span>${mistakes} mistakes</span>
            ${accuracy === null ? "" : `<span>${accuracy}% accuracy</span>`}
          </div>
        </div>
        <div class="pack-actions">
          <button class="small-btn" type="button" data-pack-action="start">Start</button>
          <button class="pack-delete-btn" type="button" data-pack-action="delete">Delete</button>
        </div>
      `;

      practicePackList.appendChild(card);
    });
}

async function deleteExercisePack(packId) {
  const confirmed = confirm("Delete this exercise pack and all its exercises?");
  if (!confirmed) return;

  const exercises = await getAll("exercises");
  const attempts = await getAll("practiceAttempts");

  const packExercises = exercises.filter(exercise => exercise.packId === packId);
  const packAttempts = attempts.filter(attempt => attempt.packId === packId);

  for (const exercise of packExercises) {
    await deleteItem("exercises", exercise.id);
  }

  for (const attempt of packAttempts) {
    await deleteItem("practiceAttempts", attempt.id);
  }

  await deleteItem("exercisePacks", packId);
  await refreshHomeStats();
  await renderHomeWeakWordsSummary();
  await renderPracticePacks();
  await renderWeakWords();
  await renderExerciseCoverage();
}

async function getExercisesByPackId(packId) {
  const exercises = await getAll("exercises");
  return exercises.filter(exercise => exercise.packId === packId);
}

function shuffleArray(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function startPracticePack(packId) {
  const exercises = await getExercisesByPackId(packId);

  practiceQueue = shuffleArray(exercises);
  practiceTotal = practiceQueue.length;
  currentPracticeExercise = null;
  isPracticeAnswered = false;

  showScreen("practiceSessionScreen");
  showNextPracticeExercise();
}

async function startSmartPractice() {
  const exercises = await getAll("exercises");
  const limit = Number(smartPracticeLimitSelect.value) || 20;
  const selectedPackIds = new Set(
    [...practicePackList.querySelectorAll('[data-pack-select="true"]:checked')]
      .map(input => input.value)
  );

  if (!selectedPackIds.size) {
    showScreen("practiceScreen");
    alert("Select at least one pack for Smart Practice.");
    return;
  }

  const selectedPackExercises = exercises.filter(exercise => selectedPackIds.has(exercise.packId));

  if (!selectedPackExercises.length) {
    showScreen("practiceScreen");
    alert("No exercises available in selected packs.");
    return;
  }

  const words = await getAll("words");
  const attempts = await getAll("practiceAttempts");
  const wordsById = new Map(words.map(word => [word.id, word]));
  const attemptsByWordId = new Map();
  const attemptsByExerciseId = new Map();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  for (const attempt of attempts) {
    if (attempt.wordId) {
      if (!attemptsByWordId.has(attempt.wordId)) {
        attemptsByWordId.set(attempt.wordId, []);
      }

      attemptsByWordId.get(attempt.wordId).push(attempt);
    }

    if (attempt.exerciseId) {
      if (!attemptsByExerciseId.has(attempt.exerciseId)) {
        attemptsByExerciseId.set(attempt.exerciseId, []);
      }

      attemptsByExerciseId.get(attempt.exerciseId).push(attempt);
    }
  }

  const selected = selectedPackExercises
    .map(exercise => {
      const word = wordsById.get(exercise.wordId);
      const wordAttempts = attemptsByWordId.get(exercise.wordId) || [];
      const exerciseAttempts = attemptsByExerciseId.get(exercise.id) || [];
      const latestWordAttempt = wordAttempts
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      const latestExerciseAttempt = exerciseAttempts
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      const wrongAttempts = wordAttempts.filter(attempt => !attempt.isCorrect).length;
      let score = 0;

      if (word && word.dueDate <= now) score += 100;
      if (latestWordAttempt && !latestWordAttempt.isCorrect) score += 80;
      score += Math.min(wrongAttempts * 15, 60);
      if (!exerciseAttempts.length) score += 30;
      if (!latestExerciseAttempt || latestExerciseAttempt.createdAt < sevenDaysAgo) score += 20;
      if (word && word.repetitions === 0) score += 10;

      return {
        exercise,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.exercise);

  practiceQueue = shuffleArray(selected);
  practiceTotal = practiceQueue.length;
  currentPracticeExercise = null;
  isPracticeAnswered = false;

  showScreen("practiceSessionScreen");
  showNextPracticeExercise();
}

async function startWeakPractice() {
  const weakWords = await getWeakWords();

  if (!weakWords.length) {
    showScreen("practiceScreen");
    alert("No weak words yet.");
    return;
  }

  const exercises = await getAll("exercises");
  const weakWordIds = new Set(weakWords.map(word => word.id));
  const weakWordsById = new Map(weakWords.map(word => [word.id, word]));
  const matchingExercises = exercises.filter(exercise => weakWordIds.has(exercise.wordId));

  if (!matchingExercises.length) {
    showScreen("practiceScreen");
    alert("No exercises available for weak words.");
    return;
  }

  const limit = Number(weakPracticeLimitSelect.value) || 10;
  const selected = matchingExercises
    .map(exercise => ({
      exercise,
      wrongAttempts: weakWordsById.get(exercise.wordId)?.wrongAttempts || 0
    }))
    .sort((a, b) => b.wrongAttempts - a.wrongAttempts)
    .slice(0, limit)
    .map(item => item.exercise);

  practiceQueue = shuffleArray(selected);
  practiceTotal = practiceQueue.length;
  currentPracticeExercise = null;
  isPracticeAnswered = false;

  showScreen("practiceSessionScreen");
  showNextPracticeExercise();
}

function showNextPracticeExercise() {
  currentPracticeExercise = practiceQueue.shift() || null;
  isPracticeAnswered = false;
  practiceOptionsEl.innerHTML = "";
  practiceFeedbackEl.hidden = true;
  practiceFeedbackEl.textContent = "";
  nextPracticeBtn.hidden = true;

  if (!currentPracticeExercise) {
    practiceProgressEl.textContent = "Done";
    practiceQuestionEl.textContent = "Practice session complete";
    return;
  }

  const doneCount = practiceTotal - practiceQueue.length;
  practiceProgressEl.textContent = `${doneCount} / ${practiceTotal}`;
  practiceQuestionEl.textContent = currentPracticeExercise.question;

  const shuffledOptions = shuffleArray(currentPracticeExercise.options);

  shuffledOptions.forEach(option => {
    const button = document.createElement("button");
    button.className = "practice-option-btn";
    button.type = "button";
    button.textContent = option;
    button.dataset.option = option;

    practiceOptionsEl.appendChild(button);
  });
}

async function handlePracticeAnswer(selectedOption) {
  if (!currentPracticeExercise || isPracticeAnswered) return;

  isPracticeAnswered = true;

  const isCorrect = selectedOption === currentPracticeExercise.answer;
  const optionButtons = practiceOptionsEl.querySelectorAll(".practice-option-btn");

  optionButtons.forEach(button => {
    const option = button.dataset.option;
    button.disabled = true;

    if (option === currentPracticeExercise.answer) {
      button.classList.add("correct");
    }

    if (option === selectedOption && !isCorrect) {
      button.classList.add("wrong");
    }
  });

  await savePracticeAttempt(currentPracticeExercise, selectedOption, isCorrect);
  await refreshHomeStats();
  await renderHomeWeakWordsSummary();
  await renderPracticePacks();
  await renderWeakWords();

  if (!isCorrect) {
    await makePracticeWordDue(currentPracticeExercise.wordId);
  }

  nextPracticeBtn.hidden = false;
}

async function savePracticeAttempt(exercise, selectedAnswer, isCorrect) {
  const attempt = {
    id: createId("attempt"),
    exerciseId: exercise.id,
    wordId: exercise.wordId,
    packId: exercise.packId,
    selectedAnswer,
    correctAnswer: exercise.answer,
    isCorrect,
    createdAt: Date.now()
  };

  await putItem("practiceAttempts", attempt);
}

async function makePracticeWordDue(wordId) {
  const word = await getWordById(wordId);
  if (!word) return;

  const updatedWord = {
    ...word,
    dueDate: Date.now(),
    updatedAt: Date.now()
  };

  await putItem("words", updatedWord);
  await refreshHomeStats();
  await renderWordsList();
}

let reviewQueue = [];
let currentReviewWord = null;
let isAnswerVisible = false;

const titles = {
  homeScreen: "Home",
  reviewScreen: "Review",
  practiceScreen: "Practice",
  practiceSessionScreen: "Practice",
  wordsScreen: "Words",
  wordFormScreen: "Word",
  importScreen: "Import",
  helpScreen: "Help"
};

function showScreen(screenId) {
  screens.forEach(screen => {
    screen.classList.toggle("active", screen.id === screenId);
  });

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.screen === screenId);
  });

  screenTitle.textContent = titles[screenId] || "English SRS";

  if (topHelpBtn) {
    topHelpBtn.hidden = !(screenId === "homeScreen" || screenId === "importScreen");
  }

  if (screenId === "homeScreen") {
    renderInstallTip();
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-screen]");

  if (!button) return;

  showScreen(button.dataset.screen);
});

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = event => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains("words")) {
        const wordsStore = database.createObjectStore("words", {
          keyPath: "id"
        });

        wordsStore.createIndex("wordLower", "wordLower", { unique: true });
        wordsStore.createIndex("dueDate", "dueDate", { unique: false });
        wordsStore.createIndex("source", "source", { unique: false });
      }

      if (!database.objectStoreNames.contains("exercisePacks")) {
        database.createObjectStore("exercisePacks", {
          keyPath: "id"
        });
      }

      if (!database.objectStoreNames.contains("exercises")) {
        const exercisesStore = database.createObjectStore("exercises", {
          keyPath: "id"
        });

        exercisesStore.createIndex("packId", "packId", { unique: false });
        exercisesStore.createIndex("wordId", "wordId", { unique: false });
      }

      if (!database.objectStoreNames.contains("practiceAttempts")) {
        const attemptsStore = database.createObjectStore("practiceAttempts", {
          keyPath: "id"
        });

        attemptsStore.createIndex("wordId", "wordId", { unique: false });
        attemptsStore.createIndex("packId", "packId", { unique: false });
      }

      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", {
          keyPath: "key"
        });
      }
    };
  });
}

function getStore(storeName, mode = "readonly") {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = getStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const request = getStore(storeName, "readwrite").put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

function deleteItem(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = getStore(storeName, "readwrite").delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const request = getStore(storeName, "readwrite").clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getDueInMinutes(minutes) {
  return Date.now() + minutes * 60 * 1000;
}

function getDueInDays(days) {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function normalizeWord(word) {
  return word.trim().toLowerCase();
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map(tag => String(tag).trim())
      .filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function createWord({ word, meaning, example = "", tags = [], source = "" }) {
  const now = Date.now();

  return {
    id: createId("w"),
    word: word.trim(),
    wordLower: normalizeWord(word),
    meaning: meaning.trim(),
    example: String(example || "").trim(),
    tags: normalizeTags(tags),
    source: String(source || "").trim(),
    interval: 1,
    repetitions: 0,
    ease: 2.5,
    dueDate: now,
    createdAt: now,
    updatedAt: now
  };
}

async function addDemoWord() {
  const word = createWord({
    word: "wince",
    meaning: "to make a sudden small movement with your face or body because of pain or discomfort",
    example: "He winced when the doctor touched his bruised arm.",
    tags: ["body", "reaction", "pain"],
    source: "Demo"
  });

  try {
    await putItem("words", word);
    await refreshHomeStats();
    await renderWordsList();
  } catch (error) {
    console.log("Demo word already exists or failed:", error);
  }
}

async function refreshHomeStats() {
  const words = await getAll("words");
  const packs = await getAll("exercisePacks");
  const weakWords = await getWeakWords();

  const now = Date.now();
  const dueWords = words.filter(word => word.dueDate <= now);

  dueCountEl.textContent = dueWords.length;
  totalWordsEl.textContent = words.length;
  totalPacksEl.textContent = packs.length;
  homeStatsLine.textContent = `${words.length} words · ${packs.length} packs · ${weakWords.length} weak`;
  onboardingCard.hidden = !(words.length === 0 && packs.length === 0);
}

async function renderHomeWeakWordsSummary() {
  const weakWords = await getWeakWords();

  if (!weakWords.length) {
    homeWeakWordsSummary.textContent = "No weak words yet.";
    return;
  }

  const previewWords = weakWords.slice(0, 3).map(word => word.word).join(", ");
  homeWeakWordsSummary.textContent = `${weakWords.length} words need attention: ${previewWords}`;
}

async function renderWordsList() {
  const wordsScreen = document.querySelector("#wordsScreen");
  const oldList = wordsScreen.querySelector(".word-list");

  if (oldList) oldList.remove();

  const words = await getAll("words");
  const query = normalizeWord(wordSearchInput?.value || "");

  const filteredWords = words.filter(item => {
    if (!query) return true;

    const searchableText = [
      item.word,
      item.meaning,
      item.example,
      item.source,
      ...(item.tags || [])
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  const emptyState = wordsScreen.querySelector(".empty-state");
  emptyState.style.display = filteredWords.length ? "none" : "block";

  const list = document.createElement("div");
  list.className = "word-list";

  filteredWords
    .sort((a, b) => a.word.localeCompare(b.word))
    .forEach(item => {
      const card = document.createElement("article");
      card.className = "word-card";
      card.dataset.wordId = item.id;

      card.innerHTML = `
        <h3>${escapeHTML(item.word)}</h3>
        <p>${escapeHTML(item.meaning)}</p>
        ${
          item.tags?.length
            ? `<div class="tag-row">${item.tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join("")}</div>`
            : ""
        }
      `;

      list.appendChild(card);
    });

  wordsScreen.appendChild(list);
}

async function getWordById(id) {
  const words = await getAll("words");
  return words.find(word => word.id === id) || null;
}

function resetWordForm() {
  wordForm.reset();
  wordIdInput.value = "";
  deleteWordBtn.hidden = true;
}

function openNewWordForm() {
  resetWordForm();
  showScreen("wordFormScreen");
}

function fillWordForm(word) {
  wordIdInput.value = word.id;
  wordInput.value = word.word;
  meaningInput.value = word.meaning;
  exampleInput.value = word.example || "";
  tagsInput.value = (word.tags || []).join(", ");
  sourceInput.value = word.source || "";
  deleteWordBtn.hidden = false;
  showScreen("wordFormScreen");
}

async function openEditWordForm(wordId) {
  const word = await getWordById(wordId);
  if (!word) return;

  fillWordForm(word);
}

async function handleWordFormSubmit(event) {
  event.preventDefault();

  const existingId = wordIdInput.value;
  const now = Date.now();

  let word;

  if (existingId) {
    const existingWord = await getWordById(existingId);
    if (!existingWord) return;

    word = {
      ...existingWord,
      word: wordInput.value.trim(),
      wordLower: normalizeWord(wordInput.value),
      meaning: meaningInput.value.trim(),
      example: exampleInput.value.trim(),
      tags: normalizeTags(tagsInput.value),
      source: sourceInput.value.trim(),
      updatedAt: now
    };
  } else {
    word = createWord({
      word: wordInput.value,
      meaning: meaningInput.value,
      example: exampleInput.value,
      tags: tagsInput.value,
      source: sourceInput.value
    });
  }

  try {
    await putItem("words", word);
    resetWordForm();
    await refreshHomeStats();
    await renderWordsList();
    showScreen("wordsScreen");
  } catch (error) {
    alert("Could not save this word. It may already exist.");
    console.log(error);
  }
}

async function handleDeleteWord() {
  const wordId = wordIdInput.value;
  if (!wordId) return;

  const confirmed = confirm("Delete this word?");
  if (!confirmed) return;

  await deleteItem("words", wordId);
  resetWordForm();
  await refreshHomeStats();
  await renderWordsList();
  showScreen("wordsScreen");
}

async function getDueWords() {
  const words = await getAll("words");
  const now = Date.now();

  return words
    .filter(word => word.dueDate <= now)
    .sort((a, b) => a.dueDate - b.dueDate);
}

async function startReview() {
  reviewQueue = await getDueWords();
  showScreen("reviewScreen");
  showNextReviewCard();
}

function showNextReviewCard() {
  currentReviewWord = reviewQueue.shift() || null;
  isAnswerVisible = false;
  reviewAnswerEl.hidden = true;
  reviewActionsEl.hidden = true;

  if (!currentReviewWord) {
    reviewProgressEl.textContent = "Done";
    reviewWordEl.textContent = "You're all caught up";
    reviewHintEl.textContent = "No words are due right now.";
    reviewMeaningEl.textContent = "";
    reviewExampleEl.textContent = "";
    return;
  }

  reviewProgressEl.textContent = `${reviewQueue.length + 1} cards left`;
  reviewWordEl.textContent = currentReviewWord.word;
  reviewHintEl.textContent = "Tap to reveal";
  reviewMeaningEl.textContent = currentReviewWord.meaning;
  reviewExampleEl.textContent = currentReviewWord.example || "";
}

function revealReviewAnswer() {
  if (!currentReviewWord || isAnswerVisible) return;

  isAnswerVisible = true;
  reviewAnswerEl.hidden = false;
  reviewActionsEl.hidden = false;
  reviewHintEl.textContent = "How well did you remember it?";
}

function scheduleReviewedWord(word, rating) {
  const updatedWord = { ...word };
  const currentInterval = Math.max(1, Number(updatedWord.interval) || 1);
  const currentEase = Math.max(1.3, Number(updatedWord.ease) || 2.5);

  if (rating === "again") {
    updatedWord.interval = 1;
    updatedWord.repetitions = 0;
    updatedWord.ease = Math.max(1.3, currentEase - 0.2);
    updatedWord.dueDate = getDueInMinutes(10);
  }

  if (rating === "hard") {
    updatedWord.interval = Math.max(1, Math.round(currentInterval * 1.2));
    updatedWord.repetitions = (updatedWord.repetitions || 0) + 1;
    updatedWord.ease = Math.max(1.3, currentEase - 0.15);
    updatedWord.dueDate = getDueInDays(updatedWord.interval);
  }

  if (rating === "good") {
    const nextInterval = updatedWord.repetitions === 0 ? 1 : Math.round(currentInterval * currentEase);

    updatedWord.interval = Math.max(1, nextInterval);
    updatedWord.repetitions = (updatedWord.repetitions || 0) + 1;
    updatedWord.ease = currentEase;
    updatedWord.dueDate = getDueInDays(updatedWord.interval);
  }

  if (rating === "easy") {
    const nextInterval = updatedWord.repetitions === 0 ? 3 : Math.round(currentInterval * currentEase * 1.5);

    updatedWord.interval = Math.max(3, nextInterval);
    updatedWord.repetitions = (updatedWord.repetitions || 0) + 1;
    updatedWord.ease = currentEase + 0.15;
    updatedWord.dueDate = getDueInDays(updatedWord.interval);
  }

  updatedWord.updatedAt = Date.now();
  return updatedWord;
}

async function handleRating(rating) {
  if (!currentReviewWord) return;

  const updatedWord = scheduleReviewedWord(currentReviewWord, rating);

  await putItem("words", updatedWord);
  await refreshHomeStats();
  await renderWordsList();
  showNextReviewCard();
}

function getWordsFromImportJSON(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.words)) return data.words;
  return null;
}

function validateImportedWord(item, index) {
  if (!item || typeof item !== "object") {
    return `Item ${index + 1}: not an object`;
  }

  if (!item.word || typeof item.word !== "string") {
    return `Item ${index + 1}: missing word`;
  }

  if (!item.meaning || typeof item.meaning !== "string") {
    return `Item ${index + 1}: missing meaning`;
  }

  return null;
}

function getExercisesFromImportJSON(data) {
  if (Array.isArray(data)) {
    return {
      pack: {
        name: `Exercise Pack ${new Date().toLocaleDateString()}`,
        description: "Imported exercise pack",
        source: "import"
      },
      exercises: data
    };
  }

  if (Array.isArray(data.exercises)) {
    return {
      pack: data.pack || {},
      exercises: data.exercises
    };
  }

  return null;
}

function validateImportedExercise(item, index) {
  if (!item || typeof item !== "object") {
    return `Item ${index + 1}: not an object`;
  }

  if (!item.word || typeof item.word !== "string") {
    return `Item ${index + 1}: missing word`;
  }

  if (!item.type || typeof item.type !== "string") {
    return `Item ${index + 1}: missing type`;
  }

  if (!SUPPORTED_EXERCISE_TYPES.includes(item.type.trim())) {
    return `Item ${index + 1}: unsupported exercise type`;
  }

  if (!item.question || typeof item.question !== "string") {
    return `Item ${index + 1}: missing question`;
  }

  if (!Array.isArray(item.options) || item.options.length !== 4) {
    return `Item ${index + 1}: options must contain exactly 4 items`;
  }

  if (!item.answer || typeof item.answer !== "string") {
    return `Item ${index + 1}: missing answer`;
  }

  if (!item.options.includes(item.answer)) {
    return `Item ${index + 1}: answer must exactly match one of the options`;
  }

  return null;
}

function createExercisePack(packData, exerciseCount) {
  const now = Date.now();

  return {
    id: createId("pack"),
    name: String(packData.name || `Exercise Pack ${new Date().toLocaleDateString()}`).trim(),
    description: String(packData.description || "").trim(),
    source: String(packData.source || "import").trim(),
    exerciseCount,
    createdAt: now,
    importedAt: now
  };
}

function createExercise(item, packId, wordId) {
  const now = Date.now();

  return {
    id: createId("ex"),
    packId,
    wordId,
    word: item.word.trim(),
    type: item.type.trim(),
    question: item.question.trim(),
    options: item.options.map(option => String(option).trim()),
    answer: item.answer.trim(),
    createdAt: now,
    source: "import"
  };
}

async function importExercisePackFromJSON(data) {
  const parsed = getExercisesFromImportJSON(data);

  const result = {
    imported: 0,
    skippedDuplicates: 0,
    errors: []
  };

  if (!parsed) {
    result.errors.push("JSON must contain an exercises array.");
    return result;
  }

  const words = await getAll("words");
  const wordMap = new Map(words.map(word => [word.wordLower, word]));
  const existingExercises = await getAll("exercises");
  const existingExerciseSet = new Set(
    existingExercises.map(exercise => `${exercise.wordId}::${normalizeWord(exercise.question)}`)
  );

  const validExercises = [];

  for (let index = 0; index < parsed.exercises.length; index++) {
    const item = parsed.exercises[index];
    const validationError = validateImportedExercise(item, index);

    if (validationError) {
      result.errors.push(validationError);
      continue;
    }

    const word = wordMap.get(normalizeWord(item.word));

    if (!word) {
      result.errors.push(`Item ${index + 1}: word "${item.word}" not found`);
      continue;
    }

    const duplicateKey = `${word.id}::${normalizeWord(item.question)}`;

    if (existingExerciseSet.has(duplicateKey)) {
      result.skippedDuplicates++;
      continue;
    }

    validExercises.push({ item, word, duplicateKey });
  }

  if (!validExercises.length) {
    return result;
  }

  const pack = createExercisePack(parsed.pack, validExercises.length);
  await putItem("exercisePacks", pack);

  for (const entry of validExercises) {
    const exercise = createExercise(entry.item, pack.id, entry.word.id);
    await putItem("exercises", exercise);
    existingExerciseSet.add(entry.duplicateKey);
    result.imported++;
  }

  return result;
}

async function importWordsFromJSON(data) {
  const items = getWordsFromImportJSON(data);

  const result = {
    imported: 0,
    skippedDuplicates: 0,
    errors: []
  };

  if (!items) {
    result.errors.push("JSON must be an array or an object with a words array.");
    return result;
  }

  const existingWords = await getAll("words");
  const existingWordSet = new Set(existingWords.map(item => item.wordLower));

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const validationError = validateImportedWord(item, index);

    if (validationError) {
      result.errors.push(validationError);
      continue;
    }

    const wordLower = normalizeWord(item.word);

    if (existingWordSet.has(wordLower)) {
      result.skippedDuplicates++;
      continue;
    }

    const word = createWord({
      word: item.word,
      meaning: item.meaning,
      example: item.example || "",
      tags: item.tags || [],
      source: item.source || ""
    });

    await putItem("words", word);
    existingWordSet.add(word.wordLower);
    result.imported++;
  }

  return result;
}

function buildImportResultHTML(result) {
  return `
    ${result.typeLabel ? `<span>Type: ${escapeHTML(result.typeLabel)}</span>` : ""}
    <strong>Imported: ${result.imported}</strong>
    <span>Skipped duplicates: ${result.skippedDuplicates}</span>
    <span>Errors: ${result.errors.length}</span>
    ${
      result.errors.length
        ? `<ul>${result.errors.map(error => `<li>${escapeHTML(error)}</li>`).join("")}</ul>`
        : ""
    }
  `;
}

function showImportResult(result, options = {}) {
  const target = options.inline ? inlineImportResultEl : importResultEl;
  if (!target) return;

  target.hidden = false;
  target.innerHTML = buildImportResultHTML(result);

  if (options.inline && importResultEl) {
    importResultEl.hidden = true;
  }
}

function showButtonCopied(button) {
  if (!button) return;

  const originalText = button.dataset.originalText || button.textContent;
  button.dataset.originalText = originalText;
  button.textContent = "Copied!";
  button.classList.add("copied");
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("copied");
    button.disabled = false;
  }, 1400);
}

function showManualCopyPrompt(text, button) {
  document.querySelectorAll(".manual-copy-card").forEach(card => card.remove());

  const card = document.createElement("div");
  card.className = "manual-copy-card";
  card.innerHTML = `
    <strong>Copy manually</strong>
    <p>Auto-copy is blocked by this browser. Tap the text below, select all, then copy.</p>
    <textarea readonly></textarea>
  `;

  const textarea = card.querySelector("textarea");
  textarea.value = text;

  if (button?.parentElement) {
    button.parentElement.insertAdjacentElement("afterend", card);
  } else if (inlineImportResultEl) {
    inlineImportResultEl.hidden = false;
    inlineImportResultEl.innerHTML = "";
    inlineImportResultEl.appendChild(card);
  }

  window.setTimeout(() => {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
  }, 50);
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "0";
  textarea.style.top = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0";
  textarea.style.zIndex = "-1";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Fallback copy failed");
  }
}

async function copyPromptToClipboard(text, button) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopyText(text);
    }

    showButtonCopied(button);
  } catch (error) {
    try {
      fallbackCopyText(text);
      showButtonCopied(button);
    } catch (fallbackError) {
      showManualCopyPrompt(text, button);
    }
  }
}

function getPromptSourceName() {
  return promptSourceInput.value.trim() || "SOURCE_NAME";
}

function getPromptInputText() {
  return promptWordsInput.value.trim();
}

function buildWordsPrompt() {
  const sourceName = getPromptSourceName();
  const wordsText = getPromptInputText() || "PASTE_WORDS_HERE";

  return WORDS_JSON_PROMPT
    .replaceAll("SOURCE_NAME", sourceName)
    .replace("PASTE_WORDS_HERE", wordsText);
}

function buildExercisePrompt() {
  const sourceName = getPromptSourceName();
  const wordsText = getPromptInputText() || "PASTE_WORDS_OR_WORD_OBJECTS_HERE";

  return EXERCISE_PACK_PROMPT
    .replaceAll("SOURCE_NAME", sourceName)
    .replace("PASTE_WORDS_OR_WORD_OBJECTS_HERE", wordsText);
}

function updateSelectedJsonFileUI() {
  const file = genericJsonInput.files[0];

  if (!file) {
    genericJsonFileLabel.classList.remove("has-file");
    genericJsonFileButtonText.textContent = "Choose JSON file";
    selectedJsonFileName.hidden = true;
    selectedJsonFileName.textContent = "";
    return;
  }

  genericJsonFileLabel.classList.add("has-file");
  genericJsonFileButtonText.textContent = "JSON file selected";
  selectedJsonFileName.hidden = false;
  selectedJsonFileName.textContent = file.name;
}

async function getExerciseCoverage() {
  const words = await getAll("words");
  const exercises = await getAll("exercises");
  const wordIdsWithExercises = new Set(exercises.map(exercise => exercise.wordId).filter(Boolean));
  const missingWords = words.filter(word => !wordIdsWithExercises.has(word.id));

  return {
    totalWords: words.length,
    wordsWithExercises: words.length - missingWords.length,
    wordsWithoutExercises: missingWords.length,
    missingWords
  };
}

async function renderExerciseCoverage() {
  const coverage = await getExerciseCoverage();
  cachedExerciseCoverage = coverage;

  if (!coverage.totalWords) {
    exerciseCoverageText.textContent = "No words imported yet.";
    return;
  }

  exerciseCoverageText.textContent =
    `${coverage.wordsWithExercises} of ${coverage.totalWords} words have exercises. ` +
    `${coverage.wordsWithoutExercises} words still need exercises.`;
}

function copyMissingExercisesPrompt() {
  const coverage = cachedExerciseCoverage;

  if (!coverage) {
    showImportResult({
      typeLabel: "Missing exercises prompt",
      imported: 0,
      skippedDuplicates: 0,
      errors: ["Exercise coverage is still loading. Try again in a moment."]
    }, { inline: true });
    return;
  }

  if (!coverage.missingWords.length) {
    showImportResult({
      typeLabel: "Missing exercises prompt",
      imported: 0,
      skippedDuplicates: 0,
      errors: ["All words already have exercises."]
    }, { inline: true });
    return;
  }

  const batchSize = Number(missingExerciseBatchSizeSelect.value) || 10;
  const batchWords = coverage.missingWords.slice(0, batchSize).map(word => ({
    word: word.word,
    meaning: word.meaning,
    example: word.example,
    tags: word.tags,
    source: word.source
  }));
  const sourceName = promptSourceInput.value.trim() || "Missing Exercises";
  const prompt = EXERCISE_PACK_PROMPT
    .replaceAll("SOURCE_NAME", sourceName)
    .replace("PASTE_WORDS_OR_WORD_OBJECTS_HERE", JSON.stringify(batchWords, null, 2));

  copyPromptToClipboard(prompt, copyMissingExercisesPromptBtn);
}

function normalizeJSONText(text) {
  let cleanedText = String(text).trim();

  if (cleanedText.startsWith("```")) {
    cleanedText = cleanedText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();
  }

  // Fix plain quotes inside smart-quoted JSON strings before converting smart quotes.
  // Example: “Choose the sentence where "Timid" is used correctly.”
  // becomes: “Choose the sentence where 'Timid' is used correctly.”
  cleanedText = cleanedText.replace(/“([^”]*?)”/g, (match, content) => {
    return `“${content.replaceAll('"', "'")}”`;
  });

  cleanedText = cleanedText
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    .replaceAll("\uFEFF", "");

  return cleanedText;
}

function repairCommonJSONIssues(text) {
  return String(text)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
}

function getJSONErrorContext(text, error) {
  const message = error.message || "";
  const positionMatch = message.match(/position (\d+)/);
  const position = positionMatch ? Number(positionMatch[1]) : null;

  if (position === null) {
    return message;
  }

  const before = text.slice(0, position);
  const line = before.split("\n").length;
  const column = before.length - before.lastIndexOf("\n");
  const lines = text.split("\n");
  const start = Math.max(0, line - 3);
  const end = Math.min(lines.length, line + 2);
  const nearby = lines
    .slice(start, end)
    .map((lineText, index) => {
      const lineNumber = start + index + 1;
      const marker = lineNumber === line ? ">" : " ";
      return `${marker} ${lineNumber}: ${lineText}`;
    })
    .join("\n");

  return `${message}\n\nNear line ${line}, column ${column}:\n${nearby}`;
}

function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const normalizedText = normalizeJSONText(reader.result);
        const repairedText = repairCommonJSONIssues(normalizedText);
        resolve(JSON.parse(repairedText));
      } catch (error) {
        reject(new Error("Invalid JSON file."));
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function parseJSONText(text) {
  const normalizedText = normalizeJSONText(text);
  const repairedText = repairCommonJSONIssues(normalizedText);
  return JSON.parse(repairedText);
}

function detectPastedJSONType(data) {
  if (data && typeof data === "object" && data.app === "english-srs") {
    if (Array.isArray(data.exercisePacks) || Array.isArray(data.practiceAttempts)) {
      return "backup";
    }

    if (data.type === "exercisePack" || Array.isArray(data.exercises)) {
      return "exercisePack";
    }

    if (data.type === "words" || Array.isArray(data.words)) {
      return "words";
    }
  }

  if (Array.isArray(data)) {
    const firstItem = data[0];

    if (firstItem && firstItem.question && Array.isArray(firstItem.options) && firstItem.answer) {
      return "exercisePack";
    }

    return "words";
  }

  if (data && typeof data === "object" && Array.isArray(data.words)) {
    return "words";
  }

  if (data && typeof data === "object" && Array.isArray(data.exercises)) {
    return "exercisePack";
  }

  return null;
}

async function importJSONData(data, typeLabelPrefix = "Imported") {
  const type = detectPastedJSONType(data);
  let result;

  if (type === "backup") {
    result = await importBackupFromJSON(data);
  } else if (type === "exercisePack") {
    result = await importExercisePackFromJSON(data);
  } else if (type === "words") {
    result = await importWordsFromJSON(data);
  } else {
    showImportResult({
      imported: 0,
      skippedDuplicates: 0,
      errors: ["Could not detect JSON type."]
    }, { inline: true });
    return false;
  }

  const labels = {
    backup: `${typeLabelPrefix} backup JSON`,
    exercisePack: `${typeLabelPrefix} exercise pack JSON`,
    words: `${typeLabelPrefix} words JSON`
  };

  result.typeLabel = labels[type];
  showImportResult(result, { inline: true });
  await refreshHomeStats();
  await renderHomeWeakWordsSummary();
  await renderWordsList();
  await renderPracticePacks();
  await renderWeakWords();
  await renderExerciseCoverage();

  return true;
}

async function importGenericJSON() {
  const text = pasteJsonInput.value.trim();
  const file = genericJsonInput.files[0];

  if (text) {
    try {
      const data = parseJSONText(text);
      const imported = await importJSONData(data, "Pasted");

      if (imported) {
        pasteJsonInput.value = "";
        genericJsonInput.value = "";
        updateSelectedJsonFileUI();
      }
    } catch (error) {
      const normalizedText = normalizeJSONText(text);
      const repairedText = repairCommonJSONIssues(normalizedText);
      const context = getJSONErrorContext(repairedText, error);

      showImportResult({
        imported: 0,
        skippedDuplicates: 0,
        errors: [`Invalid pasted JSON:\n${context}`]
      }, { inline: true });
    }
    return;
  }

  if (file) {
    try {
      const data = await readJSONFile(file);
      const imported = await importJSONData(data, "File");

      if (imported) {
        pasteJsonInput.value = "";
        genericJsonInput.value = "";
        updateSelectedJsonFileUI();
      }
    } catch (error) {
      showImportResult({
        imported: 0,
        skippedDuplicates: 0,
        errors: [error.message]
      }, { inline: true });
    }
    return;
  }

  showImportResult({
    imported: 0,
    skippedDuplicates: 0,
    errors: ["Paste JSON or choose a JSON file first."]
  }, { inline: true });
}

async function exportBackup() {
  const backup = {
    app: "english-srs",
    version: 1,
    exportedAt: new Date().toISOString(),
    words: await getAll("words"),
    exercisePacks: await getAll("exercisePacks"),
    exercises: await getAll("exercises"),
    practiceAttempts: await getAll("practiceAttempts")
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `english-srs-backup-${date}.json`;
  link.click();

  URL.revokeObjectURL(url);
}

async function getWeakWords() {
  const words = await getAll("words");
  const attempts = await getAll("practiceAttempts");
  const attemptsByWordId = new Map();

  for (const attempt of attempts) {
    if (!attempt.wordId) continue;

    if (!attemptsByWordId.has(attempt.wordId)) {
      attemptsByWordId.set(attempt.wordId, []);
    }

    attemptsByWordId.get(attempt.wordId).push(attempt);
  }

  const weakWords = words
    .map(word => {
      const wordAttempts = (attemptsByWordId.get(word.id) || [])
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt);
      const recentAttempts = wordAttempts.slice(0, 5);
      const recentThreeAttempts = wordAttempts.slice(0, 3);
      const totalAttempts = wordAttempts.length;
      const totalCorrectAttempts = wordAttempts.filter(attempt => attempt.isCorrect).length;
      const totalWrongAttempts = totalAttempts - totalCorrectAttempts;
      const recentCorrectAttempts = recentAttempts.filter(attempt => attempt.isCorrect).length;
      const recentWrongAttempts = recentAttempts.length - recentCorrectAttempts;
      const recentAccuracy = recentAttempts.length
        ? Math.round((recentCorrectAttempts / recentAttempts.length) * 100)
        : 0;
      const latestAttempt = recentAttempts[0] || null;
      const lastThreeAllCorrect =
        recentThreeAttempts.length === 3 && recentThreeAttempts.every(attempt => attempt.isCorrect);
      const isWeak =
        !lastThreeAllCorrect &&
        (
          (latestAttempt && !latestAttempt.isCorrect) ||
          recentWrongAttempts >= 2 ||
          (recentAttempts.length >= 3 && recentAccuracy < 70)
        );

      return {
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        example: word.example,
        tags: word.tags,
        source: word.source,
        totalAttempts,
        wrongAttempts: recentWrongAttempts,
        correctAttempts: recentCorrectAttempts,
        accuracy: recentAccuracy,
        lifetimeWrongAttempts: totalWrongAttempts,
        lifetimeAccuracy: totalAttempts ? Math.round((totalCorrectAttempts / totalAttempts) * 100) : 0,
        isWeak
      };
    })
    .filter(word => word.isWeak)
    .sort((a, b) => b.wrongAttempts - a.wrongAttempts || a.accuracy - b.accuracy);

  return weakWords;
}

async function renderWeakWords() {
  const weakWords = await getWeakWords();
  cachedWeakWords = weakWords;
  const visibleWeakWords = isWeakWordsListVisible ? weakWords : weakWords.slice(0, 3);
  weakWordsExportSummary.textContent = weakWords.length
    ? `${weakWords.length} weak words need fresh practice.`
    : "No weak words ready for export yet.";

  if (!visibleWeakWords.length) {
    weakWordsPracticeSummary.textContent = "No weak words yet.";
    toggleWeakWordsBtn.hidden = true;
    weakWordsList.hidden = false;
    weakWordsList.innerHTML = `<p class="weak-words-empty">No weak words yet.</p>`;
    return;
  }

  weakWordsPracticeSummary.textContent = `${weakWords.length} weak words need attention.`;
  toggleWeakWordsBtn.hidden = false;
  toggleWeakWordsBtn.textContent = isWeakWordsListVisible ? "Hide" : "Show";
  weakWordsList.hidden = !isWeakWordsListVisible;
  weakWordsList.innerHTML = `
    ${visibleWeakWords
      .map(word => `
        <div class="weak-word-item">
          <strong>${escapeHTML(word.word)}</strong>
          <span>${word.wrongAttempts} wrong &middot; ${word.accuracy}%</span>
        </div>
      `)
      .join("")}
  `;
}

function exportWeakWordsPrompt() {
  const batchSize = Number(weakWordsBatchSizeSelect.value) || 10;
  const weakWords = cachedWeakWords
    .slice(0, batchSize)
    .map(word => ({
      word: word.word,
      meaning: word.meaning,
      example: word.example,
      tags: word.tags,
      source: word.source,
      totalAttempts: word.totalAttempts,
      wrongAttempts: word.wrongAttempts,
      accuracy: word.accuracy
    }));

  if (!weakWords.length) {
    showImportResult({
      typeLabel: "Weak words prompt",
      imported: 0,
      skippedDuplicates: 0,
      errors: ["No weak words found yet."]
    }, { inline: true });
    return;
  }

  const prompt = `Generate a new English SRS exercisePack JSON for the weak words below.

Everything must be in English.
Return ONLY valid JSON.
No markdown.
No comments.
No explanations.
Generate 3 exercises per weak word.
Use only these exercise types:
- choose_sentence
- fill_blank
- choose_meaning
- choose_word
Do not reuse old example sentences.
Do not reuse old answer options.
Use fresh contexts.
The answer must exactly match one of the options.
Keep the word exactly as provided.
If quotes are needed inside a sentence, use single quotes.

Return JSON in this shape:
{
  "type": "exercisePack",
  "pack": {
    "name": "Weak Words Practice",
    "description": "Fresh practice exercises for weak words",
    "source": "GPT weak words prompt"
  },
  "exercises": [
    {
      "word": "example",
      "type": "choose_sentence",
      "question": "Choose the sentence that uses the word correctly.",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    },
    {
      "word": "example",
      "type": "fill_blank",
      "question": "Fill in the blank: ...",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    },
    {
      "word": "example",
      "type": "choose_meaning",
      "question": "Choose the meaning of 'example'.",
      "options": ["...", "...", "...", "..."],
      "answer": "..."
    }
  ]
}

Weak words:
${JSON.stringify(weakWords, null, 2)}
`;

  copyPromptToClipboard(prompt, exportWeakWordsPromptBtn);
}

function validateBackupData(data) {
  if (!data || typeof data !== "object") {
    return "Backup must be a JSON object.";
  }

  if (data.app !== "english-srs") {
    return "This does not look like an English SRS backup.";
  }

  if (!Array.isArray(data.words)) {
    return "Backup is missing words array.";
  }

  return null;
}

async function mergeItemsById(storeName, items) {
  const result = {
    imported: 0,
    skippedDuplicates: 0
  };

  if (!Array.isArray(items)) return result;

  const existingItems = await getAll(storeName);
  const existingIds = new Set(existingItems.map(item => item.id));

  for (const item of items) {
    if (!item || !item.id) continue;

    if (existingIds.has(item.id)) {
      result.skippedDuplicates++;
      continue;
    }

    await putItem(storeName, item);
    existingIds.add(item.id);
    result.imported++;
  }

  return result;
}

async function importBackupFromJSON(data) {
  const validationError = validateBackupData(data);

  const result = {
    imported: 0,
    skippedDuplicates: 0,
    errors: []
  };

  if (validationError) {
    result.errors.push(validationError);
    return result;
  }

  const wordsResult = await mergeItemsById("words", data.words);
  const packsResult = await mergeItemsById("exercisePacks", data.exercisePacks || []);
  const exercisesResult = await mergeItemsById("exercises", data.exercises || []);
  const attemptsResult = await mergeItemsById("practiceAttempts", data.practiceAttempts || []);

  result.imported =
    wordsResult.imported +
    packsResult.imported +
    exercisesResult.imported +
    attemptsResult.imported;

  result.skippedDuplicates =
    wordsResult.skippedDuplicates +
    packsResult.skippedDuplicates +
    exercisesResult.skippedDuplicates +
    attemptsResult.skippedDuplicates;

  return result;
}

async function clearAllData() {
  const firstConfirm = confirm("Clear all local data? This will delete all words, packs, exercises, and practice history.");
  if (!firstConfirm) return;

  const secondConfirm = confirm("Are you sure? This cannot be undone unless you have a backup JSON file.");
  if (!secondConfirm) return;

  await clearStore("practiceAttempts");
  await clearStore("exercises");
  await clearStore("exercisePacks");
  await clearStore("words");

  reviewQueue = [];
  currentReviewWord = null;
  isAnswerVisible = false;
  practiceQueue = [];
  currentPracticeExercise = null;
  practiceTotal = 0;
  isPracticeAnswered = false;

  pasteJsonInput.value = "";
  genericJsonInput.value = "";
  updateSelectedJsonFileUI();
  wordSearchInput.value = "";
  resetWordForm();

  await refreshHomeStats();
  await renderHomeWeakWordsSummary();
  await renderWordsList();
  await renderPracticePacks();
  await renderWeakWords();
  await renderExerciseCoverage();

  showImportResult({
    typeLabel: "Clear all data",
    imported: 0,
    skippedDuplicates: 0,
    errors: []
  });

  showScreen("homeScreen");
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function shouldShowInstallTip() {
  return !isRunningStandalone() && localStorage.getItem("englishSrsInstallTipDismissed") !== "true";
}

function renderInstallTip() {
  installTipCard.hidden = !shouldShowInstallTip();
}

async function initApp() {
  appVersionTextEl.textContent = `English SRS v${APP_VERSION}\nCache: ${CACHE_VERSION_LABEL}`;

  await openDB();
  await refreshHomeStats();
  await renderHomeWeakWordsSummary();
  await renderWordsList();
  await renderPracticePacks();
  await renderWeakWords();
  await renderExerciseCoverage();
  renderInstallTip();

  addWordBtn.addEventListener("click", openNewWordForm);
  wordForm.addEventListener("submit", handleWordFormSubmit);
  deleteWordBtn.addEventListener("click", handleDeleteWord);
  cancelWordBtn.addEventListener("click", () => {
    resetWordForm();
    showScreen("wordsScreen");
  });
  wordSearchInput.addEventListener("input", renderWordsList);
  document.querySelector("#wordsScreen").addEventListener("click", event => {
    const card = event.target.closest(".word-card");
    if (!card) return;

    openEditWordForm(card.dataset.wordId);
  });

  practicePackList.addEventListener("click", event => {
    if (event.target.closest(".pack-select")) return;

    const card = event.target.closest(".practice-pack-card");
    if (!card) return;

    const action = event.target.closest("[data-pack-action]")?.dataset.packAction || "start";

    if (action === "delete") {
      deleteExercisePack(card.dataset.packId);
      return;
    }

    startPracticePack(card.dataset.packId);
  });

  practiceOptionsEl.addEventListener("click", event => {
    const button = event.target.closest(".practice-option-btn");
    if (!button) return;

    handlePracticeAnswer(button.dataset.option);
  });

  startSmartPracticeBtn.addEventListener("click", startSmartPractice);
  startWeakPracticeBtn.addEventListener("click", startWeakPractice);
  toggleWeakWordsBtn.addEventListener("click", () => {
    isWeakWordsListVisible = !isWeakWordsListVisible;
    renderWeakWords();
  });
  nextPracticeBtn.addEventListener("click", showNextPracticeExercise);
  backToPacksBtn.addEventListener("click", () => {
    showScreen("practiceScreen");
  });

  startReviewBtn.addEventListener("click", startReview);
  homeSmartPracticeBtn.addEventListener("click", startSmartPractice);
  homeOpenPracticeBtn.addEventListener("click", () => {
    showScreen("practiceScreen");
  });
  backHomeFromReviewBtn.addEventListener("click", () => {
    showScreen("homeScreen");
  });
  reviewCard.addEventListener("click", revealReviewAnswer);
  reviewActionsEl.addEventListener("click", event => {
    const button = event.target.closest("[data-rating]");
    if (!button) return;

    handleRating(button.dataset.rating);
  });
  copyWordsPromptBtn.addEventListener("click", () => {
    copyPromptToClipboard(buildWordsPrompt(), copyWordsPromptBtn);
  });
  copyExercisePromptBtn.addEventListener("click", () => {
    copyPromptToClipboard(buildExercisePrompt(), copyExercisePromptBtn);
  });
  copyMissingExercisesPromptBtn.addEventListener("click", copyMissingExercisesPrompt);
  genericJsonInput.addEventListener("change", updateSelectedJsonFileUI);
  importJsonBtn.addEventListener("click", importGenericJSON);
  topHelpBtn.addEventListener("click", () => {
    showScreen("helpScreen");
  });
  letsGetStartedBtn.addEventListener("click", () => {
    showScreen("helpScreen");
  });
  dismissInstallTipBtn.addEventListener("click", () => {
    localStorage.setItem("englishSrsInstallTipDismissed", "true");
    renderInstallTip();
  });
  backFromHelpBtn.addEventListener("click", () => {
    showScreen("importScreen");
  });
  clearAllDataBtn.addEventListener("click", clearAllData);
  exportBackupBtn.addEventListener("click", exportBackup);
  exportWeakWordsPromptBtn.addEventListener("click", exportWeakWordsPrompt);

  // temporary test helper in console:
  // addDemoWord()
  window.addDemoWord = addDemoWord;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(error => {
      console.log("Service worker registration failed:", error);
    });
  });
}

initApp();
