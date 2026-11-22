/**
 * UKGICS Plus — iPhone / ICS Version
 * Exports upcoming UKG shifts into an ICS calendar file.
 */

// =====================================
// CONFIGURATION
// =====================================

const CONFIG = {
    eventTitle: "Work (E-Comm)",

    // Replace these placeholders when using a private configuration.
    startAddress: "YOUR_START_ADDRESS",
    workAddress: "YOUR_WORK_ADDRESS",

    fileName: "work_schedule",

    // Reminder before each shift
    reminderMinutes: 120
};

// =====================================
// ICS HELPERS
// =====================================

function escapeICS(value) {
    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
}

function formatUTC(date) {
    const pad = n => String(n).padStart(2, "0");

    return (
        `${date.getUTCFullYear()}` +
        `${pad(date.getUTCMonth() + 1)}` +
        `${pad(date.getUTCDate())}T` +
        `${pad(date.getUTCHours())}` +
        `${pad(date.getUTCMinutes())}` +
        `${pad(date.getUTCSeconds())}Z`
    );
}

// =====================================
// CALENDAR BUILDER
// =====================================

function icsBuilder() {
    const items = [];

    return {
        add(summary, description, start, end) {

            const uid = `${start.getTime()}@ukgics-plus`;

            const event = [
                "BEGIN:VEVENT",
                `UID:${uid}`,
                `DTSTAMP:${formatUTC(new Date())}`,
                `SUMMARY:${escapeICS(summary)}`,
                `DESCRIPTION:${escapeICS(description)}`,
                `DTSTART:${formatUTC(start)}`,
                `DTEND:${formatUTC(end)}`,

                // Work location
                `LOCATION:${escapeICS(CONFIG.workAddress)}`,

                // Two-hour reminder
                "BEGIN:VALARM",
                "ACTION:DISPLAY",
                `DESCRIPTION:${escapeICS(summary)}`,
                `TRIGGER:-PT${CONFIG.reminderMinutes}M`,
                "END:VALARM",

                "END:VEVENT"
            ].join("\r\n");

            items.push(event);
        },

        save(fileName) {

            if (!items.length) {
                alert("No upcoming shifts found.");
                return;
            }

            const calendar = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "CALSCALE:GREGORIAN",
                "PRODID:-//UKGICS Plus//EN",
                ...items,
                "END:VCALENDAR"
            ].join("\r\n");

            const blob = new Blob(
                [calendar],
                { type: "text/calendar;charset=utf-8" }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `${fileName}.ics`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    };
}

// =====================================
// UKG SCHEDULE EXTRACTION
// =====================================

(() => {

    const today = new Date();
    const calendar = icsBuilder();

    document
        .querySelectorAll('li[id^="myschedule-day_"]')
        .forEach(li => {

            const node = li.querySelector(".listEntity");

            if (!node || node.classList.contains("isToday")) {
                return;
            }

            const datetime = node
                .querySelector("time")
                ?.getAttribute("datetime");

            if (!datetime) return;

            const day = new Date(datetime);

            if (day < today) return;

            node.querySelectorAll("time.label").forEach(time => {

                const match = time.textContent.match(
                    /(\d{1,2}:\d{2} [AP]M)-(\d{1,2}:\d{2} [AP]M)/
                );

                if (!match) return;

                const [, startTime, endTime] = match;

                const start = new Date(
                    `${day.toDateString()} ${startTime}`
                );

                const end = new Date(
                    `${day.toDateString()} ${endTime}`
                );

                calendar.add(
                    CONFIG.eventTitle,
                    time.textContent.trim(),
                    start,
                    end
                );
            });
        });

    calendar.save(CONFIG.fileName);

})();
