const EMOJI_SEQUENCE_REGEX =
  /\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\p{Emoji_Modifier})?)*/u;

export function getSafeSubjectIcon(icon?: string, fallback = "📘"): string {
  if (!icon) return fallback;
  const trimmed = icon.trim();
  if (!trimmed) return fallback;

  const emojiMatch = trimmed.match(EMOJI_SEQUENCE_REGEX);
  if (emojiMatch?.[0]) return emojiMatch[0];

  const firstChar = Array.from(trimmed)[0];
  if (!firstChar) return fallback;
  if (/^[a-z0-9]$/i.test(firstChar)) return firstChar.toUpperCase();
  return fallback;
}
