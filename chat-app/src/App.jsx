import { useEffect, useState, lazy, Suspense } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Routes, Route, Navigate } from "react-router-dom";

import { auth } from "./firebase/firebase";

import "./App.css";

const Login = lazy(() =>
  import("./pages/Login").then((m) => ({ default: m.Login }))
);
const Register = lazy(() =>
  import("./pages/Register").then((m) => ({ default: m.Register }))
);
const Chat = lazy(() =>
  import("./pages/Chat").then((m) => ({ default: m.Chat }))
);

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

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

  if (authLoading) {
    return <div className="page-loading">Loading....</div>;
  }

  return (
    <>
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          <div className="toast-icon">
            {toast.type === "success" ? "✓" : "×"}
          </div>

          <div className="toast-content">
            <strong>{toast.type === "success" ? "Success" : "Error"}</strong>
            <p>{toast.message}</p>
          </div>
        </div>
      )}

      <Suspense fallback={<div className="page-loading">Loading...</div>}>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/chat" replace />
              ) : (
                <Login showToast={showToast} />
              )
            }
          />

          <Route
            path="/register"
            element={
              user ? (
                <Navigate to="/chat" replace />
              ) : (
                <Register showToast={showToast} />
              )
            }
          />

          <Route
            path="/chat"
            element={user ? <Chat /> : <Navigate to="/login" replace />}
          />

          <Route
            path="*"
            element={<Navigate to={user ? "/chat" : "/login"} replace />}
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;