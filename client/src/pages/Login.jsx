import { useState } from "react";
import useLogin  from "../hooks/useLogin"
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [data, setData] = useState({
    identifier: "",
    password: "",
  });

  const { login, error, isLoading} = useLogin()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(data.identifier, data.password);
    if(success){
      navigate("/dashboard")
    }
    console.log(data)

  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E1E1E] text-gray-200 px-4 bg-gradient-to-br from-[#A78BFA]/20 via-transparent to-[#1E1E1E]">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1E1E1E]/80 p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-white text-center">Welcome Back</h2>
        <p className="mt-2 text-center text-gray-400">
          Log in to continue collaborating on CodeJam
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Email or Username */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email or Username
            </label>
            <input
              type="text"
              id="identifier"
              name="identifier"
              value={data.identifier}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
              placeholder="you@example.com or your username"
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
          </div>

          {/* Submit */}
          <div className="text-center">
            <button disabled={isLoading}
              type="submit"
              className="w-full rounded-xl bg-[#A78BFA] px-8 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              {isLoading ? 'Logging in…' : 'Log In'}
            </button>
          </div>
          {error && <div className="p-3 bg-red-500/10 border border-red-500 text-red-500 rounded-lg">{error}</div>}

        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don’t have an account?{" "}
          <a href="/signup" className="text-[#A78BFA] hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
