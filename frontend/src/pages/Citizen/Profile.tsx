import { useEffect, useState, type ChangeEvent } from "react";
import { User, Mail, Phone, MapPin, Camera, Save } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../hooks/useAuth";
import {
  getCitizenProfile,
  updateCitizenProfile,
} from "../../services/userService";
import type { CitizenUserProfile } from "../../types/user";

export default function CitizenProfile() {
  const { user, updateUser } = useAuth();

  const [profile, setProfile] = useState<CitizenUserProfile>({
    id: user?.id || "USR-CITIZEN-01",
    name: user?.name || "Citizen User",
    email: user?.email || "citizen@jaldrishti.in",
    phone: "+91 98765 12345",
    location: "Monitored Area",
    photoUrl:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
    role: "citizen",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch citizen profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      try {
        const data = await getCitizenProfile();
        if (user?.name) data.name = data.name || user.name;
        if (user?.email) data.email = data.email || user.email;
        setProfile(data);
      } catch {
        toast.error("Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Handle profile photo selection
  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setProfile((prev) => ({
        ...prev,
        photoUrl: reader.result as string,
      }));
    };

    reader.readAsDataURL(file);
  };

  // Save profile
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSaving(true);

    try {
      const updated = await updateCitizenProfile(profile);
      updateUser({ name: updated.name, email: updated.email });
      toast.success("Citizen profile updated successfully!");
    } catch {
      toast.error("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen p-8 text-center text-sm text-(--color-medium-teal)">
        Loading profile details...
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 text-(--color-dark-teal)">
      <div className="mx-auto max-w-4xl rounded-4xl border border-[rgba(53,98,103,0.16)] bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:p-8">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-(--color-ocean)">
            Account Management
          </p>

          <h1 className="mt-1 text-3xl font-black text-(--color-deep-ocean)">
            Citizen Profile
          </h1>

          <p className="mt-1 text-sm text-(--color-medium-teal)">
            Update your contact information, location, and personal emergency
            dispatch details.
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-6 rounded-3xl border border-[rgba(53,98,103,0.14)] bg-(--color-soft-mint)/30 p-6 sm:flex-row">
            <div className="relative">
              <img
                src={
                  profile.photoUrl ||
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
                }
                alt={profile.name}
                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
              />

              <label
                htmlFor="profile-photo"
                className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-(--color-ocean) p-2 text-white shadow-sm hover:bg-(--color-deep-ocean)"
              >
                <Camera className="h-4 w-4" />

                <input
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h2 className="text-xl font-bold text-(--color-deep-ocean)">
                {profile.name}
              </h2>

              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-(--color-ocean)">
                Role: Registered Citizen
              </p>

              <p className="mt-1 text-xs text-(--color-medium-teal)">
                Account ID: {profile.id}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Full Name */}
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)"
              >
                Full Name
              </label>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                <input
                  id="profile-name"
                  type="text"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="profile-email"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)"
              >
                Email Address
              </label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                <input
                  id="profile-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="profile-phone"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)"
              >
                Phone Number
              </label>

              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                <input
                  id="profile-phone"
                  type="text"
                  value={profile.phone}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="profile-location"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-(--color-medium-teal)"
              >
                Primary Location / District
              </label>

              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-medium-teal)" />

                <input
                  id="profile-location"
                  type="text"
                  value={profile.location}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[rgba(53,98,103,0.2)] bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-(--color-dark-teal) outline-none focus:border-(--color-ocean)"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-2xl bg-(--color-ocean) px-6 py-3 text-xs font-bold text-white transition hover:bg-(--color-deep-ocean) disabled:cursor-not-allowed disabled:opacity-50"
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