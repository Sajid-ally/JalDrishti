export interface CitizenUserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  photoUrl?: string;
  role: "citizen";
}

export interface GovernmentUserProfile {
  id: string;
  name: string;
  governmentId: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  location: string;
  photoUrl?: string;
  role: "government";
}
