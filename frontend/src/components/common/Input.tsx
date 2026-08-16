import type {
    InputHTMLAttributes,
    ReactNode,
} from "react";

interface InputProps
    extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: ReactNode;
}

export default function Input({
    label,
    error,
    icon,
    className = "",
    id,
    ...props
}: InputProps) {
    return (
        <div className="input-group">
            {label && (
                <label htmlFor={id} className="input-label">
                    {label}
                </label>
            )}

            <div className="input-wrapper">
                {icon && (
                    <span className="input-icon">
                        {icon}
                    </span>
                )}

                <input
                    id={id}
                    className={`input-field ${icon ? "input-with-icon" : ""
                        } ${error ? "input-error" : ""} ${className}`}
                    {...props}
                />
            </div>

            {error && (
                <span className="input-error-message">
                    {error}
                </span>
            )}
        </div>
    );
}