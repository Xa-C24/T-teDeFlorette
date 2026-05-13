<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { deleteMemo, getMemoByDate, saveMemo } from "../services/api";
import { currentTheme } from "../theme";
import { formatDisplayDate } from "../utils/date";
import {
  CATCHALL_BACKUP_STORAGE_KEY,
  CATCHALL_BACKUP_TIMESTAMP_KEY,
  CATCHALL_MEMO_DATE,
  CATCHALL_STORAGE_KEY,
  hasMemoTasks,
  hasStoredMemoContent,
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
    default: "",
  },
  memoKind: {
    type: String,
    default: "dated",
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

const isCatchallMemo = computed(() => props.memoKind === "catchall");

const displayDate = computed(() => {
  if (isCatchallMemo.value) {
    return "Le Fourre-tout";
  }

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

function readCatchallBackupSnapshot() {
  const backupContent = window.localStorage.getItem(CATCHALL_BACKUP_STORAGE_KEY) || "";
  const legacyContent = window.localStorage.getItem(CATCHALL_STORAGE_KEY) || "";
  const backupTimestamp = window.localStorage.getItem(CATCHALL_BACKUP_TIMESTAMP_KEY) || "";
  const preferredContent = hasStoredMemoContent(backupContent)
    ? backupContent
    : hasStoredMemoContent(legacyContent)
      ? legacyContent
      : "";
  const parsedTimestamp = Date.parse(backupTimestamp);

  return {
    content: preferredContent,
    updatedAt: Number.isNaN(parsedTimestamp) ? null : parsedTimestamp,
  };
}

function shouldPreferCatchallBackup(serverContent, serverUpdatedAt, backupSnapshot) {
  if (!hasStoredMemoContent(backupSnapshot.content)) {
    return false;
  }

  if (!hasStoredMemoContent(serverContent)) {
    return true;
  }

  if (!serverUpdatedAt || !backupSnapshot.updatedAt) {
    return false;
  }

  return backupSnapshot.updatedAt > serverUpdatedAt;
}

function persistCatchallBackup(content) {
  if (!hasStoredMemoContent(content)) {
    window.localStorage.removeItem(CATCHALL_STORAGE_KEY);
    window.localStorage.removeItem(CATCHALL_BACKUP_STORAGE_KEY);
    window.localStorage.removeItem(CATCHALL_BACKUP_TIMESTAMP_KEY);
    return;
  }

  window.localStorage.setItem(CATCHALL_STORAGE_KEY, content);
  window.localStorage.setItem(CATCHALL_BACKUP_STORAGE_KEY, content);
  window.localStorage.setItem(CATCHALL_BACKUP_TIMESTAMP_KEY, new Date().toISOString());
}

async function loadMemo() {
  loading.value = true;
  errorMessage.value = "";
  saveMessage.value = "";

  try {
    let rawContent = "";

    if (isCatchallMemo.value) {
      const serverMemo = (await getMemoByDate(CATCHALL_MEMO_DATE)).item;
      const serverContent = serverMemo?.content || "";
      const serverUpdatedAt = serverMemo?.updatedAt ? Date.parse(serverMemo.updatedAt) : null;
      const backupSnapshot = readCatchallBackupSnapshot();

      rawContent = serverContent;

      if (shouldPreferCatchallBackup(serverContent, serverUpdatedAt, backupSnapshot)) {
        rawContent = backupSnapshot.content;
        await saveMemo({
          memoDate: CATCHALL_MEMO_DATE,
          content: backupSnapshot.content,
        });
      }

      persistCatchallBackup(rawContent);
    } else {
      rawContent = (await getMemoByDate(props.date)).item?.content || "";
    }

    const parsedMemo = parseStoredMemoContent(rawContent);
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
    if (isCatchallMemo.value) {
      if (!hasMemoContent.value) {
        await deleteMemo(CATCHALL_MEMO_DATE);
        persistCatchallBackup("");
      } else {
        const content = serializeMemoContent();
        await saveMemo({
          memoDate: CATCHALL_MEMO_DATE,
          content,
        });
        persistCatchallBackup(content);
      }
    } else if (!hasMemoContent.value) {
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
        query: isCatchallMemo.value
          ? {}
          : {
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

  if (isCatchallMemo.value) {
    persistCatchallBackup(serializeMemoContent());
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
    query: isCatchallMemo.value
      ? {}
      : {
          focusDate: props.date,
          open: "1",
          stamp: Date.now().toString(),
        },
  });
}

watch(() => [props.date, props.memoKind], loadMemo);
watch([freeformNotes, tasks], queueAutoSave, { deep: true });
watch(
  () => [route.query.open, route.query.focus, props.date, props.memoKind, loading.value],
  () => {
    if (!loading.value) {
      syncOpenStateFromRoute();
    }
  },
  { immediate: true }
);

onMounted(loadMemo);

onBeforeUnmount(() => {
  if (isCatchallMemo.value && hasMemoContent.value) {
    persistCatchallBackup(serializeMemoContent());
  }

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
              <strong>Notes libres 2.0</strong>
              
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
