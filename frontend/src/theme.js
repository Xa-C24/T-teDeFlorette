import { computed, ref } from "vue";

const STORAGE_KEY = "tetedeflorette-theme";

export const themes = [
  
  {
    key: "equitation",
    name: "Ambiance cheval",
    label: "Cuir souple, prairie et galop",
    eyebrow: "Mode box élégant",
    calendarTitle: "Un agenda qui trotte droit et respire le grand air",
    calendarCopy:
      "Entre deux pas sur le côté et un café dans l'écurie, chaque date garde son allure.",
    heroNote: "Cap du jour: avancer au pas, puis galoper quand la piste s'ouvre.",
    memoHint:
      "Note la séance, carottes à volonté.",
    emptyMessage:
      "Aucune note pour cette date. La selle est prête, allons-y !",
    placeholderLines: [
      "Cours avec Angelo à 14h",
      "Jujux ce week-end ! (Carottes ++)",
      "Vérifier tapis, brosses et carottes VIP",
      "Appeler le marechal avant vendredi",
      "Zuut les compléments !",
    ],
  },
  {
    key: "montagne",
    name: "Bellevaux sur la Montagne",
    label: "Neige, cheminée et ciel bleu",
    eyebrow: "Mode pilou-pilou",
  
    calendarCopy:
      "Les jours s'alignent comme un sentier propre: un peu d'air vif, des sommets en fond, et cette joie de cocher une étape apres l'autre.",
    heroNote: "Objectif du jour: rando raquette, Ski de fond, fondue 3 fromages.",
    memoHint:
      "Plans de rando, chocolat chaud et terasse au soleil.",
    emptyMessage:
      "Le refuge est calme.",
    placeholderLines: [
      "Acheter des mouffles",
      "Commander des pneus hiver",
      "Reprendre un bout de tarte à la myrtille",
      "Farter les skis",
    ],
  },
  {
    key: "plage",
    name: "Ibiza SunSet",
    label: "Sel, soleil et sable chaud",
    eyebrow: "Mode mini pieuvre",
    calendarTitle: "Un planning qui bronze et chauffe au soleil",
    calendarCopy:
      "Serviette bien posée: un Cosmos, crème solaire, maillot ajuster",
    heroNote: "Programme idéal: sangria, sangria et hierbas, ah et sangria aussi.",
    memoHint:
      "",
    emptyMessage:
      "",
    placeholderLines: [
      "Crème solaire, lunettes Ray Ban",
      "Con jamon y tomate",
      "Pensez à réserver un resto pour le coucher de soleil ! ",
    ],
  },
  {
    key: "place-doree",
    name: "Ibiza Plage dorée",
    label: "Terrasse, plage et Orion !",
    eyebrow: "Mode plage ensoleillée activée",
    calendarTitle: "",
    calendarCopy:
      "Entre les siestes et les idées de terrasse , qui prend les gambasses ?",
    heroNote: "Petit défi du jour: Tout faire de tête !",
    memoHint:
      "",
    emptyMessage:
      "Cette date attend encore sa scene de place animee, sa fontaine et sa note bien tournee.",
    placeholderLines: [
     
      "Commander un nouveau maillot de bain ",
      
      "Courir sur la plage",
      "Manger une glace à la hierbas",
      "Commander de la crème hydratante !!",
    ],
  },
  {
    key: "girly-rose",
    name: "Girly rosy ! ",
    label: "Gloss, maquillage et agenda secret ! ",
    eyebrow: "Mode coeur paillete",
    calendarTitle: "Le planning qui sent la cerise et les bonnes envies",
    calendarCopy:
      "Des rendez-vous, des caprices et trois plans brillants avant le gouter.",
    heroNote: "Mission du jour: être organisée, adorable et un peu capricieuse.",
    memoHint:
      "Je prend mon stylo a plume, un miroir de poche.",
    emptyMessage:
      "Pas de memo ici pour l'instant. C'est un espace libre pour une idée brillante, une lubie chic ou une mini confession.",
    placeholderLines: [
      "Acheter des fleurs absolument inutiles mais essentielles",
      "Brunch, lunette de soleil et terrasse",
      "Penser apeler Manou pour le gouter du dimanche",
    ],
  },
];

function getFallbackTheme() {
  return themes[0].key;
}

function resolveThemeKey(rawKey) {
  return themes.some((theme) => theme.key === rawKey) ? rawKey : getFallbackTheme();
}

function readStoredTheme() {
  if (typeof window === "undefined") {
    return getFallbackTheme();
  }

  return resolveThemeKey(window.localStorage.getItem(STORAGE_KEY));
}

export const currentThemeKey = ref(readStoredTheme());

export const currentTheme = computed(
  () => themes.find((theme) => theme.key === currentThemeKey.value) || themes[0]
);

export function applyTheme(themeKey = currentThemeKey.value) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolveThemeKey(themeKey));
  }
}

export function setTheme(themeKey) {
  const resolvedThemeKey = resolveThemeKey(themeKey);
  currentThemeKey.value = resolvedThemeKey;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, resolvedThemeKey);
  }

  applyTheme(resolvedThemeKey);
}
