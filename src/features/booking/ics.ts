export function downloadIcs(args: {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMin: number;
  referenceId: string;
}) {
  const dt = new Date(`${args.date}T${args.time}:00`);
  const end = new Date(dt.getTime() + args.durationMin * 60000);
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lovable Scheduler//EN",
    "BEGIN:VEVENT",
    `UID:${args.referenceId}@scheduler`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(dt)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${args.title}`,
    `DESCRIPTION:${args.description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${args.referenceId}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
