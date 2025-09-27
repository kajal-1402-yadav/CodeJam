import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthContext from "../hooks/useAuthContext";

const ManageAccount = () => {
  const { user, dispatch } = useAuthContext();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        username: user.username || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/users/profile`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Logout user after successful deletion
      dispatch({ type: 'LOGOUT' });
      localStorage.removeItem('user');
      navigate('/login');
      
    } catch (error) {
      setError(error.message || 'Failed to delete account');
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

    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env?.VITE_API_URL || 'http://localhost:4000'}/api/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.token}`
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      if (!data.user || !data.token) {
        throw new Error("Invalid response from server");
      }

      // Update auth context with new user data and token
      const updatedUser = { ...data.user, token: data.token };
      
      // Update context
      dispatch({ type: "LOGIN", payload: updatedUser });
      
      // Update localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setSuccess("Profile updated successfully!");
      setIsEditing(false);

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
    } catch (error) {
      setError(
        error.message || "An error occurred while updating your profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0F0F0F] min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-[#1E1E1E] rounded-xl shadow-lg p-8 border border-gray-800 hover:border-purple-600/50 transition">
          {/* Profile header with avatar */}
          <div className="flex items-center space-x-4 mb-6">
            <img
              src={`https://ui-avatars.com/api/?name=${formData.username}&background=6b21a8&color=fff`}
              alt="avatar"
              className="w-16 h-16 rounded-full border-2 border-purple-600"
            />
            <div>
              <h2 className="text-2xl font-bold text-white">{formData.username}</h2>
              <p className="text-gray-400">{formData.email}</p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-6">
              <span>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500 text-green-100 p-3 rounded-lg mb-6">
              <span>✅</span> {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left column: profile info */}
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                />
              </div>
            </div>

            {/* Right column: password change */}
            {isEditing && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white mb-4">Change Password</h3>

                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Leave blank to keep current password"
                  />
                </div>

                {formData.newPassword && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Confirm new password"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700 mt-8 col-span-2">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition"
                >
                  Edit Profile
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
                        email: user.email || "",
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      }));
                    }}
                    className="px-5 py-2 rounded-full border border-gray-600 text-gray-300 hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && (
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    )}
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Danger zone */}
          <div className="mt-10 border-t border-gray-700 pt-6">
            <h3 className="text-red-400 font-semibold mb-4">Danger Zone</h3>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete My Account'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAccount;