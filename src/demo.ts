import { createImportedEvent, type CalendarEvent } from "./calendar.js";

export function buildDemoEvents(now = new Date()): CalendarEvent[] {
  const todayNine = atLocal(now, 9, 0);
  const tomorrowFourteen = addDays(atLocal(now, 14, 0), 1);
  const holiday = addDays(atLocal(now, 0, 0), 3);
  const vacation = addDays(atLocal(now, 9, 0), 10);
  const meet = addDays(atLocal(now, 16, 30), 2);

  return [
    createImportedEvent({
      title: "Standup",
      start: todayNine,
      end: new Date(todayNine.getTime() + 30 * 60_000),
      allDay: false,
      calendarName: "Work",
      account: "ICS #1",
      location: undefined,
      calendarId: "ICS #1",
      icalUid: "demo-standup",
      status: "confirmed",
    }),
    createImportedEvent({
      title: "Dentist",
      start: tomorrowFourteen,
      end: new Date(tomorrowFourteen.getTime() + 60 * 60_000),
      allDay: false,
      calendarName: "Personal",
      account: "ICS #1",
      location: "Clinic",
      calendarId: "ICS #1",
      icalUid: "demo-dentist",
      status: "confirmed",
    }),
    createImportedEvent({
      title: "Some holiday",
      start: holiday,
      end: addDays(holiday, 1),
      allDay: true,
      calendarName: "Holidays",
      account: "ICS #1",
      location: undefined,
      calendarId: "en.brazilian#holiday@group.v.calendar.google.com",
      icalUid: "demo-holiday",
      status: "confirmed",
    }),
    createImportedEvent({
      title: "Deep work",
      start: meet,
      end: new Date(meet.getTime() + 90 * 60_000),
      allDay: false,
      calendarName: "Work",
      account: "ICS #1",
      location: undefined,
      calendarId: "ICS #1",
      icalUid: "demo-focus",
      status: "confirmed",
    }),
    createImportedEvent({
      title: "Vacation",
      start: vacation,
      end: addDays(vacation, 1),
      allDay: true,
      calendarName: "Personal",
      account: "ICS #1",
      location: undefined,
      calendarId: "ICS #1",
      icalUid: "demo-ooo",
      status: "confirmed",
    }),
    createImportedEvent({
      title: "Planning",
      start: addDays(atLocal(now, 11, 0), 2),
      end: addDays(atLocal(now, 12, 0), 2),
      allDay: false,
      calendarName: "Work",
      account: "ICS #1",
      location: undefined,
      calendarId: "ICS #1",
      icalUid: "demo-meet",
      status: "confirmed",
      description: "https://meet.google.com/abc-defg-hij",
    }),
  ];
}

function atLocal(base: Date, hour: number, minute: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}
