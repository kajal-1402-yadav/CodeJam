// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { User, Mail, Lock, Save, X, Trash2, Settings, Shield } from "lucide-react";
// import useAuthContext from "../hooks/useAuthContext";
// import Sidebar from "../components/Sidebar";
// import { updateUserProfile, deleteUserAccount } from "../services/userService";

// const ManageAccount = () => {
//   const { user, dispatch } = useAuthContext();
//   const [formData, setFormData] = useState({
//     username: "",
//     email: "",
//     currentPassword: "",
//     newPassword: "",
//     confirmPassword: "",
//   });
//   const [isEditing, setIsEditing] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState("");
//   const [isLoading, setIsLoading] = useState(false);
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const navigate = useNavigate();

//   // Initialize form with user data
//   useEffect(() => {
//     if (user) {
//       setFormData((prev) => ({
//         ...prev,
//         username: user.username || "",
//         email: user.email || "",
//       }));
//     }
//   }, [user]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleDeleteAccount = async () => {
//     if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
//       return;
//     }

//     setIsDeleting(true);
    
//     const result = await deleteUserAccount();

//     if (result.success) {
//       // Logout user after successful deletion
//       dispatch({ type: 'LOGOUT' });
//       localStorage.removeItem('user');
//       navigate('/login');
//     } else {
//       setError(result.error || 'Failed to delete account');
//       setIsDeleting(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setSuccess("");

//     if (
//       isEditing &&
//       formData.newPassword &&
//       formData.newPassword !== formData.confirmPassword
//     ) {
//       setError("New passwords don't match");
//       return;
//     }

//     setIsLoading(true);
    
//     const result = await updateUserProfile({
//       username: formData.username,
//       email: formData.email,
//       currentPassword: formData.currentPassword,
//       newPassword: formData.newPassword || undefined
//     });

//     if (result.success) {
//       // Update local storage and context with new user data
//       const updatedUser = { ...user, ...result.data };
//       localStorage.setItem("user", JSON.stringify(updatedUser));
//       dispatch({ type: "LOGIN", payload: updatedUser });

//       setSuccess("Profile updated successfully!");
//       setIsEditing(false);
//       setFormData((prev) => ({
//         ...prev,
//         currentPassword: "",
//         newPassword: "",
//         confirmPassword: "",
//       }));
//     } else {
//       setError(result.error || "Failed to update profile");
//     }
    
//     setIsLoading(false);
//   };

//   return (
//     <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
//       <Sidebar />

//       <main className="flex-1 p-8 ml-64">
//         <div className="max-w-4xl mx-auto">
//           {/* Header */}
//           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
//             <div>
//               <h1 className="text-3xl font-bold text-white">Account Settings</h1>
//               <p className="text-gray-400 mt-1">Manage your account information and preferences.</p>
//             </div>
//           </div>

//           <div className="bg-[#1E1E1E]/50 rounded-xl shadow-lg p-8 border border-gray-800 hover:border-[#A78BFA]/50 transition">
//             {/* Profile header with avatar */}
//             <div className="flex items-center space-x-6 mb-8">
//               <div className="w-20 h-20 rounded-full bg-[#A78BFA] flex items-center justify-center text-white font-bold text-2xl">
//                 {formData.username.charAt(0).toUpperCase()}
//               </div>
//               <div>
//                 <h2 className="text-2xl font-bold text-white">{formData.username}</h2>
//                 <p className="text-gray-400">{formData.email}</p>
//                 <div className="flex items-center gap-2 mt-2">
//                   <Shield size={16} className="text-green-400" />
//                   <span className="text-sm text-green-400">Account Active</span>
//                 </div>
//               </div>
//             </div>

//             {/* Alerts */}
//             {error && (
//               <div className="flex items-center gap-3 bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg mb-6">
//                 <span className="text-xl">⚠️</span>
//                 <span>{error}</span>
//               </div>
//             )}

//             {success && (
//               <div className="flex items-center gap-3 bg-green-500/20 border border-green-500 text-green-100 p-4 rounded-lg mb-6">
//                 <span className="text-xl">✅</span>
//                 <span>{success}</span>
//               </div>
//             )}

//             {/* Form */}
//             <form onSubmit={handleSubmit} className="space-y-8">
//               {/* Profile Information Section */}
//               <div className="space-y-6">
//                 <div className="flex items-center gap-3 mb-6">
//                   <User className="text-[#A78BFA]" size={20} />
//                   <h3 className="text-xl font-semibold text-white">Profile Information</h3>
//                 </div>
                
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                   <div className="space-y-2">
//                     <label
//                       htmlFor="username"
//                       className="block text-sm font-medium text-gray-300"
//                     >
//                       Username
//                     </label>
//                     <div className="relative">
//                       <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
//                       <input
//                         type="text"
//                         id="username"
//                         name="username"
//                         value={formData.username}
//                         onChange={handleChange}
//                         disabled={!isEditing}
//                         className="w-full pl-10 pr-4 py-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                       />
//                     </div>
//                   </div>

//                   <div className="space-y-2">
//                     <label
//                       htmlFor="email"
//                       className="block text-sm font-medium text-gray-300"
//                     >
//                       Email Address
//                     </label>
//                     <div className="relative">
//                       <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
//                       <input
//                         type="email"
//                         id="email"
//                         name="email"
//                         value={formData.email}
//                         onChange={handleChange}
//                         disabled={!isEditing}
//                         className="w-full pl-10 pr-4 py-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Password Change Section */}
//               {isEditing && (
//                 <div className="space-y-6">
//                   <div className="flex items-center gap-3 mb-6">
//                     <Lock className="text-[#A78BFA]" size={20} />
//                     <h3 className="text-xl font-semibold text-white">Change Password</h3>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                     <div className="space-y-2">
//                       <label
//                         htmlFor="currentPassword"
//                         className="block text-sm font-medium text-gray-300"
//                       >
//                         Current Password
//                       </label>
//                       <div className="relative">
//                         <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                           type="password"
//                           id="currentPassword"
//                           name="currentPassword"
//                           value={formData.currentPassword}
//                           onChange={handleChange}
//                           className="w-full pl-10 pr-4 py-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
//                           placeholder="Enter current password"
//                         />
//                       </div>
//                     </div>

//                     <div className="space-y-2">
//                       <label
//                         htmlFor="newPassword"
//                         className="block text-sm font-medium text-gray-300"
//                       >
//                         New Password
//                       </label>
//                       <div className="relative">
//                         <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                           type="password"
//                           id="newPassword"
//                           name="newPassword"
//                           value={formData.newPassword}
//                           onChange={handleChange}
//                           className="w-full pl-10 pr-4 py-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
//                           placeholder="Leave blank to keep current password"
//                         />
//                       </div>
//                     </div>
//                   </div>

//                   {formData.newPassword && (
//                     <div className="space-y-2">
//                       <label
//                         htmlFor="confirmPassword"
//                         className="block text-sm font-medium text-gray-300"
//                       >
//                         Confirm New Password
//                       </label>
//                       <div className="relative">
//                         <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
//                         <input
//                           type="password"
//                           id="confirmPassword"
//                           name="confirmPassword"
//                           value={formData.confirmPassword}
//                           onChange={handleChange}
//                           className="w-full pl-10 pr-4 py-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
//                           placeholder="Confirm new password"
//                         />
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Action buttons */}
//               <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700 mt-8">
//                 {!isEditing ? (
//                   <button
//                     type="button"
//                     onClick={() => setIsEditing(true)}
//                     className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors shadow-lg shadow-[#A78BFA]/20"
//                   >
//                     <Settings size={18} />
//                     Edit Profile
//                   </button>
//                 ) : (
//                   <>
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setIsEditing(false);
//                         setError(null);
//                         setFormData((prev) => ({
//                           ...prev,
//                           username: user.username || "",
//                           email: user.email || "",
//                           currentPassword: "",
//                           newPassword: "",
//                           confirmPassword: "",
//                         }));
//                       }}
//                       className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
//                     >
//                       <X size={18} />
//                       Cancel
//                     </button>
//                     <button
//                       type="submit"
//                       disabled={isLoading}
//                       className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#A78BFA]/20"
//                     >
//                       {isLoading && (
//                         <span className="animate-spin border-2 border-[#1E1E1E] border-t-transparent rounded-full w-4 h-4"></span>
//                       )}
//                       <Save size={18} />
//                       {isLoading ? "Saving..." : "Save Changes"}
//                     </button>
//                   </>
//                 )}
//               </div>
//             </form>

//             {/* Danger zone */}
//             <div className="mt-10 border-t border-gray-700 pt-6">
//               <div className="flex items-center gap-3 mb-6">
//                 <Trash2 className="text-red-400" size={20} />
//                 <h3 className="text-xl font-semibold text-red-400">Danger Zone</h3>
//               </div>
//               <div className="space-y-4">
//                 <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
//                   <p className="text-gray-300 text-sm mb-4">
//                     Once you delete your account, there is no going back. This action will permanently remove all your data, rooms, and files. Please be certain.
//                   </p>
//                   <button
//                     type="button"
//                     onClick={handleDeleteAccount}
//                     disabled={isDeleting}
//                     className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
//                   >
//                     {isDeleting ? (
//                       <>
//                         <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
//                         Deleting...
//                       </>
//                     ) : (
//                       <>
//                         <Trash2 size={18} />
//                         Delete My Account
//                       </>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default ManageAccount;



import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Save,
  X,
  Trash2,
  Settings,
  Shield,
  Bell,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import useAuthContext from "../hooks/useAuthContext";
import Sidebar from "../components/Sidebar";
import { updateUserProfile, deleteUserAccount } from "../services/userService";

const ManageAccount = () => {
  const { user, dispatch } = useAuthContext();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    darkMode: true,
    notifications: true,
    autoJoinRooms: false,
    showActiveStatus: true,
    allowMentions: true,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Initialize form and preferences
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        username: user.username || "",
        email: user.email || "",
      }));

      // Load saved preferences
      const savedPrefs = JSON.parse(localStorage.getItem("codejam_prefs"));
      if (savedPrefs) setPreferences(savedPrefs);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePrefToggle = (key) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem("codejam_prefs", JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteUserAccount();

    if (result.success) {
      dispatch({ type: "LOGOUT" });
      localStorage.removeItem("user");
      navigate("/login");
    } else {
      setError(result.error || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    if (
      isEditing &&
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      setError("New passwords don't match");
      return;
    }

    setIsLoading(true);

    const result = await updateUserProfile({
      username: formData.username,
      email: formData.email,
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword || undefined,
    });

    if (result.success) {
      const updatedUser = { ...user, ...result.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      dispatch({ type: "LOGIN", payload: updatedUser });

      setSuccess("Profile updated successfully!");
      setIsEditing(false);
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } else {
      setError(result.error || "Failed to update profile");
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-8 ml-64">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Account Settings
              </h1>
              <p className="text-gray-400 mt-1">
                Manage your profile, preferences, and security.
              </p>
            </div>
          </div>

          <div className="bg-[#1E1E1E]/50 rounded-xl shadow-lg p-8 border border-gray-800 hover:border-[#A78BFA]/50 transition">
            {/* Profile header */}
            <div className="flex items-center space-x-6 mb-8">
              <div className="w-20 h-20 rounded-full bg-[#A78BFA] flex items-center justify-center text-white font-bold text-2xl">
                {formData.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {formData.username}
                </h2>
                <p className="text-gray-400">{formData.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Shield size={16} className="text-green-400" />
                  <span className="text-sm text-green-400">Account Active</span>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <div className="flex items-center gap-3 bg-red-500/20 border border-red-500 text-red-100 p-4 rounded-lg mb-6">
                <span>⚠️ {error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 bg-green-500/20 border border-green-500 text-green-100 p-4 rounded-lg mb-6">
                <span>✅ {success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-10">
              {/* Profile Info */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <User className="text-[#A78BFA]" size={20} />
                  <h3 className="text-xl font-semibold text-white">
                    Profile Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Username
                    </label>
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full p-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#A78BFA] disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Email
                    </label>
                    <input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled
                      className="w-full p-3 bg-[#1E1E1E] border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              {/* Preferences */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="text-[#A78BFA]" size={20} />
                  <h3 className="text-xl font-semibold text-white">
                    Preferences
                  </h3>
                </div>

                <div className="space-y-3">
                  <ToggleRow
                    icon={preferences.darkMode ? <Moon /> : <Sun />}
                    label="Dark Mode"
                    state={preferences.darkMode}
                    onToggle={() => handlePrefToggle("darkMode")}
                  />
                  <ToggleRow
                    icon={<Bell />}
                    label="Enable Notifications"
                    state={preferences.notifications}
                    onToggle={() => handlePrefToggle("notifications")}
                  />
                  <ToggleRow
                    icon={<Users />}
                    label="Auto Join Rooms on Invite"
                    state={preferences.autoJoinRooms}
                    onToggle={() => handlePrefToggle("autoJoinRooms")}
                  />
                  <ToggleRow
                    icon={<Shield />}
                    label="Show Active Status"
                    state={preferences.showActiveStatus}
                    onToggle={() => handlePrefToggle("showActiveStatus")}
                  />
                </div>
              </section>

              {/* Action buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 transition"
                  >
                    <Settings size={18} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setError(null);
                        setFormData((prev) => ({
                          ...prev,
                          username: user.username || "",
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition"
                    >
                      <X size={18} /> Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#A78BFA] text-[#1E1E1E] font-semibold hover:bg-[#A78BFA]/90 disabled:opacity-50 transition"
                    >
                      {isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                )}
              </div>
            </form>

            {/* Danger Zone */}
            <div className="mt-10 border-t border-gray-700 pt-6">
              <div className="flex items-center gap-3 mb-6">
                <Trash2 className="text-red-400" size={20} />
                <h3 className="text-xl font-semibold text-red-400">
                  Danger Zone
                </h3>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-gray-300 text-sm mb-4">
                  Deleting your account will permanently remove all your rooms,
                  files, and data. This cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 font-semibold"
                >
                  {isDeleting ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Small toggle row component for preferences
const ToggleRow = ({ icon, label, state, onToggle }) => (
  <div className="flex items-center justify-between bg-[#2A2A2A] rounded-lg px-4 py-3">
    <div className="flex items-center gap-3 text-gray-300">
      {icon}
      <span>{label}</span>
    </div>
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition ${
        state ? "bg-[#A78BFA]" : "bg-gray-600"
      }`}
    >
      <span
        className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          state ? "translate-x-6" : ""
        }`}
      ></span>
    </button>
  </div>
);

export default ManageAccount;
