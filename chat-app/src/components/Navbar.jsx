import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";

import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquarePlus } from "@fortawesome/free-regular-svg-icons";
import {
  faMagnifyingGlass,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

export function Navbar({
  searchTerm,
  setSearchTerm,
  onSelectUser,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Contacts
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  // Current user
  const [avatar, setAvatar] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarInputRef = useRef(null);

  /* =========================
     CURRENT USER
  ========================= */

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No current user found.");
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();

          console.log("NAVBAR USER DATA:", userData);

          setAvatar(userData.avatar || "");
          setUserName(userData.name || "");
          setUserEmail(
            userData.email || currentUser.email || ""
          );
        }
      },
      (error) => {
        console.error(
          "Error loading Navbar user:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================
     CHANGE AVATAR
  ========================= */

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5 MB.");
      e.target.value = "";
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("You must be logged in.");
      return;
    }

    try {
      setUploadingAvatar(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append("upload_preset", "chat_avatars");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/zhycdkaz/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log("Cloudinary response:", data);

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            "Cloudinary upload failed"
        );
      }

      const newAvatarUrl = data.secure_url;

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          avatar: newAvatarUrl,
        },
        {
          merge: true,
        }
      );

      console.log("Avatar updated successfully!");

      alert(
        "Profile picture updated successfully!"
      );
    } catch (error) {
      console.error(
        "Error changing avatar:",
        error
      );

      alert(
        "Failed to update profile picture."
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  /* =========================
     LOAD ALL CONTACTS
  ========================= */

  const handleAddContact = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("You must be logged in.");
        return;
      }

      setLoadingContacts(true);

      // Get every user from Firestore
      const usersSnapshot = await getDocs(
        collection(db, "users")
      );

      const users = usersSnapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }))
        .filter(
          (user) =>
            user.id !== currentUser.uid &&
            user.name &&
            user.email
        );

      setContacts(users);

      // Open contacts modal
      setShowContacts(true);

      // Close side menu
      setShowMenu(false);
    } catch (error) {
      console.error(
        "Error loading contacts:",
        error
      );

      alert("Failed to load contacts.");
    } finally {
      setLoadingContacts(false);
    }
  };

 

  const filteredContacts = contacts.filter(
    (contact) => {
      const search =
        contactSearch.toLowerCase().trim();

      if (!search) return true;

      const name =
        contact.name?.toLowerCase() || "";

      const email =
        contact.email?.toLowerCase() || "";

      return (
        name.includes(search) ||
        email.includes(search)
      );
    }
  );

 

 const handleSelectContact = (contact) => {
  console.log("Selected contact:", contact);

  // Open this user's chat
  onSelectUser(contact);

  // Close contacts modal
  setShowContacts(false);

  // Clear search
  setContactSearch("");

  // Close side menu
  setShowMenu(false);
};

 
  const handleLogout = async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            isOnline: false,
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        console.error(
          "Error setting user offline:",
          error
        );
      }
    }

    try {
      await signOut(auth);

      setShowLogoutConfirm(false);
      setShowMenu(false);
      setShowContacts(false);
      setContactSearch("");
    } catch (error) {
      console.error(
        "Error logging out:",
        error
      );
    }
  };

  return (
    <>
      

      <nav className="navbar">
        <button
          className="menu-button"
          onClick={() => setShowMenu(true)}
          aria-label="Open menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="3"
              y1="6"
              x2="21"
              y2="6"
              stroke="#707991"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
              stroke="#707991"
              strokeWidth="2"
              strokeLinecap="round"
            />

            <line
              x1="3"
              y1="18"
              x2="21"
              y2="18"
              stroke="#707991"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="search-bar">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="10.5"
              cy="10.5"
              r="6.5"
              stroke="#707991"
              strokeWidth="2"
            />

            <path
              d="M16 16L21 21"
              stroke="#707991"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
          />
        </div>
      </nav>

    

      {showMenu && (
        <>
          <div
            className="side-nav-overlay"
            onClick={() => {
              setShowMenu(false);
            }}
          />

          <aside className="side-nav">
            {/* SIDE MENU HEADER */}

            <div className="side-nav-header">
              <h2>WhatsApp</h2>

              <button
                className="add-contact-icon-button"
                onClick={handleAddContact}
                aria-label="Add new contact"
                title="Add new contact"
              >
                <FontAwesomeIcon
                  icon={faSquarePlus}
                />
              </button>
            </div>

           

            <div className="side-nav-user">
              <div
                className="profile-image-wrapper"
                onClick={() =>
                  avatarInputRef.current?.click()
                }
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="Profile"
                    className="profile-avatar"
                  />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {(userName || userEmail)
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="avatar-hover-overlay">
                  <svg
                    width="70"
                    height="70"
                    viewBox="0 0 70 70"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="14"
                      y="22"
                      width="42"
                      height="32"
                      rx="6"
                      stroke="white"
                      strokeWidth="5"
                    />

                    <circle
                      cx="35"
                      cy="38"
                      r="10"
                      stroke="white"
                      strokeWidth="5"
                    />

                    <path
                      d="M26 22L29 16H41L44 22"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M54 10V22"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />

                    <path
                      d="M48 16H60"
                      stroke="white"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <input
                className="camera"
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                hidden
              />

              <div className="user-info">
                <p>{userName}</p>
              </div>
            </div>

            {/* LOGOUT */}

            <button
              className="side-nav-logout"
              onClick={() => {
                setShowMenu(false);
                setShowLogoutConfirm(true);
              }}
            >
              Logout
            </button>
          </aside>
        </>
      )}

  
      {showContacts && (
        <>
      <div
  className="contacts-modal-overlay"
  onClick={() => {
    setShowContacts(false);
    setContactSearch("");
  }}
/>

          <div className="contacts-modal">
            {/* HEADER */}

            <div className="contacts-header">
              <div>
                <h2>Add new contact</h2>

                <p>
                  {loadingContacts
                    ? "Loading..."
                    : `${contacts.length} users`}
                </p>
              </div>

              <button
                className="contacts-close"
                onClick={() => {
                  setShowContacts(false);
                  setContactSearch("");
                }}
                aria-label="Close contacts"
              >
                <FontAwesomeIcon
                  icon={faXmark}
                />
              </button>
            </div>

            {/* SEARCH */}

            <div className="contacts-search">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
              />

              <input
                type="text"
                placeholder="Search users..."
                value={contactSearch}
                onChange={(e) =>
                  setContactSearch(
                    e.target.value
                  )
                }
                autoFocus
              />
            </div>

            {/* CONTACTS */}

            <div className="contacts-list">
              {loadingContacts ? (
                <div className="contacts-loading">
                  Loading contacts...
                </div>
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map(
                  (contact) => (
                    <button
                      key={contact.id}
                      className="contact-item"
                      onClick={() =>
                        handleSelectContact(
                          contact
                        )
                      }
                    >
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="contact-avatar"
                        />
                      ) : (
                        <div className="contact-avatar-placeholder">
                          {(
                            contact.name ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="contact-info">
                        <strong>
                          {contact.name}
                        </strong>

                        <span>
                          {contact.email}
                        </span>
                      </div>

                      {contact.isOnline && (
                        <span className="contact-status online">
                          Online
                        </span>
                      )}
                    </button>
                  )
                )
              ) : (
                <div className="no-contacts">
                  <div className="no-contacts-icon">
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                    />
                  </div>

                  <h3>
                    No users found
                  </h3>

                  <p>
                    Try another name or email.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    
      {showLogoutConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>Log out?</h3>

            <p>
              Are you sure you want to log out?
            </p>

            <div className="confirm-actions">
              <button
                className="cancel-button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
              >
                Cancel
              </button>

              <button
                className="confirm-logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}