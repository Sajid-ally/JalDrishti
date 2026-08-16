import { useNavigate } from "react-router-dom";
import {
    FiArrowRight,
    FiMapPin,
    FiShield,
    FiUsers,
} from "react-icons/fi";

import Button from "../../components/common/Button";
import useAuth from "../../hooks/useAuth";
import { APP_NAME, APP_TAGLINE } from "../../utils/constants";

export default function Landing() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    const handleReportClick = () => {
        if (isAuthenticated) {
            navigate("/citizen/report");
        } else {
            navigate("/login", { state: { from: { pathname: "/citizen/report" } } });
        }
    };

    const handleTrackClick = () => {
        if (isAuthenticated) {
            navigate("/citizen/track-report");
        } else {
            navigate("/login", { state: { from: { pathname: "/citizen/track-report" } } });
        }
    };

    return (
        <div className="landing-page">
            {/* ================= HERO ================= */}

            <section className="landing-hero">
                <nav className="landing-navbar">
                    <div className="landing-logo">
                        <span className="landing-logo-mark">
                            C
                        </span>

                        <span className="landing-logo-text">
                            {APP_NAME}
                        </span>
                    </div>

                    <div className="landing-nav-actions">
                        <Button
                            variant="ghost"
                            onClick={() => navigate("/login")}
                        >
                            Login
                        </Button>

                        <Button
                            variant="primary"
                            onClick={() => navigate("/signup")}
                        >
                            Get Started
                        </Button>
                    </div>
                </nav>

                <div className="landing-hero-content">
                    <div className="landing-hero-text">
                        <span className="landing-eyebrow">
                            COMMUNITY • ACTION • CHANGE
                        </span>

                        <h1>
                            See it.
                            <br />
                            <span>Report it.</span>
                            <br />
                            Improve it.
                        </h1>

                        <p>
                            {APP_TAGLINE}
                        </p>

                        <div className="landing-hero-actions">
                            <Button
                                variant="primary"
                                onClick={handleReportClick}
                            >
                                Report an Issue
                                <FiArrowRight size={18} />
                            </Button>

                            <Button
                                variant="outline"
                                onClick={handleTrackClick}
                            >
                                Track a Report
                            </Button>
                        </div>
                    </div>

                    <div className="landing-hero-visual">
                        <div className="hero-circle hero-circle-one" />
                        <div className="hero-circle hero-circle-two" />

                        <div className="hero-eye-card">
                            <div className="hero-eye-icon">
                                👁
                            </div>

                            <h3>
                                Your voice
                                <br />
                                matters.
                            </h3>

                            <p>
                                Together, we can make
                                communities better.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= FEATURES ================= */}

            <section className="landing-features">
                <div className="landing-section-heading">
                    <span>HOW IT WORKS</span>

                    <h2>
                        From noticing
                        <br />
                        to solving.
                    </h2>
                </div>

                <div className="landing-feature-grid">
                    <div className="landing-feature-card">
                        <div className="feature-icon">
                            <FiMapPin size={24} />
                        </div>

                        <span>01</span>

                        <h3>Spot an issue</h3>

                        <p>
                            Notice a civic problem in your
                            neighborhood? Capture it and share
                            the location.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="feature-icon">
                            <FiUsers size={24} />
                        </div>

                        <span>02</span>

                        <h3>Report it</h3>

                        <p>
                            Submit your report with photos,
                            location, category and details.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="feature-icon">
                            <FiShield size={24} />
                        </div>

                        <span>03</span>

                        <h3>Track progress</h3>

                        <p>
                            Follow your report from submission
                            to resolution and stay informed.
                        </p>
                    </div>
                </div>
            </section>

            {/* ================= CTA ================= */}

            <section className="landing-cta">
                <div>
                    <span>READY TO MAKE A DIFFERENCE?</span>

                    <h2>
                        Your community
                        <br />
                        needs your eyes.
                    </h2>
                </div>

                <Button
                    variant="primary"
                    onClick={() => navigate("/signup")}
                >
                    Join JalDrishti
                    <FiArrowRight size={18} />
                </Button>
            </section>

            {/* ================= FOOTER ================= */}

            <footer className="landing-footer">
                <span>
                    © {new Date().getFullYear()} {APP_NAME}
                </span>

                <span>
                    See it. Report it. Improve it.
                </span>
            </footer>
        </div>
    );
}