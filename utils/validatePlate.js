export function isValidUKPlate(reg) {
  if (!reg) return false;

  const cleaned = reg.replace(/\s/g, "").toUpperCase();

  // Basic UK format (works for most modern plates)
  return /^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(cleaned);
}