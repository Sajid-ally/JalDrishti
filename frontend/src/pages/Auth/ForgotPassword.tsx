import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiMail } from "react-icons/fi";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    try {
      // Backend password-reset API will be connected later.
      await new Promise((resolve) =>
        setTimeout(resolve, 800)
      );

      setSent(true);
      toast.success("Reset instructions sent.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="auth-page-header">
        <span className="auth-page-eyebrow">
          ACCOUNT RECOVERY
        </span>

        <h1>Forgot your password?</h1>

        <p>
          Enter your registered email and we'll help
          you get back into your account.
        </p>
      </div>

      {sent ? (
        <div className="auth-success">
          <div className="auth-success-icon">
            ✓
          </div>

          <h2>Check your email</h2>

          <p>
            If an account exists for{" "}
            <strong>{email}</strong>, you'll receive
            instructions to reset your password.
          </p>

          <Link to="/login">
            <Button variant="outline" fullWidth>
              <FiArrowLeft size={18} />
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <Input
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            icon={<FiMail size={18} />}
          />

          <Button
            type="submit"
            fullWidth
            loading={isLoading}
          >
            Send Reset Instructions

            {!isLoading && (
              <FiArrowRight size={18} />
            )}
          </Button>
        </form>
      )}

      {!sent && (
        <p className="auth-switch">
          <Link to="/login">
            <FiArrowLeft size={15} />
            Back to Login
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}