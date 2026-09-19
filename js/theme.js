export function applyTheme() {
  document.documentElement.dataset.theme = "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", "#0a0a0a");
  }
}
