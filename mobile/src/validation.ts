/** Shared by web and native: keyboard hints never replace input filtering. */
export const PHONE_MAX_DIGITS = 15;
export function filterPhone(value: string) {
  const allowed = value.replace(/[^0-9+() .-]/g, "");
  let digits = 0;
  for (let index = 0; index < allowed.length; index++) {
    if (/[0-9]/.test(allowed[index]) && ++digits > PHONE_MAX_DIGITS)
      return allowed.slice(0, index).trimEnd();
  }
  return allowed;
}
export const passwordHelp = "Use 12 ou mais caracteres, com letras e um número ou símbolo.";
export function passwordError(value: string, newPassword: boolean) {
  const characters = Array.from(value);
  const bytes = characters.reduce((length, character) => {
    const code = character.codePointAt(0)!;
    return length + (code > 0xffff ? 4 : code > 0x7ff ? 3 : code > 0x7f ? 2 : 1);
  }, 0);
  if (bytes > 72) return "A senha pode ocupar até 72 bytes.";
  if (newPassword && (characters.length < 12 || !/\p{L}/u.test(value) || !/[\p{N}\p{P}\p{S}]/u.test(value) || /\p{Cc}/u.test(value)))
    return passwordHelp;
  return "";
}
export const filterCode = (value: string) =>
  value
    .replace(/[^a-f0-9]/gi, "")
    .toUpperCase()
    .slice(0, 12);
export function isoDate(value: string): string | null {
  const v = value.trim().replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (y < 1) return null;
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
    ? v
    : null;
}
export const validTime = (v: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
export function isoDateTime(v: string): string | null {
  const parts = v.trim().split(/[T ]/);
  if (parts.length !== 2) return null;
  const date = isoDate(parts[0] || "");
  return date && validTime(parts[1] || "") ? `${date}T${parts[1]}` : null;
}
export const todaySP = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
export function latestBirthDate(minimumAge = 0) {
  const [year,month,day]=todaySP().split("-");
  const eligibleYear=Number(year)-minimumAge;
  return isoDate(`${eligibleYear}-${month}-${day}`) ?? `${eligibleYear}-02-28`;
}
export function numericMask(
  value: string,
  kind: "date" | "datetime-local" | "time",
) {
  // Native keyboards display Brazilian dates; ISO pasted from API remains accepted.
  if (
    kind !== "time" &&
    /^\d{4}-/.test(value) &&
    (kind === "date" ? isoDate(value) : isoDateTime(value))
  ) {
    value = value.replace(/^(\d{4})-(\d{2})-(\d{2})[T ]?/, "$3/$2/$1 ").trim();
  }
  const digits = value
    .replace(/\D/g, "")
    .slice(0, kind === "time" ? 4 : kind === "date" ? 8 : 12);
  const lengths =
    kind === "time" ? [2, 2] : kind === "date" ? [2, 2, 4] : [2, 2, 4, 2, 2];
  const separators = kind === "time" ? [":"] : ["/", "/", " ", ":"];
  let offset = 0;
  return lengths
    .map((length, i) => {
      const part = digits.slice(offset, offset + length);
      offset += length;
      return part ? (i ? separators[i - 1] : "") + part : "";
    })
    .join("");
}
