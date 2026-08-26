import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { faFaceSmile } from "@fortawesome/free-regular-svg-icons";
export function MessageInput({ onSend }) {
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    onSend(text);
    setText("");
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "YOUR_UPLOAD_PRESET");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Image upload failed");
      }

      const data = await response.json();

      onSend({
        text: "",
        imageUrl: data.secure_url,
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="message-input">
      <button
        type="button"
        className="attach-button"
        onClick={handleImageClick}
        disabled={uploading}
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
      <FontAwesomeIcon className="emoji-icon" icon={faFaceSmile} />{" "}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        hidden
      />

      <input
        type="text"
        placeholder={uploading ? "Uploading image..." : "Message"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={uploading}
      />
      <button type="submit" disabled={uploading}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10.568 9.94977L3.03601 11.2058C2.94942 11.2202 2.86815 11.2572 2.80039 11.313C2.73263 11.3689 2.68077 11.4415 2.65001 11.5238L0.0530096 18.4808C-0.19499 19.1208 0.47401 19.7308 1.08801 19.4238L19.088 10.4238C19.2127 10.3615 19.3175 10.2658 19.3908 10.1472C19.4641 10.0287 19.503 9.89212 19.503 9.75277C19.503 9.61342 19.4641 9.47682 19.3908 9.3583C19.3175 9.23978 19.2127 9.14402 19.088 9.08177L1.08801 0.0817693C0.47401 -0.225231 -0.19499 0.385769 0.0530096 1.02477L2.65101 7.98177C2.68162 8.06418 2.73343 8.13707 2.8012 8.19307C2.86897 8.24908 2.9503 8.28623 3.03701 8.30077L10.569 9.55577C10.6154 9.56389 10.6574 9.58809 10.6876 9.62413C10.7179 9.66016 10.7345 9.70571 10.7345 9.75277C10.7345 9.79983 10.7179 9.84538 10.6876 9.88141C10.6574 9.91745 10.6154 9.94165 10.568 9.94977Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </form>
  );
}
