import type { ReactNode } from "react";
import { FiEye } from "react-icons/fi";

import { APP_NAME, APP_TAGLINE } from "../utils/constants";

interface AuthLayoutProps {
    children: ReactNode;
}

export default function AuthLayout({
    children,
}: AuthLayoutProps) {
    return (
        <div className="auth-layout">
            <div className="auth-brand-panel">
                <div className="auth-brand-content">
                    <div className="auth-logo">
                        <span className="auth-logo-mark">
                            <FiEye size={28} />
                        </span>

                        <span className="auth-logo-text">
                            {APP_NAME}
                        </span>
                    </div>

                    <div className="auth-brand-message">
                        <h1>
                            Make your
                            <br />
                            community better.
                        </h1>

                        <p>
                            Report civic issues, track their progress,
                            and help create a better place for everyone.
                        </p>
                    </div>

                    <p className="auth-tagline">
                        {APP_TAGLINE}
                    </p>
                </div>
            </div>

            <div className="auth-form-panel">
                <div className="auth-form-container">
                    {children}
                </div>
            </div>
        </div>
    );
}