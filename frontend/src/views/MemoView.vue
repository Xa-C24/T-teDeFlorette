<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { deleteMemo, getMemoByDate, saveMemo } from "../services/api";
import { currentTheme } from "../theme";
import { formatDisplayDate } from "../utils/date";
import {
  hasMemoTasks,
  hasMemoText,
  MEMO_V2_PREFIX,
  parseStoredMemoContent,
} from "../utils/memo";
const IMPORTANCE_OPTIONS = [
  { value: "+", label: "+" },
  { value: "++", label: "++" },
];

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
});

const route = useRoute();
const router = useRouter();
const freeformNotes = ref("");
const tasks = ref([]);
const newTaskLabel = ref("");
const newTaskImportance = ref("+");
const loading = ref(true);
const saving = ref(false);
const saveMessage = ref("");
const errorMessage = ref("");
const isMemoOpen = ref(false);
const memoTextareaRef = ref(null);
const taskInputRef = ref(null);
let autoSaveDebounceTimer = null;
let saveFeedbackTimer = null;

const displayDate = computed(() => {
  const label = formatDisplayDate(props.date);
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const placeholderText = computed(() => currentTheme.value.placeholderLines.join("\n"));

const hasMemoContent = computed(
  () => hasMemoText(freeformNotes.value) || hasMemoTasks(tasks.value)
);

const memoTasks = computed(() =>
  tasks.value
    .map((task) => {
      const normalizedTask = normalizeTask(task);
      task.id = normalizedTask.id;
      task.importance = normalizedTask.importance;
      task.done = normalizedTask.done;
      task.label = normalizedTask.label;

      return {
        source: task,
        id: task.id,
        label: task.label.trim(),
        importance: task.importance,
        done: task.done,
      };
    })
    .filter((task) => task.label)
);

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTask(task) {
  const importance = IMPORTANCE_OPTIONS.some((option) => option.value === task.importance)
    ? task.importance
    : "+";

  return {
    id: typeof task.id === "string" && task.id ? task.id : createTaskId(),
    label: typeof task.label === "string" ? task.label : "",
    importance,
    done: Boolean(task.done),
  };
}

function serializeMemoContent() {
  const notes = freeformNotes.value.replace(/\r\n/g, "\n");
  const normalizedTasks = tasks.value
    .map(normalizeTask)
    .map((task) => ({
      ...task,
      label: task.label.trim(),
    }))
    .filter((task) => task.label);

  if (normalizedTasks.length === 0) {
    return notes;
  }

  return `${MEMO_V2_PREFIX}${JSON.stringify({
    notes,
    tasks: normalizedTasks,
  })}`;
}

async function loadMemo() {
  loading.value = true;
  errorMessage.value = "";
  saveMessage.value = "";

  try {
    const response = await getMemoByDate(props.date);
    const parsedMemo = parseStoredMemoContent(response.item?.content || "");
    freeformNotes.value = parsedMemo.notes;
    tasks.value = parsedMemo.tasks.map(normalizeTask);
    newTaskLabel.value = "";
    newTaskImportance.value = "+";
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

async function syncOpenStateFromRoute() {
  const shouldOpen = route.query.open === "1";
  const shouldFocus = route.query.focus === "1";

  if (!shouldOpen) {
    return;
  }

  isMemoOpen.value = true;
  await nextTick();

  if (shouldFocus && memoTextareaRef.value) {
    memoTextareaRef.value.focus();
    const length = memoTextareaRef.value.value.length;
    memoTextareaRef.value.setSelectionRange(length, length);
    memoTextareaRef.value.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

async function persistMemo(options = {}) {
  const { returnToCalendar = false } = options;

  if (saving.value) {
    return;
  }

  saving.value = true;
  errorMessage.value = "";

  try {
    if (!hasMemoContent.value) {
      await deleteMemo(props.date);
    } else {
      await saveMemo({
        memoDate: props.date,
        content: serializeMemoContent(),
      });
    }

    saveMessage.value = "Memo enregistré avec succes Florette !";

    if (returnToCalendar) {
      await router.push({
        name: "calendar",
        query: {
          focusDate: props.date,
          open: "1",
          stamp: Date.now().toString(),
        },
      });
      return;
    }

    window.clearTimeout(saveFeedbackTimer);
    saveFeedbackTimer = window.setTimeout(() => {
      saveMessage.value = "";
    }, 2200);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    saving.value = false;
  }
}

function queueAutoSave() {
  if (loading.value) {
    return;
  }

  if (autoSaveDebounceTimer) {
    window.clearTimeout(autoSaveDebounceTimer);
  }

  autoSaveDebounceTimer = window.setTimeout(() => {
    persistMemo();
  }, 900);
}

function addTask() {
  const label = newTaskLabel.value.trim();

  if (!label) {
    taskInputRef.value?.focus();
    return;
  }

  tasks.value = [
    ...tasks.value,
    {
      id: createTaskId(),
      label,
      importance: newTaskImportance.value,
      done: false,
    },
  ];
  newTaskLabel.value = "";
  newTaskImportance.value = "+";
  nextTick(() => {
    taskInputRef.value?.focus();
  });
}

function getImportanceBadgeClass(importance) {
  if (importance === "++") {
    return "task-card__badge--plusplus";
  }

  if (importance === "+") {
    return "task-card__badge--plus";
  }

  return "task-card__badge--normal";
}

function getVisibleImportanceLabel(importance) {
  return importance;
}

function toggleTask(task) {
  task.done = !task.done;
}

function removeTask(taskId) {
  tasks.value = tasks.value.filter((task) => task.id !== taskId);
}

function goBack() {
  router.push({
    name: "calendar",
    query: {
      focusDate: props.date,
      open: "1",
      stamp: Date.now().toString(),
    },
  });
}

watch(() => props.date, loadMemo);
watch([freeformNotes, tasks], queueAutoSave, { deep: true });
watch(
  () => [route.query.open, route.query.focus, props.date, loading.value],
  () => {
    if (!loading.value) {
      syncOpenStateFromRoute();
    }
  },
  { immediate: true }
);

onMounted(loadMemo);

onBeforeUnmount(() => {
  window.clearTimeout(autoSaveDebounceTimer);
  window.clearTimeout(saveFeedbackTimer);
});
</script>

<template>
  <section class="panel panel--memo">
    <div class="memo-card">
      <div class="memo-card__header">
        <button
          class="collapsible-toggle collapsible-toggle--card"
          type="button"
          :aria-expanded="isMemoOpen ? 'true' : 'false'"
          @click="isMemoOpen = !isMemoOpen"
        >
          <span class="collapsible-toggle__text">
            <span class="eyebrow">{{ currentTheme.eyebrow }}</span>
            <strong>{{ displayDate }}</strong>
          </span>
          <span
            class="collapsible-toggle__icon"
            :class="{ 'collapsible-toggle__icon--open': isMemoOpen }"
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        <button class="ghost-link" type="button" @click="goBack">
          ← Retour au calendrier
        </button>
      </div>

      <div v-if="isMemoOpen" class="collapsible-body">
        <p class="hero-note">{{ currentTheme.heroNote }}</p>
        <p v-if="loading" class="status">Chargement du memo...</p>
        <template v-else>
          <p class="hint">
            {{ currentTheme.memoHint }}
          </p>

          <div class="memo-section">
            <div class="memo-section__head">
              <strong>Notes libres</strong>
              
            </div>

            <div class="memo-editor">
              <div v-if="memoTasks.length" class="memo-editor__tasks">
                <article
                  v-for="task in memoTasks"
                  :key="task.id"
                  class="memo-inline-task"
                  :class="{ 'memo-inline-task--done': task.done }"
                  @click="toggleTask(task.source)"
                >
                  <span class="memo-inline-task__toggle">
                    <input
                      :checked="task.done"
                      type="checkbox"
                      @click.stop
                      @change="toggleTask(task.source)"
                    />
                  </span>
                  <span class="memo-inline-task__label">{{ task.label }}</span>
                  <span
                    v-if="getVisibleImportanceLabel(task.importance)"
                    class="memo-inline-task__importance"
                    :class="getImportanceBadgeClass(task.importance)"
                  >
                    {{ getVisibleImportanceLabel(task.importance) }}
                  </span>
                  <button
                    class="memo-inline-task__delete"
                    type="button"
                    aria-label="Supprimer la tache"
                    @click.stop="removeTask(task.id)"
                  >
                    🗑
                  </button>
                </article>
              </div>

              <textarea
                ref="memoTextareaRef"
                v-model="freeformNotes"
                class="memo-textarea memo-textarea--inline"
                :placeholder="placeholderText"
                rows="14"
              />
            </div>
          </div>

          <div class="memo-section memo-section--tasks">
            <div class="memo-section__head">
              <strong>Tâches importantes ! </strong>
              <span>Ajoute une ligne, choisis son niveau, puis coche quand c'est fait.</span>
            </div>

            <div class="task-composer">
              <input
                ref="taskInputRef"
                v-model="newTaskLabel"
                class="task-composer__input"
                type="text"
                placeholder="Ex: Acheter des fleurs"
                @keydown.enter.prevent="addTask"
              />

              <select v-model="newTaskImportance" class="task-composer__select">
                <option
                  v-for="option in IMPORTANCE_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>

              <button class="icon-button task-composer__button" type="button" @click="addTask">
                Ajouter
              </button>
            </div>

            <p class="empty-state empty-state--soft">
              Les tâches ajoutées montent directement dans le mémo du haut.
            </p>
          </div>

          <p v-if="!hasMemoContent" class="empty-state">
            {{ currentTheme.emptyMessage }}
          </p>

          <div class="memo-actions">
            <button
              class="primary-button"
              type="button"
              :disabled="saving"
              @click="persistMemo({ returnToCalendar: true })"
            >
              {{ saving ? "Enregistrement..." : "Valider la journée de Florette" }}
            </button>
            <span v-if="saveMessage" class="status status--success">{{ saveMessage }}</span>
            <span v-if="errorMessage" class="status status--error">{{ errorMessage }}</span>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
