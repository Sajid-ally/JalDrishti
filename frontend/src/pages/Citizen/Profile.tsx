import { useState, useEffect, type ChangeEvent } from "react";
import { User, Mail, Phone, MapPin, Camera, Save } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { getCitizenProfile, updateCitizenProfile } from "../../services/userService";
import type { CitizenUserProfile } from "../../types/user";

export default function CitizenProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CitizenUserProfile>({
    id: user?.id || "USR-CITIZEN-01",
    name: user?.name || "Sajid Ally",
    email: user?.email || "sajid@coastaleye.org",
    phone: "+91 98765 12345",
    location: "Puri Coastal District, Odisha",
    photoUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
    role: "citizen",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getCitizenProfile();
      setProfile(data);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCitizenProfile(profile);
      toast.success("Citizen profile updated successfully!");
    } catch {
      toast.error("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 text-center text-sm text-[var(--color-medium-teal)]">
        Loading profile details...
      </main>
    );
  }

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      <div className="mx-auto max-w-4xl rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Account Management
          </p>
          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Citizen Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Update your contact information, location, and personal emergency dispatch details.
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row gap-6 p-6 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/30">
            <div className="relative">
              <img
                src={profile.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"}
                alt={profile.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md"
              />
              <label className="absolute bottom-0 right-0 rounded-full bg-[var(--color-ocean)] p-2 text-white shadow-sm cursor-pointer hover:bg-[var(--color-deep-ocean)]">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--color-deep-ocean)]">{profile.name}</h2>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ocean)] mt-0.5">
                Role: Registered Citizen
              </p>
              <p className="text-xs text-[var(--color-medium-teal)] mt-1">
                Account ID: {profile.id}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Primary Location / District
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-6 py-3 text-xs font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
