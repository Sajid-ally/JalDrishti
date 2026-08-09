import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import RoleSelector from "../../components/common/RoleSelector";
import useAuth from "../../hooks/useAuth";
import type { UserRole } from "../../context/AuthContext";

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [role, setRole] = useState<UserRole>("citizen");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (!email || !password) {
            toast.error("Please enter your email and password.");
            return;
        }

        setIsLoading(true);

        try {
            const success = await login(email, password, role);

            if (!success) {
                toast.error("Invalid login details.");
                return;
            }

            toast.success("Welcome back!");

            // Route based on selected role
            if (role === "government") {
                navigate("/government/dashboard");
            } else {
                navigate("/citizen");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-page-header">
                <span className="auth-page-eyebrow">
                    WELCOME BACK
                </span>

                <h1>Login to CoastalEye</h1>

                <p>
                    Select your role and sign in to continue.
                </p>
            </div>

            {/* Role Selector */}
            <RoleSelector
                selectedRole={role}
                onSelectRole={setRole}
            />

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

                <Input
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    icon={<FiLock size={18} />}
                />

                <div className="auth-form-options">
                    <label className="remember-me">
                        <input type="checkbox" />
                        <span>Remember me</span>
                    </label>

                    <Link to="/forgot-password">
                        Forgot password?
                    </Link>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    loading={isLoading}
                >
                    {!isLoading && (
                        <>
                            Login as {role === "government" ? "Government Official" : "Citizen"}
                            <FiArrowRight size={18} />
                        </>
                    )}
                </Button>
            </form>

            <div className="auth-divider">
                <span>OR</span>
            </div>

            <p className="auth-switch">
                Don't have an account?{" "}
                <Link to="/signup">
                    Create one
                </Link>
            </p>
        </AuthLayout>
    );
}