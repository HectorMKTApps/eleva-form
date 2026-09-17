function pad(num: number, length: number): string {
  return String(num).padStart(length, "0");
}

// One counter per warm serverless instance; combined with the date and a
// random suffix this is unique enough for a human-readable ID without
// needing a database sequence.
let counter = 0;

export function generateSubmissionId(now: Date = new Date()): string {
  counter += 1;
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(
    now.getDate(),
    2
  )}`;
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  const counterPart = pad(counter % 10000, 4);
  return `APP-${datePart}-${counterPart}${randomPart}`;
}
