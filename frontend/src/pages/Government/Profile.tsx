import { useState, useEffect, type ChangeEvent } from "react";
import { User, Mail, Phone, Camera, Save, ShieldCheck, Building2, BadgeCheck } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { getGovernmentProfile, updateGovernmentProfile } from "../../services/userService";
import type { GovernmentUserProfile } from "../../types/user";

export default function GovernmentProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<GovernmentUserProfile>({
    id: user?.id || "USR-GOVT-01",
    name: user?.name || "Dr. Rajesh Sharma",
    governmentId: "GOV-OD-8842",
    department: "Coastal Disaster Response Authority (CDRA)",
    designation: "Senior Incident Commander",
    email: user?.email || "r.sharma@cdra.gov.in",
    phone: "+91 94321 00998",
    location: "Bhubaneswar Control Headquarters",
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80",
    role: "government",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await getGovernmentProfile();
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
      await updateGovernmentProfile(profile);
      toast.success("Government official profile updated!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8 text-center text-sm text-[var(--color-medium-teal)]">
        Loading official profile...
      </main>
    );
  }

  return (
    <main className="min-h-screen text-[var(--color-dark-teal)] space-y-6">
      <div className="mx-auto max-w-4xl rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-ocean)]">
            Official Credentials
          </p>
          <h1 className="mt-1 text-3xl font-black text-[var(--color-deep-ocean)]">
            Government Official Profile
          </h1>
          <p className="mt-1 text-sm text-[var(--color-medium-teal)]">
            Official agency record, government ID verification, and responder command details.
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          {/* Official Avatar Banner */}
          <div className="flex flex-col items-center sm:flex-row gap-6 p-6 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-[var(--color-soft-mint)]/30">
            <div className="relative">
              <img
                src={profile.photoUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"}
                alt={profile.name}
                className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md"
              />
              <label className="absolute bottom-0 right-0 rounded-full bg-[var(--color-ocean)] p-2 text-white shadow-sm cursor-pointer hover:bg-[var(--color-deep-ocean)]">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--color-deep-ocean)]">{profile.name}</h2>
                <BadgeCheck className="h-5 w-5 text-[var(--color-ocean)]" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-ocean)]">
                {profile.designation}
              </p>
              <p className="text-xs text-[var(--color-medium-teal)]">
                Govt ID: <strong>{profile.governmentId}</strong> · {profile.department}
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Official Name
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
                Government ID
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  value={profile.governmentId}
                  onChange={(e) => setProfile({ ...profile, governmentId: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Department / Agency
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Designation / Position
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-medium-teal)]" />
                <input
                  type="text"
                  value={profile.designation}
                  onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm text-[var(--color-dark-teal)] outline-none focus:border-[var(--color-ocean)] font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-medium-teal)] mb-1">
                Official Email
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
                Official Contact Phone
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-2xl bg-[var(--color-ocean)] px-6 py-3 text-xs font-bold text-white transition hover:bg-[var(--color-deep-ocean)] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Official Profile"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
