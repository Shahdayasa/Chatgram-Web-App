import { useState } from "react";
import { Login } from "./Login";
import { Register } from "./Register";

export function Auth({ showToast }) {
  const [isRegister, setIsRegister] = useState(false);

  return (
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
  );
}




