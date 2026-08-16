import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Chat } from "./pages/Chat";

import { auth } from "./firebase/firebase";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  const [isRegister, setIsRegister] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (message, type) => {
    setToast({
      show: true,
      message,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: "",
        type: "",
      });
    }, 4000);
  };

  const closeToast = () => {
    setToast({
      show: false,
      message: "",
      type: "",
    });
  };

  return (
    <>
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === "success" ? "✓" : "×"}
          </div>

          <div className="toast-content">
            <strong>
              {toast.type === "success"
                ? "Success"
                : "Error"}
            </strong>

            <p>{toast.message}</p>
          </div>

          <button
            className="toast-close"
            onClick={closeToast}
          >
            ×
          </button>
        </div>
      )}

      {user ? (
        <Chat />
      ) : (
        <>
          {!isRegister ? (
            <Login
              showToast={showToast}
              onCreateAccount={() => setIsRegister(true)}
            />
          ) : (
            <Register
              showToast={showToast}
              onBackToLogin={() => setIsRegister(false)}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;