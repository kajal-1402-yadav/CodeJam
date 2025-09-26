import { useState } from "react";
import useSignup from '../hooks/useSignup';
import { useNavigate } from 'react-router-dom';


const Signup = () => {
    const [data, setData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    })

    const { signup, isLoading, error} = useSignup();
    const navigate = useNavigate();
    const [formError, setFormError] = useState("");

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("")
        if (data.password !== data.confirmPassword) {
            setFormError("Passwords do not match.")
            return
        }
        const success = await signup(data.username, data.email, data.password);
        if (success) {
            navigate("/dashboard");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#1E1E1E] text-gray-200 px-4 bg-gradient-to-br from-[#A78BFA]/20 via-transparent to-[#1E1E1E]">
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1E1E1E]/80 p-8 shadow-lg">
                <h2 className="text-3xl font-bold text-white text-center">
                    Create an Account
                </h2>
                <p className="mt-2 text-center text-gray-400">
                    Start collaborating on CodeJam today
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {/* Username */}
                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={data.username}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                            placeholder="Your username"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={data.email}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                            placeholder="you@example.com"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={data.password}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                            placeholder="••••••••"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Use at least 8 characters with uppercase, lowercase, a number, and a symbol.
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="block text-sm font-medium text-gray-300 mb-2"
                        >
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={data.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                            placeholder="••••••••"
                        />
                    </div>

                    {/* Submit */}
                    <div className="text-center">
                        <button
                            disabled={isLoading}
                            type="submit"
                            className="w-full rounded-xl bg-[#A78BFA] px-8 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading && (
                                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                            )}
                            {isLoading ? 'Creating account...' : 'Sign Up'}
                        </button>
                    </div>
                    {(formError || error) && (
                        <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 rounded-lg">
                            {formError || error}
                        </div>
                    )}

                </form>

                <p className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{" "}
                    <a href="/login" className="text-[#A78BFA] hover:underline">
                        Log in
                    </a>
                </p>
            </div>
        </div>
    );
};

export default Signup;