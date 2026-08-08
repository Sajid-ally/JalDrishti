import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FiArrowRight,
    FiLock,
    FiMail,
    FiUser,
} from "react-icons/fi";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import useAuth from "../../hooks/useAuth";

export default function Signup() {
    const navigate = useNavigate();
    const { signup } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
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
            toast.error(
                "Password must be at least 6 characters."
            );
            return;
        }

        setIsLoading(true);

        try {
            const success = await signup(
                name,
                email,
                password
            );

            if (!success) {
                toast.error("Unable to create account.");
                return;
            }

            toast.success("Account created successfully!");

            navigate("/citizen/dashboard");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-page-header">
                <span className="auth-page-eyebrow">
                    JOIN THE COMMUNITY
                </span>

                <h1>Create your account</h1>

                <p>
                    Start reporting issues and help improve
                    your community.
                </p>
            </div>

            <form
                className="auth-form"
                onSubmit={handleSubmit}
            >
                <Input
                    id="name"
                    label="Full Name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) =>
                        setName(event.target.value)
                    }
                    icon={<FiUser size={18} />}
                />

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
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) =>
                        setPassword(event.target.value)
                    }
                    icon={<FiLock size={18} />}
                />

                <Input
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) =>
                        setConfirmPassword(event.target.value)
                    }
                    icon={<FiLock size={18} />}
                />

                <Button
                    type="submit"
                    fullWidth
                    loading={isLoading}
                >
                    Create Account

                    {!isLoading && (
                        <FiArrowRight size={18} />
                    )}
                </Button>
            </form>

            <p className="auth-switch">
                Already have an account?{" "}
                <Link to="/login">
                    Login
                </Link>
            </p>
        </AuthLayout>
    );
}