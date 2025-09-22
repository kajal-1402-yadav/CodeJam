import { useState } from "react";

const Login = () => {
  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: call login API
    console.log(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1E1E1E] text-gray-200 px-4 bg-gradient-to-br from-[#A78BFA]/20 via-transparent to-[#1E1E1E]">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1E1E1E]/80 p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-white text-center">Welcome Back</h2>
        <p className="mt-2 text-center text-gray-400">
          Log in to continue collaborating on CodeJam
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#A78BFA] px-8 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors duration-200"
            >
              Log In
            </button>
          </div>
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
