import type { MissingPerson, MissingPersonStatus } from "../types/missingPerson";

// Initial mock data with realistic photos and details
const INITIAL_MISSING_PERSONS: MissingPerson[] = [
  {
    id: "MP-1001",
    name: "Maya Chen",
    age: "14",
    gender: "Female",
    lastLocation: "North Harbor, Pier 7",
    dateLastSeen: "2026-08-08 06:10",
    description: "Last seen near the coastal pier during morning surge alert.",
    clothingDetails: "Blue rain jacket, denim jeans, carrying a bright red backpack.",
    contactInfo: "+91 98765 43210 (Parent: Robert Chen)",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    status: "Searching",
    createdAt: "2026-08-08T06:30:00Z",
  },
  {
    id: "MP-1002",
    name: "Daniel Cruz",
    age: "32",
    gender: "Male",
    lastLocation: "Puri Seaside Market",
    dateLastSeen: "2026-08-08 08:30",
    description: "Went to assist local vendors securing storm shutters.",
    clothingDetails: "Grey hoodie, dark boots, carrying a small yellow flashlight.",
    contactInfo: "+91 98123 67890 (Spouse: Elena Cruz)",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    status: "Pending",
    createdAt: "2026-08-08T09:00:00Z",
  },
  {
    id: "MP-1003",
    name: "Lina Brooks",
    age: "27",
    gender: "Female",
    lastLocation: "West Cove Shelter 3",
    dateLastSeen: "2026-08-07 18:00",
    description: "Reunited with rescue team at temporary medical center.",
    clothingDetails: "Yellow windbreaker, white sneakers.",
    contactInfo: "+91 99000 11223",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
    status: "Found",
    createdAt: "2026-08-07T19:00:00Z",
    foundNotes: "Located safely at Shelter Station 3 by SDRF personnel.",
    foundAt: "2026-08-08 10:15",
  },
];

let missingPersonsStore: MissingPerson[] = [...INITIAL_MISSING_PERSONS];

export async function getMissingPersons(): Promise<MissingPerson[]> {
  return [...missingPersonsStore];
}

export async function addMissingPerson(
  person: Omit<MissingPerson, "id" | "status" | "createdAt">
): Promise<MissingPerson> {
  const newReport: MissingPerson = {
    ...person,
    id: `MP-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  missingPersonsStore = [newReport, ...missingPersonsStore];
  return newReport;
}

export async function updateMissingPersonStatus(
  id: string,
  status: MissingPersonStatus
): Promise<boolean> {
  missingPersonsStore = missingPersonsStore.map((person) =>
    person.id === id ? { ...person, status } : person
  );
  return true;
}

export async function reportPersonFound(
  id: string,
  foundNotes: string
): Promise<boolean> {
  missingPersonsStore = missingPersonsStore.map((person) =>
    person.id === id
      ? {
          ...person,
          status: "Found",
          foundNotes,
          foundAt: new Date().toLocaleString(),
        }
      : person
  );
  return true;
}
