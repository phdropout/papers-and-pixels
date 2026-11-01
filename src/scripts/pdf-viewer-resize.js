// Observe the outer viewport width, not the content box: showing or hiding a
// page can change scrollbar size without changing the available layout width.
export function observePdfWidth(stage, { canRender, onResize }, {
  Observer = ResizeObserver, delay = setTimeout, cancel = clearTimeout,
} = {}) {
  let renderedWidth = null, timer = null, disconnected = false;
  const width = () => stage.getBoundingClientRect().width;
  const changed = () => renderedWidth !== null && width() > 0 && Math.abs(width() - renderedWidth) > 1;
  function check() {
    if (timer !== null) { cancel(timer); timer = null; }
    if (disconnected || !canRender() || !changed()) return;
    timer = delay(() => {
      timer = null;
      if (!disconnected && canRender() && changed()) onResize();
    }, 200);
  }
  const observer = new Observer(check);
  observer.observe(stage, { box: "border-box" });
  return {
    remember() { renderedWidth = width(); },
    check,
    disconnect() { disconnected = true; observer.disconnect(); if (timer !== null) cancel(timer); },
  };
}
