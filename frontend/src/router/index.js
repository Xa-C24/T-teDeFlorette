import { createRouter, createWebHistory } from "vue-router";
import CalendarView from "../views/CalendarView.vue";
import MemoView from "../views/MemoView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "calendar",
      component: CalendarView,
    },
    {
      path: "/memo/fourre-tout",
      name: "memo-catchall",
      component: MemoView,
      props: {
        date: "",
        memoKind: "catchall",
      },
    },
    {
      path: "/memo/:date",
      name: "memo",
      component: MemoView,
      props: true,
    },
  ],
});

export default router;
