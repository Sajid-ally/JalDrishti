import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiLock, FiMail } from "react-icons/fi";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { requestPasswordReset, resetUserPassword } from "../../services/authService";
import useAuth from "../../hooks/useAuth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<"verify_email" | "enter_new_password" | "success">("verify_email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestPasswordReset(email);
      toast.success(res.message || "Account verified. Please set your new password.");
      setStep("enter_new_password");
    } catch (err: any) {
      toast.error(err?.message || "Failed to initialize password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { user: updatedUser } = await resetUserPassword(email, newPassword);
      toast.success("Password reset successfully! Logged in as " + updatedUser.name);
      setStep("success");
      setTimeout(() => {
        if (updatedUser.role === "government") {
          navigate("/government/dashboard", { replace: true });
        } else {
          navigate("/citizen", { replace: true });
        }
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Password reset failed. Please check your details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-page-header">
        <span className="auth-page-eyebrow">ACCOUNT RECOVERY</span>
        <h1>Reset Your Password</h1>
        <p>
          {step === "verify_email"
            ? "Enter your registered email address to verify your account."
            : step === "enter_new_password"
            ? `Choose a secure new password for ${email}.`
            : "Your password has been updated in MongoDB Atlas."}
        </p>
      </div>

      {step === "success" ? (
        <div className="auth-success text-center py-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <FiCheckCircle size={32} />
          </div>
          <h2 className="text-lg font-bold text-emerald-950 mb-2">Password Reset Complete</h2>
          <p className="text-xs text-slate-600 mb-6">
            Redirecting to your dashboard...
          </p>
          <Button
            type="button"
            fullWidth
            onClick={() => navigate(user?.role === "government" ? "/government/dashboard" : "/citizen")}
          >
            Go to Dashboard Now
          </Button>
        </div>
      ) : step === "enter_new_password" ? (
        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 mb-2 font-medium">
            Account: <strong>{email}</strong>
          </div>

          <Input
            id="newPassword"
            label="New Password"
            type="password"
            placeholder="Min. 6 characters"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            icon={<FiLock size={18} />}
          />

          <Input
            id="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            icon={<FiLock size={18} />}
          />

          <Button type="submit" fullWidth loading={isLoading}>
            {!isLoading && (
              <>
                Update & Reset Password
                <FiArrowRight size={18} />
              </>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setStep("verify_email")}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 mt-2"
          >
            ← Change email address
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleVerifyEmail}>
          <Input
            id="email"
            label="Registered Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<FiMail size={18} />}
          />

          <Button type="submit" fullWidth loading={isLoading}>
            {!isLoading && (
              <>
                Verify Account & Continue
                <FiArrowRight size={18} />
              </>
            )}
          </Button>

          <div className="auth-switch text-center text-xs text-slate-600 mt-6">
            <Link to="/login" className="inline-flex items-center gap-1 text-teal-700 font-bold hover:underline">
              <FiArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}