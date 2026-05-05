<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { applyTheme, currentTheme, currentThemeKey, setTheme, themes } from "./theme";
import { formatKey } from "./utils/date";

const isThemeMenuOpen = ref(false);
const isThemeSwitcherOpen = ref(false);
const route = useRoute();
const router = useRouter();

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
        <div class="shell__topbar">
          <button class="ghost-link" type="button" @click="openCalendar">Calendrier</button>
          <button class="ghost-link" type="button" @click="openTodayMemo">Aujourd'hui</button>
          <button class="ghost-link" type="button" @click="openTomorrowMemo">Demain</button>
        </div>
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
