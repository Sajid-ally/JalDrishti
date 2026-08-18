import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail, FiUser } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import useAuth from "../../hooks/useAuth";
import RoleSelector from "../../components/common/RoleSelector";
import type { UserRole } from "../../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup, loginWithGoogle } = useAuth();

  const [role, setRole] = useState<UserRole>("citizen");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const success = await signup(name, email, password, role);

      if (!success) {
        toast.error("Unable to create account. An account with this email may already exist.");
        return;
      }

      toast.success("Account created successfully!");

      if (role === "government") {
        navigate("/government/dashboard");
      } else {
        navigate("/citizen");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const success = await loginWithGoogle(role);
      if (success) {
        toast.success("Signed in with Google successfully!");
        if (role === "government") {
          navigate("/government/dashboard", { replace: true });
        } else {
          navigate("/citizen", { replace: true });
        }
      } else {
        toast.error("Google registration could not be completed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Google Sign-In failed.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-page-header">
        <span className="auth-page-eyebrow">JOIN THE COMMUNITY</span>
        <h1>Create your account</h1>
        <p>Select your role and sign up to get started.</p>
      </div>

      {/* Role Selector */}
      <RoleSelector selectedRole={role} onSelectRole={setRole} />

      {/* Google Sign-In Quick Button */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isGoogleLoading || isLoading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm shadow-xs hover:bg-slate-50 hover:border-slate-400 transition mb-4 disabled:opacity-60 cursor-pointer"
      >
        <FcGoogle size={20} />
        <span>{isGoogleLoading ? "Connecting with Google..." : "Sign up with Google"}</span>
      </button>

      <div className="auth-divider my-4">
        <span>OR REGISTER WITH EMAIL</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <Input
          id="name"
          label="Full Name"
          type="text"
          placeholder="e.g. Ramesh Kumar"
          value={name}
          onChange={(event) => setName(event.target.value)}
          icon={<FiUser size={18} />}
        />

        <Input
          id="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={<FiMail size={18} />}
        />

        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Create a password (min 6 chars)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          icon={<FiLock size={18} />}
        />

        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          icon={<FiLock size={18} />}
        />

        <Button type="submit" fullWidth loading={isLoading}>
          {!isLoading && (
            <>
              Register as {role === "government" ? "Government Official" : "Citizen"}
              <FiArrowRight size={18} />
            </>
          )}
        </Button>
      </form>

      <p className="auth-switch text-center text-xs text-slate-600 mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-teal-700 font-bold hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}