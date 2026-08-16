import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
export function Register ({ showToast }) {
  const [name,setName] = useState ("");
  const [email,setEmail] = useState("");
  const[password,setPassword]=useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    if(!name || !email || !password) {
      showToast("Please fill in all field", "error");
      return;
    }

    try{
      const userCredential = await createUserWithEmailAndPassword (
        auth,
        email,
        password
      );
   const user = userCredential.user;

   await setDoc (doc(db,"users",user.id), {
    name,
    email:user.email,
    id:user.id,
   });
   showToast ("Account created successfully! 🎉",
        "success");
        setName("");
        setPassword("");
        setEmail("");
    }

    catch (err) {
      console.error(err);

      if(err.code === "auth/email-already-in-use") {
        showToast (
          "This email is already registerd",
          "error"
        );
      }
      if(err.code === "auth/invalid-email") {
        showToast("Please enter a valid email",
          "error"
        );
        }

        else if (err.code === "auth/weak-password"){
              showToast("Password should be at least 6 characters",
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
      <>
    <div className="create-account">
      <form onSubmit={handleRegister}>
    <div className="auth-icon">
     <FontAwesomeIcon icon={faUser} /> 
      </div>
    <h2>Create Account</h2>
      
   
    <div className="name">
      <input 
      type="text"
      value={name}
      placeholder="Name..."
      onChange={(e) => 
        setName(e.target.value)
      }
      />
  </div>
    <div className="email">
              <input 
          type="email"
          value={email}
          placeholder="Email..."
          onChange={(e) => 
            setEmail(e.target.value)
          }
    />
    </div>

        <div className="password">
          <input
            type="password"
            placeholder="Password..."
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />
        </div>

        <button type="submit">
          Create Account
        </button>

      </form>
    </div>
    </>
  );
}
  
