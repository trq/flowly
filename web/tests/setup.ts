import "@testing-library/jest-dom/vitest";

// cmdk uses ResizeObserver and scrollIntoView which jsdom doesn't provide
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = function () {};
