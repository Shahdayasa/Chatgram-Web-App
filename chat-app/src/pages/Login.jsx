import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "../firebase/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightToBracket } from "@fortawesome/free-solid-svg-icons";

export function Login({ showToast, onCreateAccount }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLoginValid =
    email.trim() !== "" && password.trim() !== "";

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!isLoginValid) return;

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      showToast("Logged in successfully! 🎉", "success");

      setEmail("");
      setPassword("");

    } catch (error) {
      console.log(error);

      if (error.code === "auth/invalid-credential") {
        showToast(
          "Incorrect email or password",
          "error"
        );
      } 
      else if (error.code === "auth/invalid-email") {
        showToast(
          "Please enter a valid email",
          "error"
        );
      } 
      else {
        showToast(
          "Something went wrong. Please try again.",
          "error"
        );
      }
    }
  };

  return (
    <div className="login-container">

      <form onSubmit={handleLogin}>

        <div className="auth-icon">
          <FontAwesomeIcon icon={faRightToBracket} />
        </div>

        <h2>Log in</h2>

        <input
          type="email"
          placeholder="Email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={!isLoginValid}
        >
          Log in
        </button>

  

        <button
          type="button"
          className="create-new-account"
          onClick={onCreateAccount}
        >
          Create new account
        </button>

      </form>

    </div>
  );
}

