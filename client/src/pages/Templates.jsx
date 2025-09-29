import { useState } from "react";
import { FileText, Search, Plus, Download, Eye, Copy, Star, Clock } from "lucide-react";
import Sidebar from "../components/Sidebar";

const TemplateCard = ({ template, onUse, onPreview, onCopy }) => {
  return (
    <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-6 shadow-md hover:border-[#A78BFA]/50 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-bold text-lg group-hover:text-[#A78BFA] transition-colors">
              {template.name}
            </h3>
            {template.isPopular && (
              <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs">
                <Star size={12} />
                <span>Popular</span>
              </div>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-3">{template.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{template.estimatedTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText size={16} />
              <span>{template.filesCount} files</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#A78BFA]/10 text-[#A78BFA]">
            <FileText size={20} />
          </div>
        </div>
      </div>
      
      <div className="flex gap-3">
        <button 
          onClick={() => onUse(template)}
          className="flex-1 rounded-lg bg-[#A78BFA] px-4 py-2 text-sm font-bold text-[#1E1E1E] hover:bg-[#A78BFA]/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Use Template
        </button>
        <button 
          onClick={() => onPreview(template)}
          className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-bold text-gray-300 hover:border-[#A78BFA] hover:text-white transition-colors flex items-center gap-2"
        >
          <Eye size={16} />
          Preview
        </button>
        <button 
          onClick={() => onCopy(template)}
          className="px-4 py-2 rounded-lg border border-gray-600 text-sm font-bold text-gray-300 hover:border-[#A78BFA] hover:text-white transition-colors flex items-center gap-2"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};

const Templates = () => {
  const [templates] = useState([
    {
      id: 1,
      name: "React + Vite Starter",
      description: "Modern React application with Vite, TypeScript, and Tailwind CSS",
      category: "Frontend",
      estimatedTime: "5 min",
      filesCount: 12,
      isPopular: true,
      downloads: 1250,
      rating: 4.8
    },
    {
      id: 2,
      name: "Node.js API Template",
      description: "Express.js API with MongoDB, JWT authentication, and validation",
      category: "Backend",
      estimatedTime: "10 min",
      filesCount: 18,
      isPopular: true,
      downloads: 980,
      rating: 4.6
    },
    {
      id: 3,
      name: "Full-Stack MERN",
      description: "Complete MERN stack application with authentication and file uploads",
      category: "Full-Stack",
      estimatedTime: "15 min",
      filesCount: 25,
      isPopular: false,
      downloads: 750,
      rating: 4.7
    },
    {
      id: 4,
      name: "React Dashboard",
      description: "Admin dashboard with charts, tables, and responsive design",
      category: "Frontend",
      estimatedTime: "8 min",
      filesCount: 15,
      isPopular: true,
      downloads: 1100,
      rating: 4.9
    },
    {
      id: 5,
      name: "Python Flask API",
      description: "RESTful API with SQLAlchemy, Marshmallow, and Swagger docs",
      category: "Backend",
      estimatedTime: "12 min",
      filesCount: 20,
      isPopular: false,
      downloads: 650,
      rating: 4.5
    },
    {
      id: 6,
      name: "Vue.js SPA",
      description: "Single Page Application with Vue 3, Composition API, and Vuex",
      category: "Frontend",
      estimatedTime: "7 min",
      filesCount: 14,
      isPopular: false,
      downloads: 420,
      rating: 4.4
    },
    {
      id: 7,
      name: "Next.js Blog",
      description: "Static blog with MDX support, SEO optimization, and dark mode",
      category: "Frontend",
      estimatedTime: "6 min",
      filesCount: 16,
      isPopular: true,
      downloads: 890,
      rating: 4.8
    },
    {
      id: 8,
      name: "Docker + Kubernetes",
      description: "Containerized application with K8s manifests and CI/CD pipeline",
      category: "DevOps",
      estimatedTime: "20 min",
      filesCount: 22,
      isPopular: false,
      downloads: 380,
      rating: 4.6
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const categories = ["All", "Frontend", "Backend", "Full-Stack", "DevOps"];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template) => {
    console.log("Using template:", template.name);
    // Implement use template logic
  };

  const handlePreviewTemplate = (template) => {
    console.log("Previewing template:", template.name);
    // Implement preview logic
  };

  const handleCopyTemplate = (template) => {
    console.log("Copying template:", template.name);
    // Implement copy logic
  };

  return (
    <div className="flex min-h-screen bg-[#1E1E1E] text-gray-200">
      <Sidebar />

      <main className="flex-1 p-8 ml-64">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Templates</h1>
            <p className="text-gray-400 mt-1">Jumpstart your projects with pre-built templates.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-initial">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-lg bg-[#1E1E1E] border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#A78BFA] focus:border-transparent transition-colors"
              />
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-[#A78BFA] px-6 py-3 text-base font-bold text-[#1E1E1E] shadow-lg shadow-[#A78BFA]/20 hover:bg-[#A78BFA]/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Template
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-[#A78BFA] text-[#1E1E1E]'
                  : 'bg-[#1E1E1E]/50 border border-gray-700 text-gray-300 hover:border-[#A78BFA]/50 hover:text-white'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Templates</p>
                <p className="text-white text-3xl font-bold mt-1">{templates.length}</p>
              </div>
              <div className="p-3 rounded-full bg-[#A78BFA]/10 text-[#A78BFA]">
                <FileText size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Downloads</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {templates.reduce((sum, t) => sum + t.downloads, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                <Download size={22} />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1E1E1E]/50 rounded-xl border border-gray-800 p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Popular Templates</p>
                <p className="text-white text-3xl font-bold mt-1">
                  {templates.filter(t => t.isPopular).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-500">
                <Star size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-5">
            {selectedCategory === "All" ? "All Templates" : `${selectedCategory} Templates`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                onUse={handleUseTemplate}
                onPreview={handlePreviewTemplate}
                onCopy={handleCopyTemplate}
              />
            ))}
          </div>
          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-500 text-lg">No templates found</p>
              <p className="text-gray-400 text-sm mt-2">Try a different search or category filter</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Templates;
