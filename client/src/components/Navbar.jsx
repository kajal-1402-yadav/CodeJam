const Navbar = () => {
    return (
        <header className="sticky bg-[#1a1818] top-0 z-50 w-full border-b border-gray-800/50 backdrop-blur-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

                <div className="flex items-center gap-4">
                    <svg className="h-8 w-8 text-[#A78BFA]" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"> 
                        <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
                    </svg>
                    <h2 className="text-xl font-bold text-white">CodeJam</h2>
                </div>

                <nav className="hidden items-center gap-8 md:flex">
                    <a className="text-sm font-medium text-gray-300 hover:text-[#A78BFA]" href="#features">Features</a>
                    <a className="text-sm font-medium text-gray-300 hover:text-[#A78BFA]" href="#how-it-works">How It Works</a>
                    <a className="text-sm font-medium text-gray-300 hover:text-[#A78BFA]" href="#contact">Contact</a>
                </nav>
                
                <div className="flex items-center gap-2">
                    <button className="rounded-xl bg-[#A78BFA]/20 px-4 py-2 text-sm font-bold text-[#A78BFA] hover:bg-[#A78BFA]/30">Join Room</button>
                    <button className="rounded-xl bg-[#A78BFA] px-4 py-2 text-sm font-bold text-background-dark hover:bg-[#A78BFA]/90"> Create Room
                    </button>
                </div>
                
            </div>
        </header>
    );
};

export default Navbar;