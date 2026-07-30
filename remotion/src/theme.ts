export const COLORS = {
  ink: "#0b0b10",
  paper: "#ffffff",
  hot: "#ff2d2d",
  ember: "#ff7a00",
  gold: "#ffd60a",
  cyan: "#22e3ff",
};

/** Thick black keyline + drop shadow so the telop stays readable on any frame. */
export const outline = (px: number, color = COLORS.ink) =>
  [
    `${px}px ${px}px 0 ${color}`,
    `${-px}px ${px}px 0 ${color}`,
    `${px}px ${-px}px 0 ${color}`,
    `${-px}px ${-px}px 0 ${color}`,
    `0 ${px}px 0 ${color}`,
    `0 ${-px}px 0 ${color}`,
    `${px}px 0 0 ${color}`,
    `${-px}px 0 0 ${color}`,
  ].join(", ");

export const GRADIENTS = {
  paper: `linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #d8dee9 100%)`,
  gold: `linear-gradient(180deg, ${COLORS.gold} 0%, #ffb200 55%, ${COLORS.ember} 100%)`,
  fire: `linear-gradient(180deg, #fff3a8 0%, ${COLORS.gold} 32%, ${COLORS.hot} 78%, #b30000 100%)`,
};
