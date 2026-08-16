export type MissingPersonStatus = "Pending" | "Searching" | "Found" | "Closed";

export interface MissingPerson {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  lastLocation: string;
  dateLastSeen: string;
  description: string;
  clothingDetails: string;
  contactInfo: string;
  photoUrl?: string;
  status: MissingPersonStatus;
  createdAt: string;
  foundNotes?: string;
  foundAt?: string;
}
