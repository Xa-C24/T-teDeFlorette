<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getMemos } from "../services/api";
import { currentTheme } from "../theme";
import { buildCalendarDays, formatKey, getMonthLabel } from "../utils/date";
import { hasStoredMemoContent, isCatchallMemoDate } from "../utils/memo";

const route = useRoute();
const router = useRouter();
const todayKey = formatKey(new Date());
const currentMonth = ref(new Date());
const focusedDateKey = ref(todayKey);
const memoDates = ref(new Set());
const loading = ref(true);
const errorMessage = ref("");
const isHeroOpen = ref(false);
const isCalendarOpen = ref(false);
const calendarCardRef = ref(null);

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const monthLabel = computed(() => {
  const label = getMonthLabel(currentMonth.value);
  return label.charAt(0).toUpperCase() + label.slice(1);
});

const days = computed(() => buildCalendarDays(currentMonth.value));

const spotlightLabel = computed(() => {
  if (memoDates.value.size === 0) {
    return "Zero memo pour l'instant. Terrain ideal pour semer de bonnes idees.";
  }

  if (memoDates.value.size === 1) {
    return "";
  }

  return `${memoDates.value.size} memos galopent déjà dans la base. L'agenda ne dort pas.`;
});

const spotlightParts = computed(() =>
  spotlightLabel.value
    .split(". ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index, parts) => (index < parts.length - 1 && !part.endsWith(".") ? `${part}.` : part))
);

function goToPreviousMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
}

function goToNextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
}

function jumpToDate(date) {
  currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1);
  focusedDateKey.value = formatKey(date);
}

async function openDateFromEvent(event) {
  const dateKey = event.detail?.dateKey;

  if (!dateKey) {
    return;
  }

  const date = new Date(`${dateKey}T12:00:00`);
  jumpToDate(date);
  isCalendarOpen.value = true;
  await nextTick();
  calendarCardRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

async function syncCalendarFromRoute() {
  const focusDate = typeof route.query.focusDate === "string" ? route.query.focusDate : "";
  const shouldOpen = route.query.open === "1";

  if (!focusDate) {
    return;
  }

  const date = new Date(`${focusDate}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return;
  }

  jumpToDate(date);

  if (!shouldOpen) {
    return;
  }

  isCalendarOpen.value = true;
  await nextTick();
  calendarCardRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function openShortcutDate(date) {
  jumpToDate(date);
  openMemo(formatKey(date));
}

function openMemo(dateKey) {
  router.push({
    name: "memo",
    params: { date: dateKey },
    query: { open: "1", focus: "1" },
  });
}

function dayHasMemo(dateKey) {
  return memoDates.value.has(dateKey);
}

async function loadMemos() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await getMemos();
    memoDates.value = new Set(
      response.items
        .filter((item) => !isCatchallMemoDate(item.memoDate) && hasStoredMemoContent(item.content))
        .map((item) => item.memoDate)
    );
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadMemos();
  window.addEventListener("calendar:open-date", openDateFromEvent);
});

watch(
  () => [route.query.focusDate, route.query.open, route.query.stamp],
  () => {
    syncCalendarFromRoute();
    loadMemos();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener("calendar:open-date", openDateFromEvent);
});
</script>

<template>
  <section class="panel panel--calendar">
    <div class="panel__hero">
      <button
        class="collapsible-toggle collapsible-toggle--hero"
        type="button"
        :aria-expanded="isHeroOpen ? 'true' : 'false'"
        @click="isHeroOpen = !isHeroOpen"
      >
        <span class="collapsible-toggle__text">
          <span class="eyebrow">Vue mensuelle</span>
          <strong class="collapsible-toggle__headline">{{ currentTheme.calendarTitle }}</strong>
        </span>
        <span
          class="collapsible-toggle__icon"
          :class="{ 'collapsible-toggle__icon--open': isHeroOpen }"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div v-if="isHeroOpen" class="collapsible-body panel__hero-body">
        <div>
          <p class="hero-note">{{ currentTheme.heroNote }}</p>
        </div>
        <p class="hero-copy">
          {{ currentTheme.calendarCopy }}
        </p>
      </div>
    </div>

    <div ref="calendarCardRef" class="calendar-card">
      <button
        class="collapsible-toggle collapsible-toggle--card"
        type="button"
        :aria-expanded="isCalendarOpen ? 'true' : 'false'"
        @click="isCalendarOpen = !isCalendarOpen"
      >
        <span class="collapsible-toggle__text">
          <span class="calendar-topline">
            <span class="theme-badge">{{ currentTheme.name }}</span>
            <span class="calendar-topline__text">
              <span
                v-for="(part, index) in spotlightParts"
                :key="`${index}-${part}`"
                class="calendar-topline__part"
              >
                {{ part }}
              </span>
            </span>
          </span>
        </span>
        <span
          class="collapsible-toggle__icon"
          :class="{ 'collapsible-toggle__icon--open': isCalendarOpen }"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div v-if="isCalendarOpen" class="collapsible-body">
        <div class="calendar-toolbar">
          <button class="icon-button" type="button" @click="goToPreviousMonth">
            Mois précédent
          </button>
          <h3>{{ monthLabel }}</h3>
          <button class="icon-button" type="button" @click="goToNextMonth">
            Mois suivant
          </button>
        </div>

        <p v-if="errorMessage" class="status status--error">{{ errorMessage }}</p>
        <p v-else-if="loading" class="status">Chargement des memos...</p>

        <div class="calendar-grid calendar-grid--header">
          <span v-for="day in weekDays" :key="day" class="weekday">{{ day }}</span>
        </div>

        <div class="calendar-grid">
          <button
            v-for="day in days"
            :key="day.key"
            class="day-card"
            :class="{
              'day-card--muted': !day.isCurrentMonth,
              'day-card--today': day.key === todayKey,
              'day-card--memo': dayHasMemo(day.key),
              'day-card--has-memo': dayHasMemo(day.key),
              'day-card--focused': day.key === focusedDateKey,
            }"
            type="button"
            @click="openMemo(day.key)"
          >
            <span class="day-card__number">{{ day.dayNumber }}</span>
            <span v-if="dayHasMemo(day.key)" class="day-card__memo"></span>
            <span v-else-if="day.key === todayKey" class="day-card__memo">To Day</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
