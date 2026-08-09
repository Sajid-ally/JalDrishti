import type { ReactNode } from "react";
import { FiX } from "react-icons/fi";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: "small" | "medium" | "large";
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = "medium",
}: ModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal modal-${size}`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="modal-header">
                    {title && (
                        <h2 className="modal-title">
                            {title}
                        </h2>
                    )}

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <FiX size={22} />
                    </button>
                </div>

                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );
}