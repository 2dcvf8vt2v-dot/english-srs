const DB_NAME = "english-srs-db";
const DB_VERSION = 3;
const APP_VERSION = "1.2.0";
const CACHE_VERSION_LABEL = "english-srs-v6";
const DEFAULT_NEW_WORDS_PER_DAY = 20;
const DEFAULT_DAILY_GOAL = 20;
const FOCUSED_TAG_MIN_COUNT = 7;
const FOCUSED_TAG_MAX_VISIBLE = 60;
const EXERCISE_TYPE_DEFINITIONS = {
  choose_sentence: {
    label: "Sentence choice",
    group: "sentence_choice",
    source: "gpt",
    promptEnabled: true
  },
  fill_blank: {
    label: "Fill blank",
    group: "fill_blank",
    source: "gpt",
    promptEnabled: true
  },
  paraphrase_sentence: {
    label: "Paraphrase",
    group: "paraphrase",
    source: "gpt",
    promptEnabled: true
  },
  choose_best_context: {
    label: "Best context",
    group: "context",
    source: "gpt",
    promptEnabled: true
  },
  choose_tone: {
    label: "Tone",
    group: "tone",
    source: "gpt",
    promptEnabled: true
  },
  choose_meaning: {
    label: "Dictionary",
    group: "dictionary",
    source: "generated",
    promptEnabled: false
  },
  choose_word: {
    label: "Dictionary",
    group: "dictionary",
    source: "generated",
    promptEnabled: false
  }
};
const SUPPORTED_EXERCISE_TYPES = Object.keys(EXERCISE_TYPE_DEFINITIONS);
const PRACTICE_TYPE_GROUPS = [
  { group: "sentence_choice", label: "Sentence choice" },
  { group: "fill_blank", label: "Fill blank" },
  { group: "paraphrase", label: "Paraphrase" },
  { group: "context", label: "Best context" },
  { group: "tone", label: "Tone" },
  { group: "dictionary", label: "Dictionary" }
];
const WORDS_JSON_PROMPT = `Generate English SRS vocabulary JSON.

Return ONLY valid JSON.
No markdown.
No comments.
No explanations.
Everything must be in English.
Do not translate anything into Russian.
Use Oxford Learner's Dictionary / Cambridge Dictionary style as a reference.
Do not copy dictionary definitions word-for-word.
Write the meaning in your own words.
Prefer learner-friendly English.
Use simple words unless the target word requires precision.
Keep meanings short: usually 8-18 words.
Use simple, natural English meanings.
Meanings should explain the word clearly, not sound like a dictionary dump.
Definitions should describe how the word is actually used, not just give a loose synonym.
If the word is a verb, start the meaning with "to" when natural.
If the word is an adjective, describe what kind of person, thing, feeling, or situation it refers to.
If the word is a noun, explain what kind of thing, person, feeling, or idea it is.
Do not use the target word itself inside the meaning unless absolutely necessary.
Do not include labels like "noun", "verb", or "adjective" inside the meaning field.
Examples should be natural, useful, and different from the most obvious default example.
Do not copy dictionary examples.
Create a fresh natural example sentence.
The example should show the meaning clearly, but it must not be a sentence that future exercises should copy.
For phrases and idioms, explain the whole phrase.
Keep the original word or phrase spelling, but fix obvious capitalization if needed.
Skip proper names unless they are useful as vocabulary.
If a word has several meanings, choose the meaning most likely used in the provided context.
If no context is provided, choose the most common modern meaning.
If the input includes a sentence or book context, use that context to choose the right meaning.
If the word can be a phrase or idiom, explain the whole phrase, not each word separately.
Tags should be short and useful.
Use 2-5 tags per item.
Prefer tags that help practice and distractor selection, such as emotion, movement, speech, body, adjective, verb, noun, book, informal, formal.
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
EXERCISE_TYPE_SECTION_HERE
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
All answer options should be similar in length and detail.
Do not make the correct answer noticeably longer or more specific than the distractors.
Distractors should look equally plausible in length, grammar, and style.
Avoid obvious patterns where the correct answer is the longest option.
For every exercise, options should have similar length and complexity.
Wrong options should be clearly wrong by meaning, not because they look shorter, sillier, or unfinished.
The example field is forbidden exercise text.
Use the example only to understand the word.
Never copy the card example.
Never turn the card example into an exercise question.
Never closely paraphrase the card example.
Do not reuse the same setting, nouns, objects, or sentence structure as the card example.
Create fresh sentences with different contexts.
Avoid common default contexts when possible.
Do not reuse or closely imitate existing questions, answers, options, or examples if they are provided.
For every exercise, use a new sentence that is clearly different from the card example.
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
    EXERCISE_EXAMPLES_HERE
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
const exerciseTypeGrid = document.querySelector("#exerciseTypeGrid");
const weakWordsExportSummary = document.querySelector("#weakWordsExportSummary");
const weakWordsBatchSizeSelect = document.querySelector("#weakWordsBatchSizeSelect");
const genericJsonInput = document.querySelector("#genericJsonInput");
const genericJsonFileLabel = document.querySelector("#genericJsonFileLabel");
const genericJsonFileButtonText = document.querySelector("#genericJsonFileButtonText");
const selectedJsonFileName = document.querySelector("#selectedJsonFileName");
const pasteImportJsonBtn = document.querySelector("#pasteImportJsonBtn");
const pasteImportWordAuditBtn = document.querySelector("#pasteImportWordAuditBtn");
const importJsonBtn = document.querySelector("#importJsonBtn");
const exportBackupBtn = document.querySelector("#exportBackupBtn");
const exportWeakWordsPromptBtn = document.querySelector("#exportWeakWordsPromptBtn");
const openExerciseAuditBtn = document.querySelector("#openExerciseAuditBtn");
const openWordAuditBtn = document.querySelector("#openWordAuditBtn");
const backFromExerciseAuditBtn = document.querySelector("#backFromExerciseAuditBtn");
const backFromWordAuditBtn = document.querySelector("#backFromWordAuditBtn");
const runExerciseAuditBtn = document.querySelector("#runExerciseAuditBtn");
const runWordAuditBtn = document.querySelector("#runWordAuditBtn");
const selectWordAuditWarningsBtn = document.querySelector("#selectWordAuditWarningsBtn");
const selectWordAuditNotesBtn = document.querySelector("#selectWordAuditNotesBtn");
const clearWordAuditSelectionBtn = document.querySelector("#clearWordAuditSelectionBtn");
const copyWordAuditFixPromptBtn = document.querySelector("#copyWordAuditFixPromptBtn");
const deleteExactExerciseMatchesBtn = document.querySelector("#deleteExactExerciseMatchesBtn");
const deleteSelectedAuditBtn = document.querySelector("#deleteSelectedAuditBtn");
const showMoreAuditBtn = document.querySelector("#showMoreAuditBtn");
const selectShownAuditBtn = document.querySelector("#selectShownAuditBtn");
const clearAuditSelectionBtn = document.querySelector("#clearAuditSelectionBtn");
const exactAuditSummaryText = document.querySelector("#exactAuditSummaryText");
const similarAuditSummaryText = document.querySelector("#similarAuditSummaryText");
const exerciseAuditResult = document.querySelector("#exerciseAuditResult");
const wordAuditSummary = document.querySelector("#wordAuditSummary");
const wordAuditResult = document.querySelector("#wordAuditResult");
const refreshAppBtn = document.querySelector("#refreshAppBtn");
const clearAllDataBtn = document.querySelector("#clearAllDataBtn");
const newWordsPerDaySelect = document.querySelector("#newWordsPerDaySelect");
const rescheduleNewWordsBtn = document.querySelector("#rescheduleNewWordsBtn");
const dailyGoalSelect = document.querySelector("#dailyGoalSelect");
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
const focusedPracticeTypeGrid = document.querySelector("#focusedPracticeTypeGrid");
const focusedPracticeSourceSelect = document.querySelector("#focusedPracticeSourceSelect");
const focusedPracticeTagGrid = document.querySelector("#focusedPracticeTagGrid");
const toggleFocusedTagsBtn = document.querySelector("#toggleFocusedTagsBtn");
const focusedPracticeLimitSelect = document.querySelector("#focusedPracticeLimitSelect");
const focusedPracticePreview = document.querySelector("#focusedPracticePreview");
const startFocusedPracticeBtn = document.querySelector("#startFocusedPracticeBtn");
const startSmartPracticeBtn = document.querySelector("#startSmartPracticeBtn");
const smartPracticeLimitSelect = document.querySelector("#smartPracticeLimitSelect");
const weakPracticeLimitSelect = document.querySelector("#weakPracticeLimitSelect");
const startWeakPracticeBtn = document.querySelector("#startWeakPracticeBtn");
const toggleWeakWordsBtn = document.querySelector("#toggleWeakWordsBtn");
const weakWordsPracticeSummary = document.querySelector("#weakWordsPracticeSummary");
const weakWordsList = document.querySelector("#weakWordsList");
const dailyProgressText = document.querySelector("#dailyProgressText");
const streakText = document.querySelector("#streakText");
const dailyProgressFill = document.querySelector("#dailyProgressFill");
const reviewsTodayText = document.querySelector("#reviewsTodayText");
const practiceTodayText = document.querySelector("#practiceTodayText");
const todayAccuracyText = document.querySelector("#todayAccuracyText");
const matureWordsText = document.querySelector("#matureWordsText");
const weekStatsText = document.querySelector("#weekStatsText");
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
let cachedExerciseHistoryByWordId = new Map();
let cachedWeakWords = [];
let exerciseAuditVisibleCount = 10;
let selectedAuditExerciseIds = new Set();
let latestExerciseAudit = {
  exactMatches: [],
  similarMatches: []
};
let hasRunExerciseAudit = false;
let latestWordAudit = [];
let hasRunWordAudit = false;
let selectedWordAuditIds = new Set();

function buildExerciseHistoryByWordId(exercises) {
  const history = new Map();

  for (const exercise of exercises) {
    if (!exercise.wordId) continue;

    if (!history.has(exercise.wordId)) {
      history.set(exercise.wordId, {
        existingQuestions: [],
        existingAnswers: [],
        existingOptions: []
      });
    }

    const item = history.get(exercise.wordId);

    if (exercise.question && item.existingQuestions.length < 5) {
      item.existingQuestions.push(exercise.question);
    }

    if (exercise.answer && item.existingAnswers.length < 5) {
      item.existingAnswers.push(exercise.answer);
    }

    if (Array.isArray(exercise.options)) {
      for (const option of exercise.options) {
        if (item.existingOptions.length >= 12) break;
        if (!item.existingOptions.includes(option)) {
          item.existingOptions.push(option);
        }
      }
    }
  }

  return history;
}

function buildPromptWordObject(word) {
  const history = cachedExerciseHistoryByWordId.get(word.id) || {
    existingQuestions: [],
    existingAnswers: [],
    existingOptions: []
  };

  return {
    word: word.word,
    meaning: word.meaning,
    example: word.example,
    cardExample: word.example,
    tags: word.tags,
    source: word.source,
    existingQuestions: history.existingQuestions,
    existingAnswers: history.existingAnswers,
    existingOptions: history.existingOptions
  };
}
async function renderPracticePacks() {
  const packs = await getAll("exercisePacks");
  const exercises = await getAll("exercises");
  const attempts = await getAll("practiceAttempts");
  const exerciseCountByPackId = new Map();

  for (const exercise of exercises) {
    exerciseCountByPackId.set(
      exercise.packId,
      (exerciseCountByPackId.get(exercise.packId) || 0) + 1
    );
  }

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
            <span>${exerciseCountByPackId.get(pack.id) || 0} exercises</span>
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

function getSharedTagsScore(wordA, wordB) {
  const tagsA = new Set(wordA.tags || []);
  const tagsB = new Set(wordB.tags || []);
  return [...tagsA].filter(tag => tagsB.has(tag)).length;
}

function getMeaningLengthScore(targetWord, candidateWord) {
  const targetLength = String(targetWord.meaning || "").length;
  const candidateLength = String(candidateWord.meaning || "").length;
  const diff = Math.abs(targetLength - candidateLength);

  return -diff / 10;
}

function pickDistractorWords(targetWord, allWords, count = 3, options = {}) {
  const useMeaningLength = options.useMeaningLength === true;

  const candidates = allWords
    .filter(word => word.id !== targetWord.id)
    .filter(word => word.wordLower !== targetWord.wordLower)
    .filter(word => word.word && word.meaning && word.meaning.trim())
    .map(word => {
      const tagScore = getSharedTagsScore(targetWord, word) * 10;
      const lengthScore = useMeaningLength ? getMeaningLengthScore(targetWord, word) : 0;

      return {
        word,
        score: tagScore + lengthScore + Math.random()
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.word);

  const selected = [];

  for (const candidate of candidates) {
    if (selected.length >= count) break;

    const duplicateMeaning = selected.some(item =>
      normalizeExerciseText(item.meaning) === normalizeExerciseText(candidate.meaning)
    );

    if (!duplicateMeaning) {
      selected.push(candidate);
    }
  }

  return selected;
}

function canGenerateDictionaryExercise(targetWord, allWords) {
  return Boolean(
    targetWord &&
    targetWord.word &&
    targetWord.meaning &&
    pickDistractorWords(targetWord, allWords, 3).length >= 3
  );
}

function createGeneratedDictionaryExercise(targetWord, allWords, type) {
  const useMeaningLength = type === "choose_meaning";
  const distractors = pickDistractorWords(targetWord, allWords, 3, { useMeaningLength });

  if (distractors.length < 3) {
    return null;
  }

  if (type === "choose_meaning") {
    const options = shuffleArray([
      targetWord.meaning,
      ...distractors.map(word => word.meaning)
    ]);

    return {
      id: `generated_meaning_${targetWord.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      packId: "generated_dictionary",
      wordId: targetWord.id,
      word: targetWord.word,
      type: "choose_meaning",
      question: `Choose the best meaning of '${targetWord.word}'.`,
      options,
      answer: targetWord.meaning,
      createdAt: Date.now(),
      source: "generated"
    };
  }

  if (type === "choose_word") {
    const options = shuffleArray([
      targetWord.word,
      ...distractors.map(word => word.word)
    ]);

    return {
      id: `generated_word_${targetWord.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      packId: "generated_dictionary",
      wordId: targetWord.id,
      word: targetWord.word,
      type: "choose_word",
      question: `Which word means: ${targetWord.meaning}`,
      options,
      answer: targetWord.word,
      createdAt: Date.now(),
      source: "generated"
    };
  }

  return null;
}

function buildGeneratedDictionaryExercises(words, limit = 20) {
  const eligibleWords = words.filter(word => canGenerateDictionaryExercise(word, words));
  const generated = [];

  for (const word of shuffleArray(eligibleWords)) {
    if (generated.length >= limit) break;

    const type = Math.random() < 0.5 ? "choose_meaning" : "choose_word";
    const exercise = createGeneratedDictionaryExercise(word, words, type);

    if (exercise) {
      generated.push(exercise);
    }
  }

  return generated;
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
  const generatedDictionaryExercises = buildGeneratedDictionaryExercises(words, limit);
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

  const scoredImportedExercises = selectedPackExercises
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
    });

  const scoredGeneratedExercises = generatedDictionaryExercises
    .map(exercise => {
      const word = wordsById.get(exercise.wordId);
      const wordAttempts = attemptsByWordId.get(exercise.wordId) || [];
      const latestWordAttempt = wordAttempts
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      const wrongAttempts = wordAttempts.filter(attempt => !attempt.isCorrect).length;
      let score = 35;

      if (word && word.dueDate <= now) score += 100;
      if (latestWordAttempt && !latestWordAttempt.isCorrect) score += 80;
      score += Math.min(wrongAttempts * 15, 60);
      if (word && word.repetitions === 0) score += 10;

      return {
        exercise,
        score
      };
    });

  const selected = [...scoredImportedExercises, ...scoredGeneratedExercises]
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

async function startFocusedPractice() {
  const limit = Number(focusedPracticeLimitSelect?.value) || 20;
  const matches = await getFocusedPracticeMatches();

  if (!matches.selectedPackCount) {
    showScreen("practiceScreen");
    alert("Select at least one pack for Focused Practice.");
    return;
  }

  const generatedDictionaryExercises = matches.selectedGroups.has("dictionary")
    ? buildGeneratedDictionaryExercises(matches.dictionaryWords, limit)
    : [];
  const selected = shuffleArray([...matches.importedExercises, ...generatedDictionaryExercises])
    .slice(0, limit);

  if (!selected.length) {
    showScreen("practiceScreen");
    alert("No exercises match the selected Focused Practice filters.");
    return;
  }

  practiceQueue = selected;
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
  const allWords = await getAll("words");
  const wordsById = new Map(allWords.map(word => [word.id, word]));
  const weakWordIds = new Set(weakWords.map(word => word.id));
  const weakWordsById = new Map(weakWords.map(word => [word.id, word]));
  const matchingExercises = exercises.filter(exercise => weakWordIds.has(exercise.wordId));
  const generatedWeakExercises = [];

  for (const weakWord of weakWords) {
    const fullWord = wordsById.get(weakWord.id);
    if (!fullWord) continue;

    const type = Math.random() < 0.5 ? "choose_meaning" : "choose_word";
    const generated = createGeneratedDictionaryExercise(fullWord, allWords, type);
    if (generated) {
      generatedWeakExercises.push(generated);
    }
  }

  const allWeakExercises = [...matchingExercises, ...generatedWeakExercises];

  if (!allWeakExercises.length) {
    showScreen("practiceScreen");
    alert("No exercises available for weak words.");
    return;
  }

  const limit = Number(weakPracticeLimitSelect.value) || 10;
  const selected = allWeakExercises
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
  await logActivity("practice", {
    wordId: currentPracticeExercise.wordId,
    exerciseId: currentPracticeExercise.id,
    packId: currentPracticeExercise.packId,
    value: isCorrect ? "correct" : "wrong"
  });
  await refreshHomeStats();
  await renderHomeProgress();
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

async function saveReviewAttempt(word, rating) {
  const attempt = {
    id: createId("review_attempt"),
    wordId: word.id,
    rating,
    createdAt: Date.now()
  };

  await putItem("reviewAttempts", attempt);
}

async function logActivity(type, details = {}) {
  const item = {
    id: createId("activity"),
    type,
    wordId: details.wordId || null,
    exerciseId: details.exerciseId || null,
    packId: details.packId || null,
    value: details.value || null,
    createdAt: Date.now()
  };

  try {
    await putItem("activityLog", item);
  } catch (error) {
    console.log("Activity log write failed:", error);
  }
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
let utilityReturnScreen = "moreScreen";
let wordFormReturnScreen = "wordsScreen";

const titles = {
  homeScreen: "Home",
  reviewScreen: "Review",
  practiceScreen: "Practice",
  practiceSessionScreen: "Practice",
  wordsScreen: "Words",
  wordFormScreen: "Word",
  importScreen: "Import",
  moreScreen: "More",
  helpScreen: "Help",
  exerciseAuditScreen: "Exercise audit",
  wordAuditScreen: "Word audit"
};

function getBackLabelForScreen(screenId) {
  const labels = {
    homeScreen: "Home",
    importScreen: "Import",
    moreScreen: "More",
    practiceScreen: "Practice",
    wordsScreen: "Words"
  };

  return labels[screenId] || "Back";
}

function showScreen(screenId) {
  const currentScreenId = document.querySelector(".screen.active")?.id || "homeScreen";
  const utilityScreens = new Set(["helpScreen", "exerciseAuditScreen", "wordAuditScreen"]);

  if (utilityScreens.has(screenId) && currentScreenId !== screenId) {
    utilityReturnScreen = currentScreenId;
  }

  screens.forEach(screen => {
    screen.classList.toggle("active", screen.id === screenId);
  });

  navButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.screen === screenId);
  });

  screenTitle.textContent = titles[screenId] || "English SRS";

  if (screenId === "helpScreen" && backFromHelpBtn) {
    backFromHelpBtn.textContent = `Back to ${getBackLabelForScreen(utilityReturnScreen)}`;
  }

  if (screenId === "exerciseAuditScreen" && backFromExerciseAuditBtn) {
    backFromExerciseAuditBtn.textContent = `Back to ${getBackLabelForScreen(utilityReturnScreen)}`;
  }

  if (screenId === "wordAuditScreen" && backFromWordAuditBtn) {
    backFromWordAuditBtn.textContent = `Back to ${getBackLabelForScreen(utilityReturnScreen)}`;
  }

  if (topHelpBtn) {
    topHelpBtn.hidden = !(screenId === "homeScreen" || screenId === "importScreen" || screenId === "moreScreen");
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

      if (!database.objectStoreNames.contains("reviewAttempts")) {
        const reviewAttemptsStore = database.createObjectStore("reviewAttempts", {
          keyPath: "id"
        });

        reviewAttemptsStore.createIndex("wordId", "wordId", { unique: false });
        reviewAttemptsStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!database.objectStoreNames.contains("activityLog")) {
        const activityLogStore = database.createObjectStore("activityLog", {
          keyPath: "id"
        });

        activityLogStore.createIndex("type", "type", { unique: false });
        activityLogStore.createIndex("createdAt", "createdAt", { unique: false });
        activityLogStore.createIndex("wordId", "wordId", { unique: false });
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

async function safeGetAll(storeName, fallback = []) {
  try {
    return await getAll(storeName);
  } catch (error) {
    console.log(`Could not read ${storeName}:`, error);
    return fallback;
  }
}

function putItem(storeName, item) {
  return new Promise((resolve, reject) => {
    const request = getStore(storeName, "readwrite").put(item);

    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

async function getSetting(key, fallbackValue) {
  const item = await new Promise((resolve, reject) => {
    const request = getStore("settings").get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return item ? item.value : fallbackValue;
}

async function setSetting(key, value) {
  await putItem("settings", {
    key,
    value,
    updatedAt: Date.now()
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

function startOfLocalDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function isSameLocalDay(a, b) {
  return startOfLocalDay(a) === startOfLocalDay(b);
}

function normalizeWord(word) {
  return word.trim().toLowerCase();
}

function getExerciseTypeDefinition(type) {
  return EXERCISE_TYPE_DEFINITIONS[type] || {
    label: type,
    group: "other",
    source: "unknown",
    promptEnabled: false
  };
}

function getExerciseTypeLabel(type) {
  return getExerciseTypeDefinition(type).label;
}

function getExerciseTypeGroup(type) {
  return getExerciseTypeDefinition(type).group;
}

function isGeneratedExerciseType(type) {
  return getExerciseTypeDefinition(type).source === "generated";
}

function isGptExerciseType(type) {
  return getExerciseTypeDefinition(type).source === "gpt";
}

function getPromptEnabledExerciseTypes() {
  return SUPPORTED_EXERCISE_TYPES.filter(type => getExerciseTypeDefinition(type).promptEnabled);
}

function renderFocusedPracticeTypePicker() {
  if (!focusedPracticeTypeGrid) return;

  focusedPracticeTypeGrid.innerHTML = PRACTICE_TYPE_GROUPS.map(item => `
    <button
      class="focused-type-chip active"
      type="button"
      data-focused-type="${escapeHTML(item.group)}"
      aria-pressed="true"
    >
      ${escapeHTML(item.label)}
    </button>
  `).join("");
}

async function renderFocusedPracticeSourceFilter() {
  if (!focusedPracticeSourceSelect) return;

  const words = await getAll("words");
  const currentValue = focusedPracticeSourceSelect.value || "all";
  const sources = [...new Set(words.map(word => word.source).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  focusedPracticeSourceSelect.innerHTML = `
    <option value="all">All sources</option>
    ${sources.map(source => `<option value="${escapeHTML(source)}">${escapeHTML(source)}</option>`).join("")}
  `;

  if (currentValue === "all" || sources.includes(currentValue)) {
    focusedPracticeSourceSelect.value = currentValue;
  }
}

async function renderFocusedPracticeTagFilter() {
  if (!focusedPracticeTagGrid) return;

  const words = await getAll("words");
  const selectedTags = getSelectedFocusedTags();
  const tagCounts = new Map();

  for (const word of words) {
    for (const tag of word.tags || []) {
      if (!tag) continue;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const tags = [...tagCounts.entries()]
    .filter(([, count]) => count >= FOCUSED_TAG_MIN_COUNT)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FOCUSED_TAG_MAX_VISIBLE);

  if (!tags.length) {
    focusedPracticeTagGrid.innerHTML = `
      <p class="muted focused-tag-empty">
        No common tags yet. Tags will appear here when at least ${FOCUSED_TAG_MIN_COUNT} words use the same tag.
      </p>
    `;
    return;
  }

  focusedPracticeTagGrid.innerHTML = tags.map(([tag, count]) => `
    <button
      class="focused-tag-chip ${selectedTags.has(tag) ? "active" : ""}"
      type="button"
      data-focused-tag="${escapeHTML(tag)}"
      aria-pressed="${selectedTags.has(tag) ? "true" : "false"}"
    >
      <span>${escapeHTML(tag)}</span>
      <small>${count}</small>
    </button>
  `).join("");
}

function getSelectedFocusedPracticeGroups() {
  if (!focusedPracticeTypeGrid) {
    return new Set(PRACTICE_TYPE_GROUPS.map(item => item.group));
  }

  const selected = [...focusedPracticeTypeGrid.querySelectorAll(".focused-type-chip.active")]
    .map(button => button.dataset.focusedType)
    .filter(Boolean);

  return new Set(selected.length ? selected : PRACTICE_TYPE_GROUPS.map(item => item.group));
}

function matchesFocusedPracticeType(exercise, selectedGroups) {
  return selectedGroups.has(getExerciseTypeGroup(exercise.type));
}

function getSelectedFocusedSource() {
  return focusedPracticeSourceSelect?.value || "all";
}

function getSelectedFocusedTags() {
  if (!focusedPracticeTagGrid) return new Set();

  return new Set(
    [...focusedPracticeTagGrid.querySelectorAll(".focused-tag-chip.active")]
      .map(button => button.dataset.focusedTag)
      .filter(Boolean)
  );
}

function wordMatchesFocusedFilters(word, selectedSource, selectedTags) {
  if (!word) return false;

  if (selectedSource !== "all" && word.source !== selectedSource) {
    return false;
  }

  if (selectedTags.size) {
    const wordTags = new Set(word.tags || []);
    const hasAnyTag = [...selectedTags].some(tag => wordTags.has(tag));
    if (!hasAnyTag) return false;
  }

  return true;
}

async function getFocusedPracticeMatches() {
  const selectedGroups = getSelectedFocusedPracticeGroups();
  const selectedSource = getSelectedFocusedSource();
  const selectedTags = getSelectedFocusedTags();
  const selectedPackIds = new Set(
    [...practicePackList.querySelectorAll('[data-pack-select="true"]:checked')]
      .map(input => input.value)
  );

  const exercises = await getAll("exercises");
  const words = await getAll("words");
  const wordsById = new Map(words.map(word => [word.id, word]));
  const importedExercises = selectedPackIds.size
    ? exercises
      .filter(exercise => selectedPackIds.has(exercise.packId))
      .filter(exercise => matchesFocusedPracticeType(exercise, selectedGroups))
      .filter(exercise => wordMatchesFocusedFilters(wordsById.get(exercise.wordId), selectedSource, selectedTags))
    : [];
  const eligibleDictionaryWords = selectedGroups.has("dictionary")
    ? words.filter(word => wordMatchesFocusedFilters(word, selectedSource, selectedTags))
    : [];
  const dictionaryWords = eligibleDictionaryWords.filter(word =>
    canGenerateDictionaryExercise(word, eligibleDictionaryWords)
  );

  return {
    selectedPackCount: selectedPackIds.size,
    importedExercises,
    dictionaryWords,
    selectedGroups,
    selectedSource,
    selectedTags
  };
}

async function renderFocusedPracticePreview() {
  if (!focusedPracticePreview) return;

  try {
    const matches = await getFocusedPracticeMatches();

    if (!matches.selectedPackCount) {
      focusedPracticePreview.textContent = "Matches: select at least one pack";
      return;
    }

    const pieces = [];
    pieces.push(`${matches.importedExercises.length} imported exercises`);

    if (matches.selectedGroups.has("dictionary")) {
      pieces.push(`${matches.dictionaryWords.length} dictionary words`);
    }

    focusedPracticePreview.textContent = `Matches: ${pieces.join(" · ")}`;
  } catch (error) {
    console.log("Focused Practice preview failed:", error);
    focusedPracticePreview.textContent = "Could not preview Focused Practice matches.";
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeExerciseText(text, targetWord = "") {
  const targetPattern = targetWord.trim()
    ? new RegExp(`\\b${escapeRegExp(targetWord.toLowerCase())}\\b`, "gi")
    : null;
  let normalizedText = String(text || "")
    .toLowerCase()
    .replaceAll("______", " ")
    .replaceAll("____", " ");

  if (targetPattern) {
    normalizedText = normalizedText.replace(targetPattern, " ");
  }

  return normalizedText
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWordOverlapScore(a, b) {
  const wordsA = normalizeExerciseText(a).split(" ").filter(Boolean);
  const wordsB = normalizeExerciseText(b).split(" ").filter(Boolean);

  if (!wordsA.length || !wordsB.length) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const shared = [...setA].filter(word => setB.has(word));

  return shared.length / Math.min(setA.size, setB.size);
}

function isExerciseTooSimilarToExample(item, word) {
  const example = word.example || "";
  if (!example.trim()) return false;

  const normalizedExample = normalizeExerciseText(example, word.word);
  const textsToCheck = [
    item.question,
    item.answer,
    ...(Array.isArray(item.options) ? item.options : [])
  ];

  for (const text of textsToCheck) {
    const normalizedText = normalizeExerciseText(text, word.word);

    if (!normalizedText) continue;

    if (normalizedText === normalizedExample) {
      return true;
    }

    if (normalizedText.includes(normalizedExample) || normalizedExample.includes(normalizedText)) {
      return true;
    }

    const overlap = getWordOverlapScore(normalizedText, normalizedExample);
    if (overlap >= 0.75) {
      return true;
    }
  }

  return false;
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

function createWord({ word, meaning, example = "", tags = [], source = "", dueDate = Date.now() }) {
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
    dueDate,
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

function getStreakFromActivityDates(timestamps) {
  const daySet = new Set(timestamps.map(timestamp => startOfLocalDay(timestamp)));
  let streak = 0;
  let cursor = startOfLocalDay(Date.now());

  while (daySet.has(cursor)) {
    streak++;
    cursor -= 24 * 60 * 60 * 1000;
  }

  return streak;
}

async function renderHomeProgress() {
  if (
    !dailyProgressText ||
    !streakText ||
    !dailyProgressFill ||
    !reviewsTodayText ||
    !practiceTodayText ||
    !todayAccuracyText ||
    !matureWordsText ||
    !weekStatsText
  ) return;

  const words = await safeGetAll("words");
  const practiceAttempts = await safeGetAll("practiceAttempts");
  const reviewAttempts = await safeGetAll("reviewAttempts");
  const dailyGoal = Number(await getSetting("dailyGoal", DEFAULT_DAILY_GOAL)) || DEFAULT_DAILY_GOAL;

  const todayStart = startOfLocalDay();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const reviewsToday = reviewAttempts.filter(attempt => attempt.createdAt >= todayStart).length;
  const practiceToday = practiceAttempts.filter(attempt => attempt.createdAt >= todayStart);
  const practiceTodayCount = practiceToday.length;
  const todayCorrect = practiceToday.filter(attempt => attempt.isCorrect).length;
  const todayAccuracy = practiceTodayCount
    ? Math.round((todayCorrect / practiceTodayCount) * 100)
    : null;

  const weekPractice = practiceAttempts.filter(attempt => attempt.createdAt >= sevenDaysAgo);
  const weekCorrect = weekPractice.filter(attempt => attempt.isCorrect).length;
  const weekAccuracy = weekPractice.length
    ? Math.round((weekCorrect / weekPractice.length) * 100)
    : null;

  const matureWords = words.filter(word =>
    (Number(word.repetitions) || 0) >= 3 || (Number(word.interval) || 0) >= 7
  ).length;

  const activityTimestamps = [
    ...reviewAttempts.map(attempt => attempt.createdAt),
    ...practiceAttempts.map(attempt => attempt.createdAt)
  ];
  const streak = getStreakFromActivityDates(activityTimestamps);

  const todayActions = reviewsToday + practiceTodayCount;
  const progressPercent = Math.min(100, Math.round((todayActions / dailyGoal) * 100));

  dailyProgressText.textContent = `${todayActions} / ${dailyGoal} today`;
  streakText.textContent = `${streak}-day streak`;
  dailyProgressFill.style.width = `${progressPercent}%`;
  reviewsTodayText.textContent = reviewsToday;
  practiceTodayText.textContent = practiceTodayCount;
  todayAccuracyText.textContent = todayAccuracy === null ? "–" : `${todayAccuracy}%`;
  matureWordsText.textContent = matureWords;
  weekStatsText.textContent = weekAccuracy === null
    ? "No 7-day practice data yet."
    : `${weekPractice.length} practice answers in 7 days · ${weekAccuracy}% correct`;
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

function openNewWordForm(returnScreen = "wordsScreen") {
  wordFormReturnScreen = returnScreen;
  resetWordForm();
  showScreen("wordFormScreen");
}

function fillWordForm(word, returnScreen = "wordsScreen") {
  wordFormReturnScreen = returnScreen;
  wordIdInput.value = word.id;
  wordInput.value = word.word;
  meaningInput.value = word.meaning;
  exampleInput.value = word.example || "";
  tagsInput.value = (word.tags || []).join(", ");
  sourceInput.value = word.source || "";
  deleteWordBtn.hidden = false;
  showScreen("wordFormScreen");
}

async function openEditWordForm(wordId, returnScreen = "wordsScreen") {
  const word = await getWordById(wordId);
  if (!word) return;

  fillWordForm(word, returnScreen);
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
    await renderFocusedPracticeSourceFilter();
    await renderFocusedPracticeTagFilter();
    await renderFocusedPracticePreview();
    if (wordFormReturnScreen === "wordAuditScreen" && hasRunWordAudit) {
      await runWordAudit();
    }
    showScreen(wordFormReturnScreen || "wordsScreen");
  } catch (error) {
    alert("Could not save this word. It may already exist.");
    console.log(error);
  }
}

async function handleDeleteWord() {
  const wordId = wordIdInput.value;
  if (!wordId) return;

  const confirmed = confirm("Delete this word and its related exercises/practice attempts?");
  if (!confirmed) return;

  const exercises = await getAll("exercises");
  const attempts = await getAll("practiceAttempts");
  const relatedExercises = exercises.filter(exercise => exercise.wordId === wordId);
  const relatedExerciseIds = new Set(relatedExercises.map(exercise => exercise.id));

  for (const exercise of relatedExercises) {
    await deleteItem("exercises", exercise.id);
  }

  for (const attempt of attempts) {
    if (attempt.wordId === wordId || relatedExerciseIds.has(attempt.exerciseId)) {
      await deleteItem("practiceAttempts", attempt.id);
    }
  }

  await deleteItem("words", wordId);
  resetWordForm();
  await refreshHomeStats();
  await renderHomeWeakWordsSummary();
  await renderWordsList();
  await renderPracticePacks();
  await renderWeakWords();
  await renderExerciseCoverage();
  await renderFocusedPracticeSourceFilter();
  await renderFocusedPracticeTagFilter();
  await renderFocusedPracticePreview();
  if (wordFormReturnScreen === "wordAuditScreen" && hasRunWordAudit) {
    await runWordAudit();
  }
  showScreen(wordFormReturnScreen || "wordsScreen");
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
    reviewHintEl.hidden = false;
    reviewHintEl.textContent = "No words are due right now.";
    reviewMeaningEl.textContent = "";
    reviewExampleEl.textContent = "";
    return;
  }

  reviewProgressEl.textContent = `${reviewQueue.length + 1} cards left`;
  reviewWordEl.textContent = currentReviewWord.word;
  reviewHintEl.hidden = false;
  reviewHintEl.textContent = "Tap to reveal";
  reviewMeaningEl.textContent = currentReviewWord.meaning;
  reviewExampleEl.textContent = currentReviewWord.example || "";
}

function revealReviewAnswer() {
  if (!currentReviewWord || isAnswerVisible) return;

  isAnswerVisible = true;
  reviewAnswerEl.hidden = false;
  reviewActionsEl.hidden = false;
  reviewHintEl.hidden = true;
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
  try {
    await saveReviewAttempt(currentReviewWord, rating);
  } catch (error) {
    console.log("Review attempt save failed:", error);
  }
  await logActivity("review", { wordId: currentReviewWord.id, value: rating });
  await refreshHomeStats();
  await renderHomeProgress();
  await renderWordsList();
  showNextReviewCard();
}

function getWordsFromImportJSON(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.words)) return data.words;
  return null;
}

function getWordFixesFromImportJSON(data) {
  if (!data || typeof data !== "object") return null;
  if (data.app !== "english-srs") return null;
  if (data.type !== "wordFixes") return null;
  if (!Array.isArray(data.words)) return null;
  return data.words;
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

function validateWordFix(item, index) {
  if (!item || typeof item !== "object") {
    return `Item ${index + 1}: not an object`;
  }

  if (!item.id || typeof item.id !== "string") {
    return `Item ${index + 1}: missing id`;
  }

  if (!item.word || typeof item.word !== "string") {
    return `Item ${index + 1}: missing word`;
  }

  if (!item.meaning || typeof item.meaning !== "string") {
    return `Item ${index + 1}: missing meaning`;
  }

  if (item.example !== undefined && typeof item.example !== "string") {
    return `Item ${index + 1}: example must be a string`;
  }

  if (item.tags !== undefined && !Array.isArray(item.tags) && typeof item.tags !== "string") {
    return `Item ${index + 1}: tags must be an array or comma-separated string`;
  }

  if (item.source !== undefined && typeof item.source !== "string") {
    return `Item ${index + 1}: source must be a string`;
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

    if (isExerciseTooSimilarToExample(item, word)) {
      result.skippedDuplicates++;
      result.errors.push(`Item ${index + 1}: skipped because it reuses the card example`);
      continue;
    }

    const duplicateKey = `${word.id}::${normalizeWord(item.question)}`;

    if (existingExerciseSet.has(duplicateKey)) {
      result.skippedDuplicates++;
      continue;
    }

    validExercises.push({ item, word, duplicateKey });
    existingExerciseSet.add(duplicateKey);
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
  const newWordsPerDay = Number(await getSetting("newWordsPerDay", DEFAULT_NEW_WORDS_PER_DAY)) || DEFAULT_NEW_WORDS_PER_DAY;
  let newWordIndex = 0;

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

    const dayOffset = Math.floor(newWordIndex / newWordsPerDay);
    const scheduledDueDate = getDueInDays(dayOffset);
    const word = createWord({
      word: item.word,
      meaning: item.meaning,
      example: item.example || "",
      tags: item.tags || [],
      source: item.source || "",
      dueDate: scheduledDueDate
    });

    await putItem("words", word);
    existingWordSet.add(word.wordLower);
    result.imported++;
    newWordIndex++;
  }

  if (result.imported > newWordsPerDay) {
    result.errors.push(
      `New words were spread across ${Math.ceil(result.imported / newWordsPerDay)} days using the ${newWordsPerDay}/day limit.`
    );
  }

  return result;
}

async function rescheduleUnreviewedWords() {
  const newWordsPerDay = Number(await getSetting("newWordsPerDay", DEFAULT_NEW_WORDS_PER_DAY)) || DEFAULT_NEW_WORDS_PER_DAY;
  const words = await getAll("words");

  const unreviewedWords = words
    .filter(word => (Number(word.repetitions) || 0) === 0)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0) || a.word.localeCompare(b.word));

  if (!unreviewedWords.length) {
    alert("No unreviewed words to reschedule.");
    return;
  }

  const confirmed = confirm(
    `Reschedule ${unreviewedWords.length} unreviewed words using the ${newWordsPerDay}/day limit? Reviewed words and progress will stay unchanged.`
  );

  if (!confirmed) return;

  const now = Date.now();

  for (let index = 0; index < unreviewedWords.length; index++) {
    const dayOffset = Math.floor(index / newWordsPerDay);
    const updatedWord = {
      ...unreviewedWords[index],
      dueDate: getDueInDays(dayOffset),
      updatedAt: now
    };

    await putItem("words", updatedWord);
  }

  await refreshHomeStats();
  await renderHomeProgress();
  await renderWordsList();
  await renderHomeWeakWordsSummary();
  await renderFocusedPracticeSourceFilter();
  await renderFocusedPracticeTagFilter();
  await renderFocusedPracticePreview();
  await logActivity("reschedule_new_words", { value: String(unreviewedWords.length) });

  alert(`Rescheduled ${unreviewedWords.length} unreviewed words across ${Math.ceil(unreviewedWords.length / newWordsPerDay)} days.`);
}

async function importWordFixesFromJSON(data) {
  const fixes = getWordFixesFromImportJSON(data);

  const result = {
    imported: 0,
    skippedDuplicates: 0,
    errors: []
  };

  if (!fixes) {
    result.errors.push("JSON must be a wordFixes object with a words array.");
    return result;
  }

  const existingWords = await getAll("words");
  const wordsById = new Map(existingWords.map(word => [word.id, word]));

  for (let index = 0; index < fixes.length; index++) {
    const item = fixes[index];
    const validationError = validateWordFix(item, index);

    if (validationError) {
      result.errors.push(validationError);
      continue;
    }

    const existingWord = wordsById.get(item.id);

    if (!existingWord) {
      result.errors.push(`Item ${index + 1}: word id "${item.id}" not found`);
      continue;
    }

    if (normalizeWord(item.word) !== existingWord.wordLower) {
      result.errors.push(`Item ${index + 1}: word does not match existing card "${existingWord.word}"`);
      continue;
    }

    const updatedWord = {
      ...existingWord,
      meaning: item.meaning.trim(),
      example: String(item.example || "").trim(),
      tags: normalizeTags(item.tags || []),
      source: item.source !== undefined ? String(item.source).trim() : existingWord.source,
      updatedAt: Date.now()
    };

    await putItem("words", updatedWord);
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

function renderExerciseTypePicker() {
  if (!exerciseTypeGrid) return;

  const types = getPromptEnabledExerciseTypes();

  exerciseTypeGrid.innerHTML = types.map(type => `
    <label class="exercise-type-option">
      <input type="checkbox" value="${escapeHTML(type)}" checked />
      <span>${escapeHTML(getExerciseTypeLabel(type))}</span>
    </label>
  `).join("");
}

function getSelectedPromptExerciseTypes() {
  if (!exerciseTypeGrid) return getPromptEnabledExerciseTypes();

  const selected = [...exerciseTypeGrid.querySelectorAll("input:checked")]
    .map(input => input.value)
    .filter(type => getExerciseTypeDefinition(type).promptEnabled);

  return selected.length ? selected : getPromptEnabledExerciseTypes();
}

function buildExerciseTypePromptSection(types) {
  const lines = [
    "Use only these exercise types:",
    ...types.map(type => `- ${type}`),
    "Mix the exercise types naturally.",
    "Do not generate choose_meaning or choose_word exercises. The app can create those automatically from the dictionary.",
    "If new exercise types are added later, use them only when they are explicitly listed in this prompt."
  ];

  if (types.includes("paraphrase_sentence")) {
    lines.push(
      "For paraphrase_sentence, the question must contain one fresh sentence with the target word.",
      "For paraphrase_sentence, ask the user to choose the best paraphrase.",
      "For paraphrase_sentence, the correct answer must paraphrase the whole sentence, not just define the word.",
      "For paraphrase_sentence, wrong answers must change the meaning in plausible ways.",
      "For paraphrase_sentence, do not reuse the card example.",
      "For paraphrase_sentence, do not reuse the same setting, nouns, objects, or sentence structure as the card example."
    );
  }

  if (types.includes("choose_best_context")) {
    lines.push(
      "For choose_best_context, ask the user to choose the situation where the target word fits best.",
      "For choose_best_context, the correct option should describe a realistic situation where the word naturally applies.",
      "For choose_best_context, wrong options should be plausible situations but clearly not match the word meaning.",
      "For choose_best_context, do not simply restate the definition.",
      "For choose_best_context, do not reuse the card example.",
      "For choose_best_context, do not reuse the same setting, nouns, objects, or sentence structure as the card example.",
      "For choose_best_context, options should be similar in length and detail."
    );
  }

  if (types.includes("choose_tone")) {
    lines.push(
      "For choose_tone, ask the user to choose the tone, register, feeling, or attitude the target word usually carries.",
      "For choose_tone, the correct answer should describe the word's usual tone or usage, not just its definition.",
      "For choose_tone, wrong answers should be plausible tone/register options but clearly wrong for the target word.",
      "For choose_tone, use labels like negative, positive, neutral, formal, informal, emotional, approving, disapproving, literary, humorous, or intense only when they fit.",
      "For choose_tone, do not force a strong tone if the word is neutral; the correct answer can say neutral or context-dependent.",
      "For choose_tone, options should be similar in length and detail.",
      "For choose_tone, do not reuse the card example."
    );
  }

  return lines.join("\n");
}

function buildExercisePromptExamples(types) {
  const examples = [];

  if (types.includes("choose_sentence")) {
    examples.push(`{
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
    }`);
  }

  if (types.includes("fill_blank")) {
    examples.push(`{
      "word": "target word or phrase",
      "type": "fill_blank",
      "question": "Choose the best word: Fresh sentence with ______.",
      "options": [
        "target word or phrase",
        "wrong option",
        "wrong option",
        "wrong option"
      ],
      "answer": "target word or phrase"
    }`);
  }

  if (types.includes("paraphrase_sentence")) {
    examples.push(`{
      "word": "target word or phrase",
      "type": "paraphrase_sentence",
      "question": "Choose the best paraphrase: Fresh sentence with the target word.",
      "options": [
        "correct paraphrase",
        "wrong paraphrase",
        "wrong paraphrase",
        "wrong paraphrase"
      ],
      "answer": "correct paraphrase"
    }`);
  }

  if (types.includes("choose_best_context")) {
    examples.push(`{
      "word": "target word or phrase",
      "type": "choose_best_context",
      "question": "Choose the situation where 'target word' fits best.",
      "options": [
        "correct situation",
        "wrong situation",
        "wrong situation",
        "wrong situation"
      ],
      "answer": "correct situation"
    }`);
  }

  if (types.includes("choose_tone")) {
    examples.push(`{
      "word": "target word or phrase",
      "type": "choose_tone",
      "question": "What tone or attitude does 'target word' usually have?",
      "options": [
        "correct tone or usage description",
        "wrong tone or usage description",
        "wrong tone or usage description",
        "wrong tone or usage description"
      ],
      "answer": "correct tone or usage description"
    }`);
  }

  return examples.join(",\n    ");
}

function buildExercisePrompt() {
  const sourceName = getPromptSourceName();
  const wordsText = getPromptInputText() || "PASTE_WORDS_OR_WORD_OBJECTS_HERE";
  const selectedTypes = getSelectedPromptExerciseTypes();

  return EXERCISE_PACK_PROMPT
    .replaceAll("SOURCE_NAME", sourceName)
    .replace("EXERCISE_TYPE_SECTION_HERE", buildExerciseTypePromptSection(selectedTypes))
    .replace("EXERCISE_EXAMPLES_HERE", buildExercisePromptExamples(selectedTypes))
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
  cachedExerciseHistoryByWordId = buildExerciseHistoryByWordId(exercises);
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

function isExerciseExactExampleReuse(exercise, word) {
  const example = word.example || "";
  if (!example.trim()) return false;

  const normalizedExample = normalizeExerciseText(example, word.word);
  const textsToCheck = [
    exercise.question,
    exercise.answer,
    ...(Array.isArray(exercise.options) ? exercise.options : [])
  ];

  return textsToCheck.some(text => {
    const normalizedText = normalizeExerciseText(text, word.word);
    return normalizedText && normalizedText === normalizedExample;
  });
}

function getExerciseAuditReason(exercise, word) {
  if (isExerciseExactExampleReuse(exercise, word)) return "exact";
  if (isExerciseTooSimilarToExample(exercise, word)) return "similar";
  return null;
}

function containsCyrillic(text) {
  return /[А-Яа-яЁё]/.test(String(text || ""));
}

function countWordsInText(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function normalizedMeaningForAudit(text) {
  return normalizeExerciseText(text)
    .replace(/\b(to|a|an|the|be|being|been)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLooseWordRoots(word) {
  const value = normalizeWord(word || "");
  const roots = new Set();

  if (!value) return roots;

  roots.add(value);

  if (value.endsWith("ed") && value.length > 4) {
    roots.add(value.slice(0, -1));
    roots.add(value.slice(0, -2));
  }

  if (value.endsWith("ing") && value.length > 5) {
    roots.add(value.slice(0, -3));
    roots.add(`${value.slice(0, -3)}e`);
  }

  if (value.endsWith("s") && value.length > 4) {
    roots.add(value.slice(0, -1));
  }

  return new Set([...roots].filter(root => root.length >= 4));
}

function meaningUsesTargetWord(word, meaning) {
  const normalizedWord = normalizeWord(word || "");
  const looseRoots = getLooseWordRoots(normalizedWord);
  const normalizedMeaning = normalizeExerciseText(meaning || "");

  if (!normalizedWord || !normalizedMeaning || !looseRoots.size) return false;

  const meaningWords = normalizedMeaning.split(" ").filter(Boolean);

  return meaningWords.some(item => {
    for (const root of looseRoots) {
      if (item === root) return true;
      if (item.startsWith(root)) return true;
    }

    return false;
  });
}

function createWordAuditIssue(type, label, description, severity = "warning") {
  return { type, label, description, severity };
}

function auditWordCard(word, duplicateMeaningGroup = []) {
  const issues = [];
  const meaning = String(word.meaning || "").trim();
  const example = String(word.example || "").trim();
  const tags = Array.isArray(word.tags) ? word.tags : [];
  const source = String(word.source || "").trim();
  const meaningWordCount = countWordsInText(meaning);
  const relatedDuplicateWords = duplicateMeaningGroup
    .filter(item => item.id !== word.id)
    .map(item => ({
      id: item.id,
      word: item.word,
      meaning: item.meaning,
      example: item.example || "",
      tags: item.tags || [],
      source: item.source || ""
    }));

  if (!meaning) {
    issues.push(createWordAuditIssue(
      "missing_meaning",
      "Missing meaning",
      "The card needs a short English-only learner-friendly meaning."
    ));
  } else {
    if (meaningWordCount > 24 || meaning.length > 180) {
      issues.push(createWordAuditIssue(
        "long_meaning",
        "Meaning may be too long",
        "The meaning should usually be short enough to review quickly."
      ));
    }

    if (meaningUsesTargetWord(word.word, meaning)) {
      issues.push(createWordAuditIssue(
        "target_in_meaning",
        "Meaning uses target word/root",
        "The meaning should explain the word without relying on the target word or its close root."
      ));
    }
  }

  if (!example) {
    issues.push(createWordAuditIssue(
      "missing_example",
      "Missing example",
      "A natural example sentence helps Review and future exercise generation."
    ));
  }

  if (!tags.length) {
    issues.push(createWordAuditIssue(
      "missing_tags",
      "Missing tags",
      "Tags help group words and choose better distractors."
    ));
  }

  if (!source) {
    issues.push(createWordAuditIssue(
      "missing_source",
      "Missing source",
      "Source helps keep vocabulary batches organized.",
      "info"
    ));
  }

  if (containsCyrillic(meaning) || containsCyrillic(example)) {
    issues.push(createWordAuditIssue(
      "cyrillic",
      "Contains Russian/Cyrillic text",
      "Cards should stay English-only."
    ));
  }

  if (relatedDuplicateWords.length) {
    issues.push({
      ...createWordAuditIssue(
        "duplicate_meaning",
        "Same meaning as another card",
        "These cards have identical or very similar meanings. They should be reviewed together so each meaning stays accurate but becomes easier to distinguish.",
        "info"
      ),
      relatedWords: relatedDuplicateWords
    });
  }

  return issues;
}

function renderWordAuditResult() {
  if (!wordAuditSummary || !wordAuditResult) return;

  if (!hasRunWordAudit) {
    wordAuditSummary.textContent = "Run audit to check word card quality.";
    wordAuditResult.innerHTML = "";
    updateWordAuditSelectionControls();
    return;
  }

  if (!latestWordAudit.length) {
    wordAuditSummary.textContent = "No word card issues found.";
    wordAuditResult.innerHTML = "";
    updateWordAuditSelectionControls();
    return;
  }

  const warningCount = latestWordAudit.reduce(
    (sum, item) => sum + item.issues.filter(issue => issue.severity === "warning").length,
    0
  );

  const infoCount = latestWordAudit.reduce(
    (sum, item) => sum + item.issues.filter(issue => issue.severity === "info").length,
    0
  );
  const groups = getGroupedWordAuditItems();
  wordAuditSummary.textContent = `${latestWordAudit.length} word cards flagged · ${warningCount} warnings · ${infoCount} notes · ${groups.length} groups.`;

  wordAuditResult.innerHTML = groups.map(group => {
    if (group.isDuplicateGroup) {
      const allIssues = group.items.flatMap(item => item.issues);
      const dedupedIssues = [];
      const seenIssueKeys = new Set();

      for (const issue of allIssues) {
        const key = `${issue.type}::${issue.severity}`;
        if (seenIssueKeys.has(key)) continue;
        seenIssueKeys.add(key);
        dedupedIssues.push(issue);
      }

      const issuePills = dedupedIssues
        .map(issue => `<span class="word-audit-pill ${issue.severity === "info" ? "info" : "warning"}" title="${escapeHTML(issue.description)}">${escapeHTML(issue.label)}</span>`)
        .join("");
      const groupChecked = group.items.every(item => selectedWordAuditIds.has(item.word.id));

      return `
        <article class="word-audit-item word-audit-group-item">
          <div>
            <div class="word-audit-item-header">
              <input type="checkbox" data-word-audit-group-select="true" value="${escapeHTML(group.key)}" ${groupChecked ? "checked" : ""} />
              <div>
                <h3>Duplicate meaning group</h3>
                <p>${group.items.length} cards share the same meaning. Review them together.</p>
              </div>
            </div>

            <div class="word-audit-issues">${issuePills}</div>

            <div class="word-audit-group-list">
              ${group.items.map(item => `
                <div class="word-audit-group-card">
                  <div class="word-audit-group-card-title">
                    <strong>${escapeHTML(item.word.word)}</strong>
                    <button class="small-btn" type="button" data-word-audit-open="${escapeHTML(item.word.id)}">Open</button>
                  </div>
                  <p>${escapeHTML(item.word.meaning || "No meaning")}</p>
                  ${item.word.example ? `<blockquote>${escapeHTML(item.word.example)}</blockquote>` : ""}
                </div>
              `).join("")}
            </div>
          </div>
        </article>
      `;
    }

    const item = group.items[0];
    const issuePills = item.issues
      .map(issue => `<span class="word-audit-pill ${issue.severity === "info" ? "info" : "warning"}" title="${escapeHTML(issue.description)}">${escapeHTML(issue.label)}</span>`)
      .join("");

    return `
      <article class="word-audit-item">
        <div>
          <div class="word-audit-item-header">
            <input
              type="checkbox"
              data-word-audit-select="true"
              value="${escapeHTML(item.word.id)}"
              ${selectedWordAuditIds.has(item.word.id) ? "checked" : ""}
            />
            <div>
              <h3>${escapeHTML(item.word.word)}</h3>
              <p>${escapeHTML(item.word.meaning || "No meaning")}</p>
            </div>
          </div>
          ${item.word.example ? `<blockquote>${escapeHTML(item.word.example)}</blockquote>` : ""}
          <div class="word-audit-issues">${issuePills}</div>
        </div>
        <button class="small-btn" type="button" data-word-audit-open="${escapeHTML(item.word.id)}">Open</button>
      </article>
    `;
  }).join("");

  updateWordAuditSelectionControls();
}

async function runWordAudit() {
  const words = await getAll("words");
  const meaningGroups = new Map();

  for (const word of words) {
    const normalizedMeaning = normalizedMeaningForAudit(word.meaning || "");
    if (!normalizedMeaning) continue;

    if (!meaningGroups.has(normalizedMeaning)) {
      meaningGroups.set(normalizedMeaning, []);
    }

    meaningGroups.get(normalizedMeaning).push(word);
  }

  latestWordAudit = words
    .map(word => {
      const normalizedMeaning = normalizedMeaningForAudit(word.meaning || "");
      const duplicateMeaningGroup = meaningGroups.get(normalizedMeaning) || [];
      const issues = auditWordCard(word, duplicateMeaningGroup);

      return {
        word,
        issues,
        fixPromptReady: true
      };
    })
    .filter(item => item.issues.length)
    .sort((a, b) => {
      const warningCountA = a.issues.filter(issue => issue.severity === "warning").length;
      const warningCountB = b.issues.filter(issue => issue.severity === "warning").length;

      return warningCountB - warningCountA ||
        b.issues.length - a.issues.length ||
        a.word.word.localeCompare(b.word.word);
    });

  selectedWordAuditIds.clear();
  hasRunWordAudit = true;
  renderWordAuditResult();
}

function getSelectedWordAuditItems() {
  return latestWordAudit.filter(item => selectedWordAuditIds.has(item.word.id));
}

function getWordAuditGroupKey(item) {
  const duplicateIssue = item.issues.find(issue => issue.type === "duplicate_meaning");

  if (!duplicateIssue?.relatedWords?.length) {
    return `single:${item.word.id}`;
  }

  return [item.word.id, ...duplicateIssue.relatedWords.map(word => word.id)]
    .sort()
    .join("::");
}

function getGroupedWordAuditItems() {
  const groups = new Map();

  for (const item of latestWordAudit) {
    const groupKey = getWordAuditGroupKey(item);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        items: [],
        isDuplicateGroup: !groupKey.startsWith("single:")
      });
    }

    groups.get(groupKey).items.push(item);
  }

  return [...groups.values()];
}

function updateWordAuditSelectionControls() {
  const selectedCount = selectedWordAuditIds.size;
  if (copyWordAuditFixPromptBtn) {
    copyWordAuditFixPromptBtn.disabled = selectedCount === 0;
    copyWordAuditFixPromptBtn.textContent = selectedCount
      ? `Copy GPT fix prompt (${selectedCount})`
      : "Copy GPT fix prompt";
  }

  if (clearWordAuditSelectionBtn) {
    clearWordAuditSelectionBtn.disabled = selectedCount === 0;
  }
}

function getCleanWordCardForPrompt(word) {
  return {
    id: word.id,
    word: word.word,
    meaning: word.meaning || "",
    example: word.example || "",
    tags: word.tags || [],
    source: word.source || ""
  };
}

function buildWordAuditFixPrompt(items) {
  const selectedIds = new Set(items.map(item => item.word.id));
  const groupedItems = getGroupedWordAuditItems();
  const selectedGroups = groupedItems
    .map(group => ({
      ...group,
      items: group.items.filter(item => selectedIds.has(item.word.id))
    }))
    .filter(group => group.items.length);

  const duplicateGroups = [];
  const singleCards = [];

  for (const group of selectedGroups) {
    if (group.isDuplicateGroup) {
      const allGroupItems = groupedItems.find(item => item.key === group.key)?.items || group.items;

      duplicateGroups.push({
        issue: "duplicate_meaning",
        instruction: "These cards currently have identical or very similar meanings. Rewrite each card so the meanings are accurate but easier to distinguish from each other.",
        cards: allGroupItems.map(item => ({
          ...getCleanWordCardForPrompt(item.word),
          issues: item.issues.map(issue => ({
            type: issue.type,
            label: issue.label,
            description: issue.description,
            severity: issue.severity
          }))
        }))
      });
    } else {
      const item = group.items[0];

      singleCards.push({
        ...getCleanWordCardForPrompt(item.word),
        issues: item.issues.map(issue => ({
          type: issue.type,
          label: issue.label,
          description: issue.description,
          severity: issue.severity
        }))
      });
    }
  }

  const payload = {
    singleCards,
    duplicateGroups
  };

  return `Fix these English SRS word cards.

Return ONLY valid JSON.
No markdown.
No comments.
No explanations.
Everything must be in English.
Do not translate anything into Russian.
Use Oxford Learner's Dictionary / Cambridge Dictionary style as a reference.
Do not copy dictionary definitions word-for-word.
Write meanings in your own words.
Keep meanings short: usually 8-18 words.
Use simple, learner-friendly English.

General rules:
- Keep the original id.
- Keep the original word.
- Do not merge cards.
- Do not delete cards.
- Return one corrected card for every input card.
- The output words array must contain exactly one item for every input card id.
- Do not omit any id.
- Do not add new ids.
- Do not use the target word or its close root inside the meaning unless absolutely necessary.
- Examples should be natural, useful, and different from the most obvious default example.
- Do not copy dictionary examples.
- Keep the original source exactly as provided.
- Tags should be short and useful.
- Keep existing tags unless they are missing, clearly wrong, or not useful.

For duplicateGroups:
- Treat each group together.
- The cards have identical or very similar meanings now.
- Rewrite the meanings so each card stays accurate but becomes easier to distinguish.
- Add a subtle distinction in meaning, usage, tone, or context.
- Do not invent a difference if the words are true synonyms; instead make the meanings close but not identical.
- Avoid long definitions with several clauses.
- Prefer one clear learner-friendly meaning.
- If words are genuine near-synonyms, keep meanings close but not identical.
- Make them suitable for choose_meaning / choose_word practice.

Return corrected cards in this JSON shape:

{
  "app": "english-srs",
  "type": "wordFixes",
  "version": 1,
  "words": [
    {
      "id": "existing word id",
      "word": "same word",
      "meaning": "improved learner-friendly meaning",
      "example": "fresh natural example sentence",
      "tags": ["tag1", "tag2"],
      "source": "same source"
    }
  ]
}

Cards to fix:
${JSON.stringify(payload, null, 2)}`;
}

function getExampleOverlapWords(exampleText, exerciseText, targetWord = "") {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "at", "for", "from",
    "with", "by", "as", "is", "was", "were", "be", "been", "being", "it", "this", "that",
    "these", "those", "he", "she", "they", "we", "you", "i", "his", "her", "their", "our", "my"
  ]);
  const exampleWords = normalizeExerciseText(exampleText, targetWord).split(" ").filter(Boolean);
  const exerciseWords = normalizeExerciseText(exerciseText, targetWord).split(" ").filter(Boolean);
  const exerciseSet = new Set(exerciseWords);

  return new Set(
    exampleWords.filter(word => word.length > 2 && !stopWords.has(word) && exerciseSet.has(word))
  );
}

function highlightAuditOverlap(text, overlapWords) {
  const escapedText = escapeHTML(text || "");

  if (!overlapWords || !overlapWords.size) {
    return escapedText;
  }

  return escapedText.replace(/[\p{L}\p{N}]+/gu, token => {
    if (overlapWords.has(token.toLowerCase())) {
      return `<mark class="audit-highlight">${token}</mark>`;
    }

    return token;
  });
}

function renderAuditItem(item) {
  const comparisonText = item.exercise.type === "choose_sentence"
    ? item.exercise.answer
    : item.exercise.question;
  const comparisonLabel = item.exercise.type === "choose_sentence"
    ? "Correct answer"
    : "Exercise question";
  const overlapWords = getExampleOverlapWords(
    item.word.example || "",
    comparisonText || "",
    item.word.word
  );
  const reasonClass = item.reason === "exact" ? "audit-pill-danger" : "";
  const reasonLabel = item.reason === "exact"
    ? "Exact card example reuse"
    : "Similar to card example";
  const answerLabel = `Answer: ${item.exercise.answer || ""}`;

  return `
    <article class="audit-item">
      <div class="audit-item-header">
        <input type="checkbox" data-audit-select="true" value="${escapeHTML(item.exercise.id)}" ${selectedAuditExerciseIds.has(item.exercise.id) ? "checked" : ""} />
        <div class="audit-item-title">
          <strong>${escapeHTML(item.word.word)}</strong>
          <span>${escapeHTML(getExerciseTypeLabel(item.exercise.type))}</span>
        </div>
      </div>

      <div class="audit-compare-grid">
        <div class="audit-field audit-field-example">
          <span class="audit-label">Card example</span>
          <p>${highlightAuditOverlap(item.word.example || "", overlapWords)}</p>
        </div>

        <div class="audit-field audit-field-question">
          <span class="audit-label">${comparisonLabel}</span>
          <p>${highlightAuditOverlap(comparisonText, overlapWords)}</p>
        </div>
      </div>

      <div class="audit-meta-row">
        <span class="audit-pill">${escapeHTML(answerLabel)}</span>
        <span class="audit-pill ${reasonClass}">${escapeHTML(reasonLabel)}</span>
      </div>
    </article>
  `;
}

function renderExerciseAuditResult() {
  if (!exerciseAuditResult) return;

  const exactMatches = latestExerciseAudit.exactMatches;
  const similarMatches = latestExerciseAudit.similarMatches;
  const visibleItems = similarMatches.slice(0, exerciseAuditVisibleCount).map(item => ({
    ...item,
    reason: "similar"
  }));
  const totalSimilar = similarMatches.length;
  const totalSuspicious = exactMatches.length + similarMatches.length;
  const canShowMore = exerciseAuditVisibleCount < totalSimilar;

  if (exactAuditSummaryText) {
    exactAuditSummaryText.textContent = exactMatches.length
      ? `${exactMatches.length} exercises directly reuse card examples.`
      : "No exact matches found.";
  }

  if (similarAuditSummaryText) {
    similarAuditSummaryText.textContent = totalSimilar
      ? `${totalSimilar} exercises look similar to card examples. Showing 1-${visibleItems.length} of ${totalSimilar}.`
      : totalSuspicious
        ? "No similar matches found."
        : "No suspicious exercises found.";
  }

  if (deleteExactExerciseMatchesBtn) {
    deleteExactExerciseMatchesBtn.hidden = !exactMatches.length;
    deleteExactExerciseMatchesBtn.disabled = !exactMatches.length;
  }
  if (selectShownAuditBtn) selectShownAuditBtn.disabled = !visibleItems.length;
  if (clearAuditSelectionBtn) clearAuditSelectionBtn.disabled = !selectedAuditExerciseIds.size;
  if (deleteSelectedAuditBtn) deleteSelectedAuditBtn.disabled = !selectedAuditExerciseIds.size;
  if (showMoreAuditBtn) {
    showMoreAuditBtn.hidden = !canShowMore;
    showMoreAuditBtn.disabled = !canShowMore;
  }

  if (!hasRunExerciseAudit || !totalSuspicious) {
    exerciseAuditResult.innerHTML = "";
    return;
  }

  exerciseAuditResult.innerHTML = visibleItems.map(renderAuditItem).join("");
}

function selectShownAuditExercises() {
  for (const item of latestExerciseAudit.similarMatches.slice(0, exerciseAuditVisibleCount)) {
    selectedAuditExerciseIds.add(item.exercise.id);
  }
  renderExerciseAuditResult();
}

function clearAuditSelection() {
  selectedAuditExerciseIds.clear();
  renderExerciseAuditResult();
}

async function deleteSelectedAuditExercises() {
  if (!selectedAuditExerciseIds.size) {
    alert("Select exercises first.");
    return;
  }

  const confirmed = confirm(`Delete ${selectedAuditExerciseIds.size} selected exercises?`);
  if (!confirmed) return;
  const deletedCount = selectedAuditExerciseIds.size;

  for (const exerciseId of selectedAuditExerciseIds) {
    await deleteItem("exercises", exerciseId);
  }

  selectedAuditExerciseIds.clear();
  await logActivity("audit_delete", { value: String(deletedCount) });
  await renderPracticePacks();
  await renderExerciseCoverage();
  await runExerciseAudit();
}

async function runExerciseAudit() {
  const words = await getAll("words");
  const exercises = await getAll("exercises");
  const wordsById = new Map(words.map(word => [word.id, word]));
  const exactMatches = [];
  const similarMatches = [];

  for (const exercise of exercises) {
    const word = wordsById.get(exercise.wordId);
    if (!word || !word.example) continue;

    const reason = getExerciseAuditReason(exercise, word);
    if (reason === "exact") exactMatches.push({ exercise, word });
    if (reason === "similar") similarMatches.push({ exercise, word });
  }

  latestExerciseAudit = { exactMatches, similarMatches };
  exerciseAuditVisibleCount = 10;
  selectedAuditExerciseIds.clear();
  hasRunExerciseAudit = true;
  renderExerciseAuditResult();
}

async function deleteExactExerciseMatches() {
  if (!latestExerciseAudit.exactMatches.length) return;

  const confirmed = confirm(
    `Delete ${latestExerciseAudit.exactMatches.length} exact example-match exercises? Similar matches will not be deleted.`
  );
  if (!confirmed) return;
  const deletedCount = latestExerciseAudit.exactMatches.length;

  for (const item of latestExerciseAudit.exactMatches) {
    await deleteItem("exercises", item.exercise.id);
  }

  selectedAuditExerciseIds.clear();
  await logActivity("audit_delete_exact", { value: String(deletedCount) });
  await renderPracticePacks();
  await renderExerciseCoverage();
  await runExerciseAudit();
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
  const batchWords = coverage.missingWords
    .slice(0, batchSize)
    .map(buildPromptWordObject);
  const sourceName = promptSourceInput.value.trim() || "Missing Exercises";
  const selectedTypes = getSelectedPromptExerciseTypes();
  const prompt = EXERCISE_PACK_PROMPT
    .replaceAll("SOURCE_NAME", sourceName)
    .replace("EXERCISE_TYPE_SECTION_HERE", buildExerciseTypePromptSection(selectedTypes))
    .replace("EXERCISE_EXAMPLES_HERE", buildExercisePromptExamples(selectedTypes))
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
  const wordFixes = getWordFixesFromImportJSON(data);

  if (wordFixes) {
    const result = await importWordFixesFromJSON(data);
    result.typeLabel = "Word fixes JSON";

    showImportResult(result, { inline: true });

    await refreshHomeStats();
    await renderHomeProgress();
    await renderWordsList();
    await renderHomeWeakWordsSummary();
    await renderFocusedPracticeSourceFilter();
    await renderFocusedPracticeTagFilter();
    await renderFocusedPracticePreview();

    if (hasRunWordAudit) {
      await runWordAudit();
    }

    await logActivity("import_word_fixes", { value: String(result.imported) });

    return true;
  }

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
  await renderHomeProgress();
  await renderFocusedPracticeSourceFilter();
  await renderFocusedPracticeTagFilter();
  await renderFocusedPracticePreview();

  if (type === "words") {
    await logActivity("import_words", { value: String(result.imported) });
  }

  if (type === "exercisePack") {
    await logActivity("import_exercises", { value: String(result.imported) });
  }

  if (type === "backup") {
    await logActivity("import_backup", { value: String(result.imported) });
  }

  return true;
}

function showClipboardImportDebug(error) {
  if (!inlineImportResultEl) return;

  const details = {
    secureContext: String(window.isSecureContext),
    hasClipboard: String(Boolean(navigator.clipboard)),
    hasReadText: String(Boolean(navigator.clipboard?.readText)),
    protocol: location.protocol,
    host: location.host,
    errorName: error?.name || "UnknownError",
    errorMessage: error?.message || String(error)
  };

  inlineImportResultEl.hidden = false;
  inlineImportResultEl.innerHTML = `
    <strong>Clipboard import failed</strong>
    <span>Paste JSON manually into the field and press Import JSON.</span>
    <ul>
      <li>Secure context: ${escapeHTML(details.secureContext)}</li>
      <li>Clipboard API: ${escapeHTML(details.hasClipboard)}</li>
      <li>readText support: ${escapeHTML(details.hasReadText)}</li>
      <li>Protocol: ${escapeHTML(details.protocol)}</li>
      <li>Host: ${escapeHTML(details.host)}</li>
      <li>Error: ${escapeHTML(details.errorName)}</li>
      <li>Message: ${escapeHTML(details.errorMessage)}</li>
    </ul>
  `;
}

async function importJSONFromClipboard(button, fallbackInput = null) {
  const originalText = button?.dataset.originalText || button?.textContent || "Paste & import";

  try {
    if (!window.isSecureContext || !navigator.clipboard?.readText) {
      throw new Error("Clipboard read is not available in this browser context.");
    }

    if (button) {
      button.dataset.originalText = originalText;
      button.textContent = "Reading clipboard...";
      button.disabled = true;
    }

    const text = await navigator.clipboard.readText();

    if (!text.trim()) {
      alert("Clipboard is empty.");
      return;
    }

    if (fallbackInput) {
      fallbackInput.value = text;
    }

    const data = parseJSONText(text);
    const imported = await importJSONData(data);

    if (imported && button) {
      button.textContent = "Imported!";
      window.setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 1400);
      return;
    }
  } catch (error) {
    console.log("Clipboard import failed:", error);

    if (fallbackInput?.value.trim()) {
      try {
        const data = parseJSONText(fallbackInput.value);
        const imported = await importJSONData(data);

        if (imported && button) {
          button.textContent = "Imported from field!";
          window.setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
          }, 1400);
          return;
        }
      } catch (fallbackError) {
        console.log("Manual field fallback import failed:", fallbackError);
      }
    }

    showClipboardImportDebug(error);
    alert("Could not read clipboard. Debug info is shown below the import field.");
  } finally {
    if (button && button.textContent !== "Imported!" && button.textContent !== "Imported from field!") {
      button.textContent = originalText;
      button.disabled = false;
    }
  }
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
    practiceAttempts: await getAll("practiceAttempts"),
    reviewAttempts: await safeGetAll("reviewAttempts"),
    activityLog: await safeGetAll("activityLog")
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
  await logActivity("backup_export");
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
  const selectedTypes = getSelectedPromptExerciseTypes();
  const weakWords = cachedWeakWords
    .slice(0, batchSize)
    .map(word => ({
      ...buildPromptWordObject(word),
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
${buildExerciseTypePromptSection(selectedTypes)}
Do not reuse old example sentences.
Do not reuse old answer options.
The cardExample/example field is forbidden exercise text.
Use it only to understand the word.
Never copy it.
Never turn it into an exercise question.
Never closely paraphrase it.
Do not reuse existingQuestions, existingAnswers, or existingOptions.
Use fresh contexts and sentence structures.
Avoid the most obvious default context when possible.
Use fresh contexts.
All answer options should be similar in length and detail.
Do not make the correct answer noticeably longer or more specific than the distractors.
Distractors should look equally plausible in length, grammar, and style.
Avoid obvious patterns where the correct answer is the longest option.
For every exercise, options should have similar length and complexity.
Wrong options should be clearly wrong by meaning, not because they look shorter, sillier, or unfinished.
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
    ${buildExercisePromptExamples(selectedTypes)}
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
  const reviewAttemptsResult = await mergeItemsById("reviewAttempts", data.reviewAttempts || []);
  const activityLogResult = await mergeItemsById("activityLog", data.activityLog || []);

  result.imported =
    wordsResult.imported +
    packsResult.imported +
    exercisesResult.imported +
    attemptsResult.imported +
    reviewAttemptsResult.imported +
    activityLogResult.imported;

  result.skippedDuplicates =
    wordsResult.skippedDuplicates +
    packsResult.skippedDuplicates +
    exercisesResult.skippedDuplicates +
    attemptsResult.skippedDuplicates +
    reviewAttemptsResult.skippedDuplicates +
    activityLogResult.skippedDuplicates;

  return result;
}

async function refreshApp() {
  const confirmed = confirm("Refresh the app and check for updates? Your words and progress will stay on this device.");
  if (!confirmed) return;

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        await registration.update();
      }
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name => name.startsWith("english-srs"))
          .map(name => caches.delete(name))
      );
    }
  } catch (error) {
    console.log("App refresh failed:", error);
  }

  window.location.reload();
}

async function clearAllData() {
  const firstConfirm = confirm("Clear all local data? This will delete all words, packs, exercises, and practice history.");
  if (!firstConfirm) return;

  const secondConfirm = confirm("Are you sure? This cannot be undone unless you have a backup JSON file.");
  if (!secondConfirm) return;

  await clearStore("practiceAttempts");
  await clearStore("reviewAttempts");
  await clearStore("activityLog");
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
  await renderHomeProgress().catch(error => {
    console.log("Home progress render failed:", error);
  });
  await renderFocusedPracticeSourceFilter();
  await renderFocusedPracticeTagFilter();
  await renderFocusedPracticePreview();

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
  if (appVersionTextEl) {
    appVersionTextEl.textContent = `English SRS v${APP_VERSION}\nCache: ${CACHE_VERSION_LABEL}`;
  }

  await openDB();
  const savedNewWordsPerDay = await getSetting("newWordsPerDay", DEFAULT_NEW_WORDS_PER_DAY);
  const savedDailyGoal = await getSetting("dailyGoal", DEFAULT_DAILY_GOAL);
  if (newWordsPerDaySelect) {
    newWordsPerDaySelect.value = String(savedNewWordsPerDay);
  }
  if (dailyGoalSelect) {
    dailyGoalSelect.value = String(savedDailyGoal);
  }
  await refreshHomeStats();
  await renderHomeProgress();
  await renderHomeWeakWordsSummary();
  await renderWordsList();
  await renderPracticePacks();
  await renderWeakWords();
  await renderExerciseCoverage();
  renderInstallTip();
  renderExerciseAuditResult();
  renderWordAuditResult();
  renderExerciseTypePicker();
  renderFocusedPracticeTypePicker();
  await renderFocusedPracticeSourceFilter();
  await renderFocusedPracticeTagFilter();
  await renderFocusedPracticePreview();

  addWordBtn.addEventListener("click", openNewWordForm);
  wordForm.addEventListener("submit", handleWordFormSubmit);
  deleteWordBtn.addEventListener("click", handleDeleteWord);
  cancelWordBtn.addEventListener("click", () => {
    resetWordForm();
    showScreen(wordFormReturnScreen || "wordsScreen");
  });
  wordSearchInput.addEventListener("input", renderWordsList);
  document.querySelector("#wordsScreen").addEventListener("click", event => {
    const card = event.target.closest(".word-card");
    if (!card) return;

    openEditWordForm(card.dataset.wordId, "wordsScreen");
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
  practicePackList?.addEventListener("change", event => {
    if (event.target.closest('[data-pack-select="true"]')) {
      renderFocusedPracticePreview();
    }
  });

  practiceOptionsEl.addEventListener("click", event => {
    const button = event.target.closest(".practice-option-btn");
    if (!button) return;

    handlePracticeAnswer(button.dataset.option);
  });

  startSmartPracticeBtn.addEventListener("click", startSmartPractice);
  startFocusedPracticeBtn?.addEventListener("click", startFocusedPractice);
  startWeakPracticeBtn.addEventListener("click", startWeakPractice);
  focusedPracticeTypeGrid?.addEventListener("click", event => {
    const chip = event.target.closest("[data-focused-type]");
    if (!chip) return;

    chip.classList.toggle("active");
    chip.setAttribute("aria-pressed", chip.classList.contains("active") ? "true" : "false");
    renderFocusedPracticePreview();
  });
  focusedPracticeSourceSelect?.addEventListener("change", renderFocusedPracticePreview);
  focusedPracticeTagGrid?.addEventListener("click", event => {
    const chip = event.target.closest("[data-focused-tag]");
    if (!chip) return;

    chip.classList.toggle("active");
    chip.setAttribute("aria-pressed", chip.classList.contains("active") ? "true" : "false");
    renderFocusedPracticePreview();
  });
  focusedPracticeLimitSelect?.addEventListener("change", renderFocusedPracticePreview);
  toggleFocusedTagsBtn?.addEventListener("click", () => {
    if (!focusedPracticeTagGrid) return;

    focusedPracticeTagGrid.hidden = !focusedPracticeTagGrid.hidden;
    toggleFocusedTagsBtn.textContent = focusedPracticeTagGrid.hidden ? "Show tags" : "Hide tags";
  });
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
  pasteImportJsonBtn?.addEventListener("click", () => {
    importJSONFromClipboard(pasteImportJsonBtn, pasteJsonInput);
  });
  importJsonBtn.addEventListener("click", importGenericJSON);
  openExerciseAuditBtn?.addEventListener("click", () => {
    showScreen("exerciseAuditScreen");
  });
  openWordAuditBtn?.addEventListener("click", () => {
    showScreen("wordAuditScreen");
  });
  backFromExerciseAuditBtn?.addEventListener("click", () => {
    showScreen(utilityReturnScreen || "moreScreen");
  });
  backFromWordAuditBtn?.addEventListener("click", () => {
    showScreen(utilityReturnScreen || "moreScreen");
  });
  topHelpBtn?.addEventListener("click", () => {
    showScreen("helpScreen");
  });
  letsGetStartedBtn?.addEventListener("click", () => {
    showScreen("helpScreen");
  });
  dismissInstallTipBtn?.addEventListener("click", () => {
    localStorage.setItem("englishSrsInstallTipDismissed", "true");
    renderInstallTip();
  });
  backFromHelpBtn?.addEventListener("click", () => {
    showScreen(utilityReturnScreen || "moreScreen");
  });
  newWordsPerDaySelect?.addEventListener("change", () => {
    setSetting(
      "newWordsPerDay",
      Number(newWordsPerDaySelect.value) || DEFAULT_NEW_WORDS_PER_DAY
    );
  });
  rescheduleNewWordsBtn?.addEventListener("click", rescheduleUnreviewedWords);
  dailyGoalSelect?.addEventListener("change", () => {
    setSetting(
      "dailyGoal",
      Number(dailyGoalSelect.value) || DEFAULT_DAILY_GOAL
    );
    renderHomeProgress();
  });
  refreshAppBtn?.addEventListener("click", refreshApp);
  clearAllDataBtn?.addEventListener("click", clearAllData);
  exportBackupBtn?.addEventListener("click", exportBackup);
  exportWeakWordsPromptBtn.addEventListener("click", exportWeakWordsPrompt);
  runExerciseAuditBtn?.addEventListener("click", runExerciseAudit);
  runWordAuditBtn?.addEventListener("click", runWordAudit);
  pasteImportWordAuditBtn?.addEventListener("click", () => {
    importJSONFromClipboard(pasteImportWordAuditBtn, pasteJsonInput);
  });
  selectWordAuditWarningsBtn?.addEventListener("click", () => {
    latestWordAudit
      .filter(item => item.issues.some(issue => issue.severity === "warning"))
      .forEach(item => selectedWordAuditIds.add(item.word.id));

    renderWordAuditResult();
  });
  selectWordAuditNotesBtn?.addEventListener("click", () => {
    latestWordAudit
      .filter(item => item.issues.some(issue => issue.severity === "info"))
      .forEach(item => selectedWordAuditIds.add(item.word.id));

    renderWordAuditResult();
  });
  clearWordAuditSelectionBtn?.addEventListener("click", () => {
    selectedWordAuditIds.clear();
    renderWordAuditResult();
  });
  copyWordAuditFixPromptBtn?.addEventListener("click", () => {
    const selectedItems = getSelectedWordAuditItems();

    if (!selectedItems.length) {
      alert("Select word cards first.");
      return;
    }

    copyPromptToClipboard(buildWordAuditFixPrompt(selectedItems), copyWordAuditFixPromptBtn);
  });
  deleteExactExerciseMatchesBtn?.addEventListener("click", deleteExactExerciseMatches);
  deleteSelectedAuditBtn?.addEventListener("click", deleteSelectedAuditExercises);
  showMoreAuditBtn?.addEventListener("click", () => {
    exerciseAuditVisibleCount += 10;
    renderExerciseAuditResult();
  });
  selectShownAuditBtn?.addEventListener("click", selectShownAuditExercises);
  clearAuditSelectionBtn?.addEventListener("click", clearAuditSelection);
  exerciseAuditResult?.addEventListener("change", event => {
    const checkbox = event.target.closest('[data-audit-select="true"]');
    if (!checkbox) return;

    if (checkbox.checked) {
      selectedAuditExerciseIds.add(checkbox.value);
    } else {
      selectedAuditExerciseIds.delete(checkbox.value);
    }
  });
  wordAuditResult?.addEventListener("change", event => {
    const groupCheckbox = event.target.closest("[data-word-audit-group-select]");

    if (groupCheckbox) {
      const group = getGroupedWordAuditItems().find(item => item.key === groupCheckbox.value);
      if (!group) return;

      for (const item of group.items) {
        if (groupCheckbox.checked) {
          selectedWordAuditIds.add(item.word.id);
        } else {
          selectedWordAuditIds.delete(item.word.id);
        }
      }

      renderWordAuditResult();
      return;
    }

    const checkbox = event.target.closest("[data-word-audit-select]");
    if (!checkbox) return;

    if (checkbox.checked) {
      selectedWordAuditIds.add(checkbox.value);
    } else {
      selectedWordAuditIds.delete(checkbox.value);
    }

    renderWordAuditResult();
  });
  wordAuditResult?.addEventListener("click", event => {
    const button = event.target.closest("[data-word-audit-open]");
    if (!button) return;
    openEditWordForm(button.dataset.wordAuditOpen, "wordAuditScreen");
  });

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
