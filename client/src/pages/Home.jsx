import { Users, Code2, MessageSquare } from "lucide-react";
import Navbar from '../components/Navbar'


const Home = () => {
    return (
        <div className="flex min-h-screen flex-col bg-[#1E1E1E] text-gray-200">

            <main className="flex-grow">
                {/* Navbar */}
                <Navbar />

                {/* Hero Section */}
                <section className="relative py-20 sm:py-24 md:py-32 lg:py-40 bg-gradient-to-br from-[#A78BFA]/30 via-transparent to-[#1E1E1E]">
                    <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                        <h1 className="text-4xl font-bold tracking-tighter text-white sm:text-5xl md:text-6xl">
                            Code Together, Anywhere.
                        </h1>
                        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
                            Collaborate on code in real-time with your team. No setup required. Just pure, seamless coding.
                        </p>
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            <button className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90">
                                Create a Room
                            </button>
                            <button className="rounded-xl bg-[#A78BFA]/20 px-6 py-3 text-base font-bold text-white border border-purple-500/30 ring-1 ring-inset ring-[#A78BFA]/30 hover:bg-[#A78BFA]/30">
                                Join a Room
                            </button>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-16 sm:py-24" id="features">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Everything You Need to Collaborate
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
                                CodeJam offers a suite of features designed to enhance your collaborative coding experience.
                            </p>
                        </div>
                        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

                            {/* Feature 1 */}
                            <div className="rounded-xl border border-gray-800 bg-[#1E1E1E]/50 p-6 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A78BFA]/10 text-[#A78BFA]">
                                    <Users size={20} />
                                </div>
                                <h3 className="mt-6 text-lg font-bold text-white">Real-time Collaboration</h3>
                                <p className="mt-2 text-base text-gray-400">
                                    Work together on the same code, with changes instantly reflected for all participants.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="rounded-xl border border-gray-800 bg-[#1E1E1E]/50 p-6 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A78BFA]/10 text-[#A78BFA]">
                                    <Code2 size={20} />
                                </div>
                                <h3 className="mt-6 text-lg font-bold text-white">Multi-Language Support</h3>
                                <p className="mt-2 text-base text-gray-400">
                                    Supports a wide range of programming languages, including Python, JavaScript, Java, and more.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="rounded-xl border border-gray-800 bg-[#1E1E1E]/80 p-6 shadow-sm">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A78BFA]/10 text-[#A78BFA]">
                                    <MessageSquare size={20} />
                                </div>
                                <h3 className="mt-6 text-lg font-bold text-white">Integrated Chat</h3>
                                <p className="mt-2 text-base text-gray-400">
                                    Communicate with your team directly within the editor using the integrated chat feature.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="py-16 sm:py-24 bg-[#A78BFA]/20" id="how-it-works">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">How It Works</h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">Get started in just a few simple steps.</p>
                        </div>
                        <div className="relative mt-12">
                            <div aria-hidden="true" className="absolute left-6 top-0 h-full w-0.5 bg-gray-800"></div>
                            <div className="relative space-y-12">
                                {["Create a Room", "Invite Collaborators", "Start Coding"].map((step, i) => (
                                    <div key={i} className="relative flex items-start">
                                        <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#A78BFA] text-[#1E1E1E] font-bold">
                                            {i + 1}
                                        </div>
                                        <div className="ml-6 flex-1 sm:ml-8">
                                            <h3 className="text-lg font-bold text-white">{step}</h3>
                                            <p className="mt-1 text-base text-gray-400">
                                                {i === 0 && "Start by creating a new coding room with a unique, shareable ID."}
                                                {i === 1 && "Share the room ID with your team members to invite them to collaborate."}
                                                {i === 2 && "Begin coding together in real-time, with all changes synchronized instantly."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contact Section */}
                <section className="bg-[#1E1E1E]/80 py-16 sm:py-24" id="contact">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Get in Touch
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
                                Have questions or feedback? We'd love to hear from you.
                            </p>
                        </div>

                        <form className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent"
                                    placeholder="What's this about?"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-xl bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent resize-none"
                                    placeholder="Tell us what's on your mind..."
                                ></textarea>
                            </div>

                            <div className="text-center">
                                <button
                                    type="submit"
                                    className="rounded-xl bg-[#A78BFA] px-8 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors duration-200"
                                >
                                    Send Message
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </main>

            <footer className="bg-[#1a1818] " >
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                        <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 md:order-2">
                            <a className="text-sm text-gray-400 hover:text-[#A78BFA]  text-purple-400"
                            >
                                Terms
                            </a>
                            <a className="text-sm text-gray-400 hover:text-[#A78BFA] " href="#">
                                Privacy
                            </a>
                            <a className="text-sm text-gray-400 hover:text-[#A78BFA] " href="#">
                                Contact
                            </a>
                        </div>
                        <div className="flex justify-center space-x-6 md:order-3">
                            <a className="text-gray-400 hover:text-[#A78BFA] " href="#">
                                <span className="sr-only">Twitter</span>
                                <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                                </svg>
                            </a>
                            <a className="text-gray-400 hover:text-[#A78BFA] " href="#">
                                <span className="sr-only">GitHub</span>
                                <svg aria-hidden="true" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.165 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" fillRule="evenodd"></path>
                                </svg>
                            </a>
                        </div>
                        <p className="text-center text-sm text-gray-400 md:order-1">© 2024 CodeJam. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;