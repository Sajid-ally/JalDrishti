import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import RoleSelector from "../../components/common/RoleSelector";
import useAuth from "../../hooks/useAuth";
import type { UserRole } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();

  const [role, setRole] = useState<UserRole>("citizen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password, role);

      if (!success) {
        toast.error("Incorrect email or password. Please check your credentials or reset password.");
        return;
      }

      toast.success("Welcome back to JalDrishti!");

      const fromPath =
        typeof location.state?.from === "string"
          ? location.state.from
          : location.state?.from?.pathname;

      if (fromPath && !fromPath.startsWith("/login") && !fromPath.startsWith("/signup")) {
        navigate(fromPath, { replace: true });
      } else if (role === "government") {
        navigate("/government/dashboard", { replace: true });
      } else {
        navigate("/citizen", { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const success = await loginWithGoogle(role);
      if (success) {
        toast.success("Google Sign-In successful!");
        if (role === "government") {
          navigate("/government/dashboard", { replace: true });
        } else {
          navigate("/citizen", { replace: true });
        }
      } else {
        toast.error("Google authentication could not be completed.");
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
        <span className="auth-page-eyebrow">WELCOME BACK</span>
        <h1>Login to JalDrishti</h1>
        <p>Select your role and sign in to continue.</p>
      </div>

      {/* Role Selector */}
      <RoleSelector selectedRole={role} onSelectRole={setRole} />

      {/* Quick Demo Access Bar for Prototype */}
      <div className="mb-4 p-3 rounded-2xl bg-teal-50/90 border border-teal-200/80 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-teal-900 flex items-center gap-1.5">
            ⚡ Prototype Fast Access
          </span>
          <span className="text-[10px] text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full font-semibold">
            1-Click Fill
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setRole("government");
              setEmail("official@jaldrishti.gov.in");
              setPassword("password123");
            }}
            className={`py-1.5 px-2.5 rounded-xl border text-center font-medium transition cursor-pointer text-xs ${
              role === "government"
                ? "bg-teal-700 text-white border-teal-800 shadow-xs"
                : "bg-white text-teal-800 border-teal-200 hover:bg-teal-100/60"
            }`}
          >
            🏛️ Gov Official Demo
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("citizen");
              setEmail("citizen@jaldrishti.in");
              setPassword("password123");
            }}
            className={`py-1.5 px-2.5 rounded-xl border text-center font-medium transition cursor-pointer text-xs ${
              role === "citizen"
                ? "bg-teal-700 text-white border-teal-800 shadow-xs"
                : "bg-white text-teal-800 border-teal-200 hover:bg-teal-100/60"
            }`}
          >
            👤 Citizen Demo
          </button>
        </div>
      </div>

      {/* Google Sign-In Quick Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm shadow-xs hover:bg-slate-50 hover:border-slate-400 transition mb-4 disabled:opacity-60 cursor-pointer"
      >
        <FcGoogle size={20} />
        <span>{isGoogleLoading ? "Connecting with Google..." : "Continue with Google"}</span>
      </button>

      <div className="auth-divider my-4">
        <span>OR SIGN IN WITH CREDENTIALS</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
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
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          icon={<FiLock size={18} />}
        />

        <div className="auth-form-options flex items-center justify-between mt-2 mb-4 text-xs">
          <label className="remember-me flex items-center gap-1.5 cursor-pointer text-slate-600">
            <input type="checkbox" className="rounded" />
            <span>Remember me</span>
          </label>

          <Link to="/forgot-password" className="text-teal-700 hover:text-teal-900 font-semibold">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isLoading}>
          {!isLoading && (
            <>
              Login as {role === "government" ? "Government Official" : "Citizen"}
              <FiArrowRight size={18} />
            </>
          )}
        </Button>
      </form>

      <p className="auth-switch text-center text-xs text-slate-600 mt-6">
        Don't have an account?{" "}
        <Link to="/signup" className="text-teal-700 font-bold hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}