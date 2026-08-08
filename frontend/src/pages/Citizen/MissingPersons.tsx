import { useMemo, useState } from "react";
import EmergencyAlertCard from "../../components/alerts/EmergencyAlertCard";

type MissingPerson = {
  id: number;
  name: string;
  age: string;
  location: string;
  status: "Urgent" | "Monitoring" | "Safe";
  lastSeen: string;
  notes: string;
};

const initialPeople: MissingPerson[] = [
  {
    id: 1,
    name: "Maya Chen",
    age: "14",
    location: "North Harbor",
    status: "Urgent",
    lastSeen: "Pier 7 at 06:10",
    notes: "Wearing a blue rain jacket and carrying a red backpack.",
  },
  {
    id: 2,
    name: "Daniel Cruz",
    age: "32",
    location: "East Point",
    status: "Monitoring",
    lastSeen: "Seaside market at 08:30",
    notes: "Last seen with a phone and a small flashlight.",
  },
  {
    id: 3,
    name: "Lina Brooks",
    age: "27",
    location: "West Cove",
    status: "Safe",
    lastSeen: "Shelter station at 10:00",
    notes: "Confirmed at the temporary shelter and receiving care.",
  },
];

export default function MissingPersons() {
  const [people, setPeople] = useState(initialPeople);

  const urgentCount = useMemo(
    () => people.filter((person) => person.status === "Urgent").length,
    [people]
  );

  const updatePerson = (id: number, field: keyof MissingPerson, value: string) => {
    setPeople((current) =>
      current.map((person) => (person.id === id ? { ...person, [field]: value } : person))
    );
  };

  return (
    <main className="min-h-screen text-(--color-dark-teal)">
      {urgentCount > 0 && (
        <EmergencyAlertCard
          title="Urgent missing-person alert"
          message={`${urgentCount} case${urgentCount > 1 ? "s" : ""} require immediate response. Check the latest details below.`}
        />
      )}

      <div className="rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-(--color-medium-teal)">Missing persons</p>
            <h1 className="mt-2 text-3xl font-black">Community search updates</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review active cases, update details, and keep the response team aligned in real time.
            </p>
          </div>
          <div className="rounded-full bg-(--color-light-mint) px-4 py-2 text-sm font-semibold text-(--color-dark-teal)">
            {urgentCount} urgent case{urgentCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {people.map((person) => (
              <article key={person.id} className="w-72 rounded-3xl border border-[rgba(53,98,103,0.16)] bg-(--color-off-white) p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{person.name}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${person.status === "Urgent" ? "bg-rose-100 text-rose-700" : person.status === "Monitoring" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {person.status}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-(--color-medium-teal)">Name</span>
                    <input value={person.name} onChange={(event) => updatePerson(person.id, "name", event.target.value)} className="w-full rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-(--color-medium-teal)">Age</span>
                    <input value={person.age} onChange={(event) => updatePerson(person.id, "age", event.target.value)} className="w-full rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-(--color-medium-teal)">Location</span>
                    <input value={person.location} onChange={(event) => updatePerson(person.id, "location", event.target.value)} className="w-full rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-(--color-medium-teal)">Status</span>
                    <select value={person.status} onChange={(event) => updatePerson(person.id, "status", event.target.value as MissingPerson["status"])} className="w-full rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-2 outline-none">
                      <option value="Urgent">Urgent</option>
                      <option value="Monitoring">Monitoring</option>
                      <option value="Safe">Safe</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-(--color-medium-teal)">Last seen</span>
                    <input value={person.lastSeen} onChange={(event) => updatePerson(person.id, "lastSeen", event.target.value)} className="w-full rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-2 outline-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-(--color-medium-teal)">Notes</span>
                    <textarea value={person.notes} onChange={(event) => updatePerson(person.id, "notes", event.target.value)} rows={3} className="w-full rounded-2xl border border-[rgba(53,98,103,0.16)] bg-white px-3 py-2 outline-none" />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
