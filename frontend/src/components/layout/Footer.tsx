import { APP_NAME } from "../../utils/constants";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-brand">
                    © {currentYear} {APP_NAME}
                </p>

                <p className="footer-text">
                    See it. Report it. Improve it.
                </p>

                <div className="footer-links">
                    <a href="#">Privacy</a>
                    <a href="#">Terms</a>
                    <a href="#">Help</a>
                </div>
            </div>
        </footer>
    );
}