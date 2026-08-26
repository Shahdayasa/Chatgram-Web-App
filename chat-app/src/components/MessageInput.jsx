import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip, faPaperPlane, faXmark } from "@fortawesome/free-solid-svg-icons";

const CLOUD_NAME = "zhycdkaz";
const UPLOAD_PRESET = "chat_avatars";

export function MessageInput({ onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview("");
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadToCloudinary = async (selectedFile) => {
    const isImage = selectedFile.type.startsWith("image/");
    const formData = new FormData();

    formData.append("file", selectedFile);
    formData.append("upload_preset", UPLOAD_PRESET);

    const endpoint = isImage
      ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Upload failed");
    }

    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim() && !file) return;

    if (file) {
      try {
        setUploading(true);

        const url = await uploadToCloudinary(file);
        const isImage = file.type.startsWith("image/");

        onSend({
          text: text.trim(),
          imageUrl: isImage ? url : null,
          fileUrl: isImage ? null : url,
          fileName: isImage ? null : file.name,
          fileType: file.type,
          fileSize: file.size,
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      } finally {
        setUploading(false);
        clearFile();
        setText("");
      }
    } else {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <button type="button" className="attach-icon" onClick={() => fileInputRef.current?.click()}>
        <FontAwesomeIcon icon={faPaperclip} />
      </button>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />

      {file && (
        <div className="message-input-preview">
          {preview ? <img src={preview} alt="preview" /> : <span>{file.name}</span>}
          <button type="button" onClick={clearFile}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      <input
        type="text"
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={uploading}
      />

      <button type="submit" disabled={uploading}>
        <FontAwesomeIcon icon={faPaperPlane} />
      </button>
    </form>
  );
}