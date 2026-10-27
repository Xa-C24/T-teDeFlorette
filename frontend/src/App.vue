<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { applyTheme, currentTheme, currentThemeKey, setTheme, themes } from "./theme";
import { formatKey } from "./utils/date";
import FridgeIcon from "./components/FridgeIcon.vue";
import NavigationIcon from "./components/NavigationIcon.vue";

const isThemeMenuOpen = ref(false);
const isThemeSwitcherOpen = ref(false);
const route = useRoute();
const router = useRouter();

const navigationItems = computed(() => {
  const relativeDate = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return formatKey(date);
  };
  const isMemoAt = (offset) => route.name === "memo" && route.params.date === relativeDate(offset);
  return [
    { key: "calendar", label: "Calendrier", icon: "calendar", active: route.name === "calendar", open: openCalendar },
    { key: "yesterday", label: "Hier", icon: "yesterday", active: isMemoAt(-1), open: openYesterdayMemo },
    { key: "today", label: "Aujourd’hui", icon: "today", active: isMemoAt(0), open: openTodayMemo },
    { key: "tomorrow", label: "Demain", icon: "tomorrow", active: isMemoAt(1), open: openTomorrowMemo },
    { key: "catchall", label: "Le Fourre-tout", icon: "catchall", active: route.name === "memo-catchall", open: openCatchallMemo },
    { key: "shopping", label: "Késkon mange ?", icon: "fridge", active: route.name === "shopping", open: () => router.push({ name: "shopping" }) },
  ];
});

function toggleThemeMenu() {
  isThemeMenuOpen.value = !isThemeMenuOpen.value;
}

function toggleThemeSwitcher() {
  isThemeSwitcherOpen.value = !isThemeSwitcherOpen.value;
  isThemeMenuOpen.value = false;
}

function chooseTheme(themeKey) {
  setTheme(themeKey);
  isThemeMenuOpen.value = false;
}

async function openCalendarAt(dateKey) {
  await router.push({
    name: "calendar",
    query: {
      focusDate: dateKey,
      open: "1",
      stamp: Date.now().toString(),
    },
  });
}

async function openCalendar() {
  const todayKey = formatKey(new Date());

  await openCalendarAt(todayKey);
}

async function openTodayMemo() {
  const todayKey = formatKey(new Date());

  await router.push({
    name: "memo",
    params: { date: todayKey },
    query: { open: "1", focus: "1" },
  });
}

async function openTomorrowMemo() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = formatKey(tomorrow);

  await router.push({
    name: "memo",
    params: { date: tomorrowKey },
    query: { open: "1", focus: "1" },
  });
}

async function openYesterdayMemo() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatKey(yesterday);

  await router.push({
    name: "memo",
    params: { date: yesterdayKey },
    query: { open: "1", focus: "1" },
  });
}

async function openCatchallMemo() {
  await router.push({
    name: "memo-catchall",
    query: { open: "1", focus: "1" },
  });
}

function handleWindowClick(event) {
  if (!event.target.closest(".theme-picker")) {
    isThemeMenuOpen.value = false;
  }
}

onMounted(() => {
  applyTheme();
  window.addEventListener("click", handleWindowClick);
});

watch(
  () => route.name,
  () => {
    isThemeMenuOpen.value = false;
  }
);

watch(currentThemeKey, (themeKey) => {
  applyTheme(themeKey);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", handleWindowClick);
});
</script>

<template>
  <div class="shell">
    <header class="shell__header">
      <div class="shell__title">
        <p class="eyebrow">{{ currentTheme.eyebrow }}</p>
        <div class="shell__brand">
          <img class="shell__logo shell__logo--title" src="/logo_rectangle.png" alt="Logo TeteDeFlorette" />
        </div>
        <p class="shell__tagline">
          Agenda a themes, mémos qui ont du caractère, parfait pour une TêteDeFlorette !
        </p>
      </div>

      <div class="shell__actions">
        <nav class="shell__topbar shell-nav" aria-label="Navigation principale">
          <button
            v-for="item in navigationItems"
            :key="item.key"
            class="shell-nav__item"
            :class="{ 'shell-nav__item--active': item.active }"
            type="button"
            :aria-current="item.active ? 'page' : undefined"
            @click="item.open"
          >
            <span class="shell-nav__icon">
              <FridgeIcon v-if="item.icon === 'fridge'" />
              <NavigationIcon v-else :name="item.icon" />
            </span>
            <span class="shell-nav__label">{{ item.label }}</span>
          </button>
        </nav>
        <div class="theme-pulse">
          <span class="theme-pulse__label">Ambiance active</span>
          <span class="theme-pulse__name">{{ currentTheme.name }}</span>
          <span>{{ currentTheme.label }}</span>
        </div>
      </div>
    </header>

    <section class="theme-switcher panel">
      <button
        class="collapsible-toggle"
        type="button"
        :aria-expanded="isThemeSwitcherOpen ? 'true' : 'false'"
        @click="toggleThemeSwitcher"
      >
        <span class="collapsible-toggle__text">
          <span class="eyebrow">Vestiaire visuel</span>
          <span class="collapsible-toggle__title">Changer d'ambiance</span>
        </span>
        <span
          class="collapsible-toggle__icon"
          :class="{ 'collapsible-toggle__icon--open': isThemeSwitcherOpen }"
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div v-if="isThemeSwitcherOpen" class="collapsible-body">
        <div class="theme-switcher__bar">
        <div class="theme-picker">
          <span class="theme-picker__label">Theme</span>
          <div class="theme-picker__field">
            <button
              class="theme-picker__select"
              :class="{ 'theme-picker__select--open': isThemeMenuOpen }"
              type="button"
              :aria-expanded="isThemeMenuOpen ? 'true' : 'false'"
              @click.stop="toggleThemeMenu"
            >
              <span>{{ currentTheme.name }}</span>
            </button>

            <div v-if="isThemeMenuOpen" class="theme-picker__menu">
              <button
                v-for="theme in themes"
                :key="theme.key"
                class="theme-picker__option"
                :class="{ 'theme-picker__option--active': theme.key === currentThemeKey }"
                type="button"
                @click.stop="chooseTheme(theme.key)"
              >
                {{ theme.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="theme-switcher__intro">
        <h2 class="theme-switcher__headline">Cinq humeurs, cinq décors au gré des humeurs, même agenda</h2>
        <p class="hero-copy">
          {{ currentTheme.label }}
        </p>
      </div>
      </div>
    </section>

    <main class="shell__main">
      <RouterView v-slot="{ Component }">
        <transition name="page-swap" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.shell-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--panel-border);
  border-radius: 26px;
  background: color-mix(in srgb, var(--surface-2) 55%, transparent);
}

.shell-nav__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 66px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  border-radius: 19px;
  background: linear-gradient(145deg, rgba(255, 255, 255, .85), var(--surface-2));
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 3px 8px color-mix(in srgb, var(--accent-strong) 5%, transparent);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.shell-nav__icon {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent-strong);
}

.shell-nav__label {
  font-size: .88rem;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.shell-nav__item:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 8px 18px var(--accent-soft);
}

.shell-nav__item:focus-visible {
  outline: 3px solid var(--accent-strong);
  outline-offset: 3px;
}

.shell-nav__item--active {
  background: linear-gradient(135deg, var(--accent-strong), var(--accent));
  border-color: transparent;
  color: var(--accent-contrast);
  box-shadow: 0 6px 16px var(--accent-soft);
}

.shell-nav__item--active .shell-nav__icon {
  background: rgba(255, 255, 255, .19);
  color: inherit;
}

@media (min-width: 641px) and (max-width: 900px) {
  .shell-nav { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 360px) {
  .shell-nav { gap: 8px; padding: 6px; }
  .shell-nav__item { gap: 7px; padding: 8px; }
  .shell-nav__icon { flex-basis: 30px; width: 30px; height: 34px; }
  .shell-nav__label { font-size: .8rem; }
}

@media (prefers-reduced-motion: reduce) {
  .shell-nav__item { transition: none; }
  .shell-nav__item:hover { transform: none; }
}
</style>
