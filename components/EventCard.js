// /components/EventCard.js

export default {
  name: "EventCard",
  props: {
    event: { type: Object, required: true },
    memberName: { type: String, default: "" },
    visual: { type: Object, default: () => ({ icon: "", color: "" }) },
  },
  emits: ["delete", "edit"],
  template: `
  <li class="p-4 bg-white rounded-xl shadow-md flex items-start transition-shadow hover:shadow-lg">
    <div class="w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0" :class="visual.color">
      <i class="fa-solid" :class="visual.icon"></i>
    </div>
    <div class="flex-grow overflow-hidden">
      <p class="font-bold text-slate-800">{{ memberName }}－{{ event.eventType }}</p>
      <p class="text-sm text-slate-500 mb-1">{{ event.date }}</p>
      <p class="text-base text-slate-700 break-words"><slot /></p>
    </div>
    <div class="flex items-center shrink-0 space-x-1 ml-2">
      <button @click="$emit('edit', event)" type="button" class="text-sky-500 hover:text-sky-700 w-8 h-8 rounded-full hover:bg-sky-100 transition-colors" title="編輯">
        <i class="fa-solid fa-pen-to-square fa-sm"></i>
      </button>
      <button @click="$emit('delete', event.id)" type="button" class="text-red-500 hover:text-red-700 w-8 h-8 rounded-full hover:bg-red-100 transition-colors" title="刪除">
        <i class="fa-solid fa-trash-can fa-sm"></i>
      </button>
    </div>
  </li>
  `,
};
