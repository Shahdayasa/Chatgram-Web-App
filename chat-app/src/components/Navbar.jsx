import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";

import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSquarePlus } from "@fortawesome/free-regular-svg-icons";
import {
  faMagnifyingGlass,
  faXmark,
  faPen,
  faCheck,
  faUserGroup,
  faArrowLeft,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";

export function Navbar({ searchTerm, setSearchTerm, onSelectUser }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState("");

  const [avatar, setAvatar] = useState("");
  const [userName, setUserName] = useState("");

  const [editingName, setEditingName] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [description, setDescription] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [savingDescription, setSavingDescription] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [phone, setPhone] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [contactsMode, setContactsMode] = useState("list");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
const [groupAvatar, setGroupAvatar] = useState(null);
const [groupAvatarPreview, setGroupAvatarPreview] = useState("");
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "",
  });

  const avatarInputRef = useRef(null);
const groupAvatarInputRef = useRef(null);
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

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();

          setAvatar(userData.avatar || "");
          setUserName(userData.name || "");
          setNewUserName(userData.name || "");
          setPhone(userData.phone || "");
          setNewPhone(userData.phone || "");
          setDescription(userData.description || "");

          setNewDescription(userData.description || "");
        }
      },
      (error) => {
        console.error("Error loading Navbar user:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file.", "error");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5 MB.", "error");
      e.target.value = "";
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      showToast("You must be logged in.", "error");
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
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      const newAvatarUrl = data.secure_url;

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          avatar: newAvatarUrl,
        },
        {
          merge: true,
        },
      );

      showToast("Profile picture updated successfully!", "success");
    } catch (error) {
      console.error("Error changing avatar:", error);

      showToast("Failed to update profile picture.", "error");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleEditName = () => {
    setNewUserName(userName);
    setEditingName(true);
  };

  const handleSaveName = async () => {
    const currentUser = auth.currentUser;

    const trimmedName = newUserName.trim();

    if (!currentUser) {
      showToast("You must be logged in.", "error");
      return;
    }

    if (!trimmedName) {
      showToast("Name cannot be empty.", "error");
      return;
    }

    if (trimmedName.length < 2) {
      showToast("Name must contain at least 2 characters.", "error");
      return;
    }

    try {
      setSavingName(true);

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          name: trimmedName,
        },
        {
          merge: true,
        },
      );

      setUserName(trimmedName);
      setNewUserName(trimmedName);
      setEditingName(false);

      showToast("Username updated successfully!", "success");
    } catch (error) {
      console.error("Error updating username:", error);

      showToast("Failed to update username.", "error");
    } finally {
      setSavingName(false);
    }
  };

  const handleEditDescription = () => {
    setNewDescription(description);
    setEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showToast("Ypu must be logged in.", "error");
      return;
    }

    const trimmedDescription = newDescription.trim();

    if (trimmedDescription.length > 100) {
      showToast("Description must be less than 100 characters.", "error");
      return;
    }

    try {
      setSavingDescription(true);

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          description: trimmedDescription,
        },
        {
          merge: true,
        },
      );
      setDescription(trimmedDescription);
      setNewDescription(trimmedDescription);
      setEditingDescription(false);

      showToast("Description updated successfully!", "success");
    } catch (error) {
      console.log("error updating description:", error);

      showToast("Faild to update description.", "error");
    } finally {
      setSavingDescription(false);
    }
  };
  const handleEditPhone = () => {
    setNewPhone(phone);
    setEditingPhone(true);
  };

  const handleSavePhone = async () => {
    const currentUser = auth.currentUser;
    const trimmedPhone = newPhone.trim();

    if (!currentUser) {
      showToast("You must be logged in.", "error");
      return;
    }

    if (!trimmedPhone) {
      showToast("Phone number cannot be empty.", "error");
      return;
    }

    if (!/^[0-9+\-\s()]{7,20}$/.test(trimmedPhone)) {
      showToast("Please enter a valid phone number.", "error");
      return;
    }

    try {
      setSavingPhone(true);

      await setDoc(
        doc(db, "users", currentUser.uid),
        { phone: trimmedPhone },
        { merge: true },
      );

      setPhone(trimmedPhone);
      setNewPhone(trimmedPhone);
      setEditingPhone(false);

      showToast("Phone number updated successfully!", "success");
    } catch (error) {
      console.error("Error updating phone number:", error);
      showToast("Failed to update phone number.", "error");
    } finally {
      setSavingPhone(false);
    }
  };
  const handleAddContact = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        showToast("You must be logged in.", "error");
        return;
      }

      setLoadingContacts(true);

      const usersSnapshot = await getDocs(collection(db, "users"));

      const users = usersSnapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
        }))
        .filter(
          (user) => user.id !== currentUser.uid && user.name && user.email,
        );

      setContacts(users);
      setShowContacts(true);
      setShowMenu(false);
    } catch (error) {
      console.error("Error loading contacts:", error);

      showToast("Failed to load contacts.", "error");
    } finally {
      setLoadingContacts(false);
    }
  };

const closeContactsModal = () => {
  setShowContacts(false);
  setContactSearch("");
  setContactsMode("list");
  setSelectedMembers([]);
  setGroupName("");
  /* ==== NEW ==== */
  setGroupAvatar(null);
  setGroupAvatarPreview("");
};

const handleGroupAvatarChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please choose an image file.", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("Image must be less than 5 MB.", "error");
    return;
  }

  setGroupAvatar(file);
  setGroupAvatarPreview(URL.createObjectURL(file));
};

const toggleMember = (contact) => {
  setSelectedMembers((prev) =>
    prev.some((m) => m.id === contact.id)
      ? prev.filter((m) => m.id !== contact.id)
      : [...prev, contact],
  );
};

const handleCreateGroup = async () => {
  const currentUser = auth.currentUser;
  const trimmedName = groupName.trim();

  if (!currentUser) {
    showToast("You must be logged in.", "error");
    return;
  }

  if (!trimmedName) {
    showToast("Group name cannot be empty.", "error");
    return;
  }

  if (selectedMembers.length === 0) {
    showToast("Select at least one member.", "error");
    return;
  }

  try {
    setCreatingGroup(true);

    let groupAvatarUrl = "";

    if (groupAvatar) {
      const formData = new FormData();
      formData.append("file", groupAvatar);
      formData.append("upload_preset", "chat_avatars");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/zhycdkaz/image/upload",
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      groupAvatarUrl = data.secure_url;
    }

    const groupRef = doc(collection(db, "groups"));
    const memberIds = [
      currentUser.uid,
      ...selectedMembers.map((m) => m.uid || m.id),
    ];

    await setDoc(groupRef, {
      name: trimmedName,
      avatar: groupAvatarUrl,
      members: memberIds,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
    });

    showToast("Group created successfully!", "success");
    closeContactsModal();
  } catch (error) {
    console.error("Error creating group:", error);
    showToast("Failed to create group.", "error");
  } finally {
    setCreatingGroup(false);
  }
};
  const filteredContacts = contacts.filter((contact) => {
    const search = contactSearch.toLowerCase().trim();

    if (!search) return true;

    const name = contact.name?.toLowerCase() || "";
    const email = contact.email?.toLowerCase() || "";

    return name.includes(search) || email.includes(search);
  });

  const handleSelectContact = (contact) => {
    onSelectUser(contact);

    setShowContacts(false);
    setContactSearch("");
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
          },
        );
      } catch (error) {
        console.error("Error setting user offline:", error);
      }
    }

    try {
      await signOut(auth);

      setShowLogoutConfirm(false);
      setShowMenu(false);
      setShowContacts(false);
      setContactSearch("");
    } catch (error) {
      console.error("Error logging out:", error);

      showToast("Failed to log out.", "error");
    }
  };

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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </nav>

      {showMenu && (
        <>
          <div
            className="side-nav-overlay"
            onClick={() => setShowMenu(false)}
          />

          <aside className="side-nav">
            <div className="side-nav-header">
              <h2>WhatsApp</h2>

              <button
                className="add-contact-icon-button"
                onClick={handleAddContact}
                aria-label="Add new contact"
                title="Add new contact"
              >
                <FontAwesomeIcon icon={faSquarePlus} />
              </button>
            </div>

            <div className="side-nav-user">
              <div
                className="profile-image-wrapper"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatar ? (
                  <img src={avatar} alt="Profile" className="profile-avatar" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {(userName || "U").charAt(0).toUpperCase()}
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
                <div className="user-name-display">
                  <label htmlFor="name">
                    <p>Name</p>
                  </label>

                  <div
                    className={`name-field ${editingName ? "is-editing" : ""}`}
                  >
                    <input
                      id="name"
                      type="text"
                      value={editingName ? newUserName : userName}
                      readOnly={!editingName}
                      disabled={savingName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingName) {
                          handleSaveName();
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={editingName ? handleSaveName : handleEditName}
                      disabled={savingName}
                      aria-label={editingName ? "Save name" : "Edit name"}
                      className="input-edit-button"
                    >
                      <FontAwesomeIcon icon={editingName ? faCheck : faPen} />
                    </button>
                  </div>
                </div>

                <div className="user-phone-display">
                  <label htmlFor="phone">
                    <p>Phone Number</p>
                  </label>

                  <div
                    className={`phone-field ${editingPhone ? "is-editing" : ""}`}
                  >
                    <input
                      id="phone"
                      type="tel"
                      value={editingPhone ? newPhone : phone}
                      placeholder="Add phone number"
                      readOnly={!editingPhone}
                      disabled={savingPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingPhone) {
                          handleSavePhone();
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={editingPhone ? handleSavePhone : handleEditPhone}
                      disabled={savingPhone}
                      aria-label={
                        editingPhone ? "Save phone number" : "Edit phone number"
                      }
                      className="input-edit-button"
                    >
                      <FontAwesomeIcon icon={editingPhone ? faCheck : faPen} />
                    </button>
                  </div>
                </div>

                <div className="user-description-display">
                  <label htmlFor="description">
                    <p>Description</p>
                  </label>

                  <div
                    className={`description-field ${editingDescription ? "is-editing" : ""}`}
                  >
                    <input
                      id="description"
                      type="text"
                      value={editingDescription ? newDescription : description}
                      placeholder="Add description"
                      maxLength={100}
                      readOnly={!editingDescription}
                      disabled={savingDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingDescription) {
                          handleSaveDescription();
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={
                        editingDescription
                          ? handleSaveDescription
                          : handleEditDescription
                      }
                      disabled={savingDescription}
                      aria-label={
                        editingDescription
                          ? "Save description"
                          : "Edit description"
                      }
                      className="input-edit-button"
                    >
                      <FontAwesomeIcon
                        icon={editingDescription ? faCheck : faPen}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

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
    <div className="contacts-modal-overlay" onClick={closeContactsModal} />

    <div className="contacts-modal">
      {contactsMode === "list" && (
        <>
          <div className="contacts-header">
            <div>
              <h2>Add new contact</h2>
              <p>
                {loadingContacts ? "Loading..." : `${contacts.length} users`}
              </p>
            </div>

            <button
              className="contacts-close"
              onClick={closeContactsModal}
              aria-label="Close contacts"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          <div className="contacts-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              type="text"
              placeholder="Search users..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="new-group">
            <FontAwesomeIcon className="group-icon" icon={faUserGroup} />
            <button
              type="button"
              onClick={() => setContactsMode("selectMembers")}
            >
              <span>New group</span>
            </button>
          </div>

          <div className="contacts-list">
            {loadingContacts ? (
              <div className="contacts-loading">Loading contacts...</div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  className="contact-item"
                  onClick={() => handleSelectContact(contact)}
                >
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="contact-avatar"
                    />
                  ) : (
                    <div className="contact-avatar-placeholder">
                      {(contact.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="contact-info">
                    <strong>{contact.name}</strong>
                    <span>{contact.email}</span>
                  </div>

                  {contact.isOnline && (
                    <span className="contact-status online">Online</span>
                  )}
                </button>
              ))
            ) : (
              <div className="no-contacts">
                <div className="no-contacts-icon">
                  <FontAwesomeIcon icon={faMagnifyingGlass} />
                </div>
                <h3>No users found</h3>
                <p>Try another name or email.</p>
              </div>
            )}
          </div>
        </>
      )}

      {contactsMode === "selectMembers" && (
        <>
          <div className="contacts-header">
            <div className="contacts-header-title">
              <button
                type="button"
                className="contacts-back"
                onClick={() => setContactsMode("list")}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <div>
                <h2>Add group members</h2>
                <p>{selectedMembers.length} selected</p>
              </div>
            </div>
          </div>

          <div className="contacts-search">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input
              type="text"
              placeholder="Search users..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              autoFocus
            />
          </div>

          {selectedMembers.length > 0 && (
            <div className="selected-members-chips">
              {selectedMembers.map((m) => (
                <div key={m.id} className="selected-member-chip">
                  <span>{m.name}</span>
                  <button type="button" onClick={() => toggleMember(m)}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="contacts-list">
            {filteredContacts.map((contact) => {
              const isSelected = selectedMembers.some(
                (m) => m.id === contact.id,
              );

              return (
                <button
                  key={contact.id}
                  type="button"
                  className="contact-item"
                  onClick={() => toggleMember(contact)}
                >
                  {contact.avatar ? (
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="contact-avatar"
                    />
                  ) : (
                    <div className="contact-avatar-placeholder">
                      {(contact.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="contact-info">
                    <strong>{contact.name}</strong>
                    <span>{contact.email}</span>
                  </div>

                  <div
                    className={`contact-checkbox ${isSelected ? "checked" : ""}`}
                  >
                    {isSelected && <FontAwesomeIcon icon={faCheck} />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="floating-next-button"
            disabled={selectedMembers.length === 0}
            onClick={() => setContactsMode("groupDetails")}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </>
      )}

      {contactsMode === "groupDetails" && (
        <>
          <div className="contacts-header">
            <div className="contacts-header-title">
              <button
                type="button"
                className="contacts-back"
                onClick={() => setContactsMode("selectMembers")}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <div>
                <h2>New group</h2>
              </div>
            </div>
          </div>
<div className="group-details-body">
  <div
    className="group-avatar-placeholder"
    onClick={() => groupAvatarInputRef.current?.click()}
    style={{ cursor: "pointer", overflow: "hidden", position: "relative" }}
  >
    {groupAvatarPreview ? (
      <img
        src={groupAvatarPreview}
        alt="Group avatar"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    ) : (
      <FontAwesomeIcon icon={faUserGroup} />
    )}

    <div className="avatar-hover-overlay">
      <FontAwesomeIcon icon={faPen} style={{ color: "#fff", fontSize: 18 }} />
    </div>
  </div>

  <input
    ref={groupAvatarInputRef}
    type="file"
    accept="image/*"
    onChange={handleGroupAvatarChange}
    hidden
  />

  <input
    type="text"
    className="group-name-input"
    placeholder="Group name"
    value={groupName}
    onChange={(e) => setGroupName(e.target.value)}
    maxLength={50}
    autoFocus
  />

  <p className="group-members-summary">
    {selectedMembers.length} member
    {selectedMembers.length !== 1 ? "s" : ""}:{" "}
    {selectedMembers.map((m) => m.name).join(", ")}
  </p>
</div>
          <button
            type="button"
            className="floating-next-button"
            disabled={!groupName.trim() || creatingGroup}
            onClick={handleCreateGroup}
          >
            <FontAwesomeIcon icon={faCheck} />
          </button>
        </>
      )}
    </div>
  </>
)}

      {showLogoutConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>Log out?</h3>

            <p>Are you sure you want to log out?</p>

            <div className="confirm-actions">
              <button
                className="cancel-button"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>

              <button className="confirm-logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
