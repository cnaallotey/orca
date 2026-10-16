import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  return [
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ];
});
