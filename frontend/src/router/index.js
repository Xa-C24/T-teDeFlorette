import { createRouter, createWebHistory } from "vue-router";
import CalendarView from "../views/CalendarView.vue";
import MemoView from "../views/MemoView.vue";
import ShoppingView from "../views/ShoppingView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/keskon-mange",
      name: "shopping",
      component: ShoppingView,
    },
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
