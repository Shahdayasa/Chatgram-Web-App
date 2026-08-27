import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";

export function Register({ showToast }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5 MB", "error");
      return;
    }

    setAvatar(file);

    const imageUrl = URL.createObjectURL(file);
    setAvatarPreview(imageUrl);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !phone) {
      showToast("Please fill in all fields", "error");
      return;
    }

    if (!/^[0-9+\-\s()]{7,20}$/.test(phone.trim())) {
      showToast("Please enter a valid phone number", "error");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      let avatarUrl = "";

      if (avatar) {
        const formData = new FormData();

        formData.append("file", avatar);
        formData.append("upload_preset", "chat_avatars");

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/zhycdkaz/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Cloudinary upload failed");
        }

        avatarUrl = data.secure_url;
      }

      await setDoc(doc(db, "users", user.uid), {
        name,
        email: user.email,
        phone: phone.trim(),
        uid: user.uid,
        avatar: avatarUrl,
      });

      showToast("Account created successfully! 🎉", "success");

      setName("");
      setEmail("");
      setPassword("");
      setAvatar(null);
      setAvatarPreview("");

      navigate("/chat");
    } catch (err) {
      console.error(err);

      if (err.code === "auth/email-already-in-use") {
        showToast("This email is already registered", "error");
      } else if (err.code === "auth/invalid-email") {
        showToast("Please enter a valid email", "error");
      } else if (err.code === "auth/weak-password") {
        showToast("Password should be at least 6 characters", "error");
      } else if (err.message === "Failed to upload avatar") {
        showToast("Account created, but avatar upload failed", "error");
      } else {
        showToast("Something went wrong. Please try again.", "error");
      }
    }
  };

  return (
    <div className="create-account">
      <form onSubmit={handleRegister}>
        <div className="auth-icon">
          <FontAwesomeIcon icon={faWhatsapp} />
        </div>

        <h2>Create Account</h2>

        <div className="avatar-upload">
          <label htmlFor="avatarInput" className="avatar-label">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="avatar-preview"
              />
            ) : (
              <div className="avatar-placeholder">+</div>
            )}
          </label>

          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            hidden
          />

          <p>Choose profile picture</p>
        </div>

        <div className="name">
          <input
            type="text"
            value={name}
            placeholder="Name..."
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="phone">
          <input
            type="tel"
            value={phone}
            placeholder="Phone number..."
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="email">
          <input
            type="email"
            value={email}
            placeholder="Email..."
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="password">
          <input
            type="password"
            placeholder="Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit">Create Account</button>

        <button
          type="button"
          className="back-login"
          onClick={() => navigate("/login")}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
}