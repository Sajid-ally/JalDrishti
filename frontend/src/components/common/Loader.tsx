interface LoaderProps {
    size?: "small" | "medium" | "large";
    text?: string;
    fullScreen?: boolean;
}

export default function Loader({
    size = "medium",
    text,
    fullScreen = false,
}: LoaderProps) {
    return (
        <div
            className={`loader-container ${fullScreen ? "loader-fullscreen" : ""
                }`}
        >
            <div className={`loader loader-${size}`} />

            {text && (
                <p className="loader-text">
                    {text}
                </p>
            )}
        </div>
    );
}