import { useRef, useState } from "react";
import {
    FiUploadCloud,
    FiX,
    FiImage,
} from "react-icons/fi";

import {
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE,
} from "../../utils/constants";

import {
    isValidFileSize,
    isValidFileType,
} from "../../utils/helpers";

interface UploadBoxProps {
    onFileSelect?: (file: File | null) => void;
    accept?: string;
    maxSize?: number;
}

export default function UploadBox({
    onFileSelect,
    accept = "image/*",
    maxSize = MAX_FILE_SIZE,
}: UploadBoxProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const [selectedFile, setSelectedFile] =
        useState<File | null>(null);

    const [preview, setPreview] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string>("");

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setError("");

        if (!isValidFileType(file, ALLOWED_FILE_TYPES)) {
            setError(
                "Please upload a JPG, PNG, or WebP image."
            );
            return;
        }

        if (!isValidFileSize(file, maxSize)) {
            setError(
                "File size must be less than 5 MB."
            );
            return;
        }

        setSelectedFile(file);

        const previewUrl = URL.createObjectURL(file);
        setPreview(previewUrl);

        onFileSelect?.(file);
    };

    const handleRemove = () => {
        setSelectedFile(null);
        setPreview(null);
        setError("");

        if (inputRef.current) {
            inputRef.current.value = "";
        }

        onFileSelect?.(null);
    };

    const handleUploadClick = () => {
        inputRef.current?.click();
    };

    return (
        <div className="upload-box">
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                hidden
            />

            {!selectedFile ? (
                <button
                    type="button"
                    className="upload-area"
                    onClick={handleUploadClick}
                >
                    <FiUploadCloud
                        size={42}
                        className="upload-icon"
                    />

                    <h3>Upload Evidence</h3>

                    <p>
                        Click to upload an image of the issue
                    </p>

                    <span>
                        JPG, PNG or WebP • Maximum 5 MB
                    </span>
                </button>
            ) : (
                <div className="upload-preview">
                    {preview && (
                        <div className="preview-image-container">
                            <img
                                src={preview}
                                alt="Selected evidence"
                                className="preview-image"
                            />
                        </div>
                    )}

                    <div className="preview-info">
                        <FiImage size={20} />

                        <div>
                            <p className="file-name">
                                {selectedFile.name}
                            </p>

                            <span>
                                {(selectedFile.size / 1024 / 1024).toFixed(
                                    2
                                )}{" "}
                                MB
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="remove-file-button"
                        onClick={handleRemove}
                        aria-label="Remove selected file"
                    >
                        <FiX size={20} />
                    </button>
                </div>
            )}

            {error && (
                <p className="upload-error">
                    {error}
                </p>
            )}
        </div>
    );
}