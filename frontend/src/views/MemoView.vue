<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { deleteMemo, getMemoByDate, saveMemo } from "../services/api";
import { currentTheme } from "../theme";
import { formatDisplayDate } from "../utils/date";

const props = defineProps({
  date: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const content = ref("");
const loading = ref(true);
const saving = ref(false);
const saveMessage = ref("");
const errorMessage = ref("");
const isMemoOpen = ref(false);
let autoSaveDebounceTimer = null;
let saveFeedbackTimer = null;

const displayDate = computed(() => {
  const label = formatDisplayDate(props.date);
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const placeholderText = computed(() => currentTheme.value.placeholderLines.join("\n"));

async function loadMemo() {
  loading.value = true;
  errorMessage.value = "";
  saveMessage.value = "";

  try {
    const response = await getMemoByDate(props.date);
    content.value = response.item?.content || "";
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
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
    if (!content.value.trim()) {
      await deleteMemo(props.date);
    } else {
      await saveMemo({
        memoDate: props.date,
        content: content.value,
      });
    }

    saveMessage.value = "Memo enregistre avec succes Florette !";

    if (returnToCalendar) {
      await router.push({
        name: "calendar",
        query: {
          focusDate: props.date,
          open: "1",
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

function goBack() {
  router.push({ name: "calendar" });
}

watch(() => props.date, loadMemo);
watch(content, queueAutoSave);

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

          <textarea
            v-model="content"
            class="memo-textarea"
            :placeholder="placeholderText"
            rows="14"
          />

          <p v-if="!content.trim()" class="empty-state">
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
