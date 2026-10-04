import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  MapPin, 
  Tag, 
  Clock, 
  User, 
  LogOut, 
  Home, 
  List, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle, 
  RefreshCw, 
  Search, 
  Check,
  Eye,
  Edit,
  X
} from 'lucide-react';
import { supabase } from './supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface RequestItem {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category_id: string;
  budget: string;
  city: string;
  status: string;
  created_at: string;
  whatsapp_number?: string;
  categories?: { name: string };
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'publish' | 'my-requests' | 'auth'>('home');
  
  // Authentification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState('');

  // Formulaire de Publication
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState('Cotonou');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loadingPublish, setLoadingPublish] = useState(false);
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Liste des demandes & Filtres
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');

  // Modals : Détails & Édition
  const [viewRequest, setViewRequest] = useState<RequestItem | null>(null);
  const [editRequest, setEditRequest] = useState<RequestItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editCity, setEditCity] = useState('Cotonou');
  const [editWhatsappNumber, setEditWhatsappNumber] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchMyRequests(currentUser.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchMyRequests(currentUser.id);
    });

    fetchCategories();
    fetchRequests();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyRequests(user.id);
    } else {
      setMyRequests([]);
    }
  }, [user]);

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (!error && data) {
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id);
    }
  };

  // REQUÊTE PUBLIQUE : uniquement les demandes ouvertes
  const fetchRequests = async () => {
    setLoadingRequests(true);
    const { data, error } = await supabase
      .from('requests')
      .select('*, categories(name)')
      .or('status.eq.OPEN,status.eq.open')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
    }
    setLoadingRequests(false);
  };

  // REQUÊTE 'MES DEMANDES' : uniquement les demandes de l'utilisateur connecté
  const fetchMyRequests = async (userId: string) => {
    setLoadingMyRequests(true);
    const { data, error } = await supabase
      .from('requests')
      .select('*, categories(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyRequests(data);
    }
    setLoadingMyRequests(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return "À l'instant";
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return `Il y a ${Math.floor(diff / 86400)} j`;
  };

  const formatDateFull = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Compte créé avec succès ! Connectez-vous.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setActiveTab('home');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Une erreur est survenue');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMyRequests([]);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setActiveTab('auth');
      return;
    }

    setLoadingPublish(true);
    setPublishMessage(null);

    let cleanPhone = whatsappNumber.replace(/\s+/g, '');
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = `+229${cleanPhone}`;
    }

    try {
      const { error } = await supabase.from('requests').insert([
        {
          user_id: user.id,
          title,
          description,
          category_id: categoryId,
          budget: budget.includes('FCFA') ? budget : `${budget} FCFA`,
          city,
          whatsapp_number: cleanPhone,
          status: 'open'
        }
      ]);

      if (error) throw error;

      setPublishMessage({
        type: 'success',
        text: 'Votre demande a été publiée avec succès !'
      });

      setTitle('');
      setDescription('');
      setBudget('');
      setWhatsappNumber('');

      fetchRequests();
      if (user) fetchMyRequests(user.id);

      setTimeout(() => {
        setActiveTab('home');
        setPublishMessage(null);
      }, 1500);

    } catch (err: any) {
      setPublishMessage({
        type: 'error',
        text: err.message || 'Erreur lors de la publication.'
      });
    } finally {
      setLoadingPublish(false);
    }
  };

  const handleContactSeller = (request: RequestItem) => {
    if (!user) {
      setActiveTab('auth');
      return;
    }

    const isRequestOpen = request.status?.toLowerCase() === 'open';
    if (!isRequestOpen) {
      alert("Cette demande a été clôturée et n'est plus active.");
      return;
    }

    if (!request.whatsapp_number) {
      alert("Numéro WhatsApp indisponible pour cette demande.");
      return;
    }

    const cleanNum = request.whatsapp_number.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Bonjour ! Je vous contacte via TROUVE 229 concernant votre demande : "${request.title}". Je peux vous la fournir.`
    );

    window.open(`https://wa.me/${cleanNum}?text=${message}`, '_blank');
  };

  // CLÔTURE ("J'ai trouvé")
  const handleCloseRequest = async (requestId: string) => {
    if (!user) return;

    const isConfirmed = window.confirm(
      "Avez-vous trouvé ce que vous cherchiez ? En confirmant, cette demande sera déplacée vers 'Demandes clôturées' et ne recevra plus de nouveaux contacts."
    );

    if (!isConfirmed) return;

    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'closed' })
        .eq('id', requestId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Mise à jour immédiate du state frontend
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setMyRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: 'closed' } : r))
      );

      await fetchRequests();
      await fetchMyRequests(user.id);
    } catch (err: any) {
      alert("Erreur lors de la clôture : " + (err.message || 'Une erreur est survenue.'));
    }
  };

  // OUVRIR MODAL D'ÉDITION
  const handleOpenEdit = (req: RequestItem) => {
    setEditRequest(req);
    setEditTitle(req.title);
    setEditDescription(req.description || '');
    setEditCategoryId(req.category_id || (categories[0]?.id ?? ''));
    setEditBudget(req.budget.replace(' FCFA', ''));
    setEditCity(req.city || 'Cotonou');
    setEditWhatsappNumber(req.whatsapp_number || '');
    setEditError('');
  };

  // ENREGISTRER LA MODIFICATION
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRequest || !user) return;

    setLoadingEdit(true);
    setEditError('');

    let cleanPhone = editWhatsappNumber.replace(/\s+/g, '');
    if (cleanPhone && !cleanPhone.startsWith('+')) {
      cleanPhone = `+229${cleanPhone}`;
    }

    const formattedBudget = editBudget.includes('FCFA') ? editBudget : `${editBudget} FCFA`;

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          title: editTitle,
          description: editDescription,
          category_id: editCategoryId,
          budget: formattedBudget,
          city: editCity,
          whatsapp_number: cleanPhone
        })
        .eq('id', editRequest.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Fermeture du modal et rafraîchissement
      setEditRequest(null);
      await fetchMyRequests(user.id);
      await fetchRequests();
    } catch (err: any) {
      setEditError(err.message || 'Erreur lors de la modification.');
    } finally {
      setLoadingEdit(false);
    }
  };

  // FILTRAGE DES DEMANDES PUBLIQUES
  const filteredRequests = requests.filter((req) => {
    if (req.status?.toLowerCase() !== 'open') return false;

    const matchesSearch = 
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCat = selectedCategory === 'ALL' || req.category_id === selectedCategory;
    const matchesCity = selectedCity === 'ALL' || req.city === selectedCity;

    return matchesSearch && matchesCat && matchesCity;
  });

  // SEPARATION DE "MES DEMANDES"
  const openMyRequests = myRequests.filter((r) => r.status?.toLowerCase() === 'open');
  const closedMyRequests = myRequests.filter((r) => r.status?.toLowerCase() !== 'open');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* En-tête */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setActiveTab('home')}
          >
            <div className="bg-emerald-600 text-white font-bold text-lg px-2.5 py-1 rounded-lg tracking-wider">
              229
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-800">
              TROUVE <span className="text-emerald-600">229</span>
            </span>
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('auth')}
              className="flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200"
            >
              <User size={14} />
              <span>Connexion</span>
            </button>
          )}
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-md mx-auto p-4">
        {/* Onglet Auth */}
        {activeTab === 'auth' && (
          <div className="space-y-6 pt-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">
                {isSignUp ? 'Créer un compte' : 'Connexion'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isSignUp ? 'Inscrivez-vous pour publier vos demandes' : 'Accédez à votre espace TROUVE 229'}
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@domaine.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow hover:bg-emerald-700 transition text-sm disabled:opacity-50"
              >
                {loadingAuth ? 'Chargement...' : isSignUp ? 'S\'inscrire' : 'Se connecter'}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                {isSignUp ? 'Vous avez déjà un compte ? Connectez-vous' : 'Pas encore de compte ? Inscrivez-vous'}
              </button>
            </div>
          </div>
        )}

        {/* Onglet Publier */}
        {activeTab === 'publish' && (
          <div className="space-y-5 pt-2">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Publier une demande</h2>
              <p className="text-xs text-slate-500 mt-0.5">Décrivez ce que vous cherchez au Bénin</p>
            </div>

            {publishMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                  publishMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {publishMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{publishMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre de la demande *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Chaussures Nike Air Max"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catégorie *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description détaillée *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Je cherche une paire de Nike Air Max pointure 42..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Budget *
                  </label>
                  <input
                    type="text"
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="ex: 10 000 FCFA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ville *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="Cotonou">Cotonou</option>
                    <option value="Porto-Novo">Porto-Novo</option>
                    <option value="Parakou">Parakou</option>
                    <option value="Abomey-Calavi">Abomey-Calavi</option>
                    <option value="Ouidah">Ouidah</option>
                    <option value="Bohicon">Bohicon</option>
                    <option value="Autre">Autre ville</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numéro WhatsApp (Privé & Sécurisé) *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+22997000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loadingPublish}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-emerald-700 transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <PlusCircle size={18} />
                <span>{loadingPublish ? 'Publication...' : 'Publier ma demande'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Onglet Accueil */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            <section className="text-center py-4 bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                TROUVE <span className="text-emerald-600">229</span>
              </h1>
              <p className="text-sm font-medium text-slate-600 mt-1 italic">
                « Tu cherches. Quelqu'un l'a. »
              </p>
            </section>

            <button 
              onClick={() => setActiveTab(user ? 'publish' : 'auth')}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-emerald-700 transition text-sm flex items-center justify-center space-x-2"
            >
              <PlusCircle size={18} />
              <span>Publier une demande</span>
            </button>

            {/* Filtres */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 shadow-sm">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une demande..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none"
                >
                  <option value="ALL">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none"
                >
                  <option value="ALL">Toutes les villes</option>
                  <option value="Cotonou">Cotonou</option>
                  <option value="Porto-Novo">Porto-Novo</option>
                  <option value="Parakou">Parakou</option>
                  <option value="Abomey-Calavi">Abomey-Calavi</option>
                  <option value="Ouidah">Ouidah</option>
                  <option value="Bohicon">Bohicon</option>
                </select>
              </div>
            </div>

            {/* Demandes en direct */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">
                  Demandes en direct ({filteredRequests.length})
                </h2>
                <button 
                  onClick={fetchRequests}
                  className="text-slate-400 hover:text-emerald-600 p-1 transition"
                  title="Rafraîchir"
                >
                  <RefreshCw size={16} className={loadingRequests ? 'animate-spin' : ''} />
                </button>
              </div>

              {loadingRequests ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Chargement des demandes en cours...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-600">Aucune demande ouverte trouvée.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req) => (
                    <div 
                      key={req.id} 
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition space-y-3"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {req.title}
                        </h3>
                        <span className="bg-emerald-50 text-emerald-800 font-bold text-xs px-2.5 py-1 rounded-full border border-emerald-100 whitespace-nowrap">
                          {req.budget}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        {req.categories?.name && (
                          <div className="flex items-center space-x-1">
                            <Tag size={12} className="text-emerald-600" />
                            <span>{req.categories.name}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{req.city}</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formatTimeAgo(req.created_at)}</span>
                        </div>
                      </div>

                      {req.status?.toLowerCase() === 'open' && (
                        <button
                          onClick={() => handleContactSeller(req)}
                          className="w-full bg-emerald-600 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-emerald-700 transition flex items-center justify-center space-x-1.5 mt-2 shadow-sm"
                        >
                          <MessageCircle size={14} />
                          <span>Je peux fournir (Répondre via WhatsApp)</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION "MES DEMANDES" AMÉLIORÉE */}
        {activeTab === 'my-requests' && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Mes demandes</h2>
                <p className="text-xs text-slate-500 mt-0.5">Gérez l'état et les informations de vos demandes</p>
              </div>

              {user && (
                <button
                  onClick={() => fetchMyRequests(user.id)}
                  className="text-slate-400 hover:text-emerald-600 p-1.5 transition rounded-lg hover:bg-slate-100"
                  title="Rafraîchir mes demandes"
                >
                  <RefreshCw size={16} className={loadingMyRequests ? 'animate-spin' : ''} />
                </button>
              )}
            </div>

            {!user ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-xs text-slate-500 mb-3">Connectez-vous pour voir et gérer vos demandes.</p>
                <button
                  onClick={() => setActiveTab('auth')}
                  className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition"
                >
                  Se connecter
                </button>
              </div>
            ) : loadingMyRequests ? (
              <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                Chargement de vos demandes...
              </div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Vous n'avez publié aucune demande pour le moment.</p>
                <button
                  onClick={() => setActiveTab('publish')}
                  className="mt-3 text-xs text-emerald-600 font-bold underline"
                >
                  Publier ma première demande
                </button>
              </div>
            ) : (
              <div className="space-y-6">

                {/* 1. SECTION : DEMANDES OUVERTES */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-sm font-bold text-slate-800">
                      DEMANDES OUVERTES ({openMyRequests.length})
                    </h3>
                  </div>

                  {openMyRequests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                      <p className="text-xs text-slate-400">Aucune demande ouverte actuellement.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {openMyRequests.map((req) => (
                        <div
                          key={req.id}
                          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition space-y-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {req.title}
                            </h4>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap">
                              Ouverte
                            </span>
                          </div>

                          {req.description && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {req.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                            {req.categories?.name && (
                              <div className="flex items-center space-x-1">
                                <Tag size={12} className="text-emerald-600" />
                                <span>{req.categories.name}</span>
                              </div>
                            )}

                            <div className="flex items-center space-x-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{req.city}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <span className="font-bold text-emerald-700">{req.budget}</span>
                            </div>

                            <div className="flex items-center space-x-1 ml-auto">
                              <Clock size={12} className="text-slate-400" />
                              <span>{formatTimeAgo(req.created_at)}</span>
                            </div>
                          </div>

                          {/* ACTIONS */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => setViewRequest(req)}
                              className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs py-2 px-2 rounded-xl transition flex items-center justify-center space-x-1"
                            >
                              <Eye size={13} />
                              <span>Voir</span>
                            </button>

                            <button
                              onClick={() => handleOpenEdit(req)}
                              className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-xs py-2 px-2 rounded-xl transition flex items-center justify-center space-x-1"
                            >
                              <Edit size={13} />
                              <span>Modifier</span>
                            </button>

                            <button
                              onClick={() => handleCloseRequest(req.id)}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs py-2 px-1.5 rounded-xl transition flex items-center justify-center space-x-1 shadow-sm"
                            >
                              <Check size={13} />
                              <span className="truncate">J'ai trouvé</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SECTION : DEMANDES CLÔTURÉES */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <h3 className="text-sm font-bold text-slate-700">
                      DEMANDES CLÔTURÉES ({closedMyRequests.length})
                    </h3>
                  </div>

                  {closedMyRequests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                      <p className="text-xs text-slate-400">Aucune demande clôturée.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {closedMyRequests.map((req) => (
                        <div
                          key={req.id}
                          className="bg-slate-100/70 rounded-2xl border border-slate-200 p-4 shadow-xs opacity-90 space-y-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-slate-700 text-sm leading-snug line-through">
                              {req.title}
                            </h4>
                            <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-slate-300 whitespace-nowrap">
                              Clôturée
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            {req.categories?.name && (
                              <div className="flex items-center space-x-1">
                                <Tag size={12} className="text-slate-400" />
                                <span>{req.categories.name}</span>
                              </div>
                            )}

                            <div className="flex items-center space-x-1">
                              <MapPin size={12} className="text-slate-400" />
                              <span>{req.city}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <span className="font-semibold text-slate-600">{req.budget}</span>
                            </div>

                            <div className="flex items-center space-x-1 ml-auto">
                              <Clock size={12} className="text-slate-400" />
                              <span>{formatTimeAgo(req.created_at)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                            <button
                              onClick={() => setViewRequest(req)}
                              className="w-full bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs"
                            >
                              <Eye size={13} />
                              <span>Détails de la demande</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL VOIR (DÉTAILS COMPLET DE LA DEMANDE) */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  viewRequest.status?.toLowerCase() === 'open' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {viewRequest.status?.toLowerCase() === 'open' ? 'Demande Ouverte' : 'Demande Clôturée'}
                </span>
                <h3 className="font-bold text-slate-900 text-lg mt-1">{viewRequest.title}</h3>
              </div>
              <button
                onClick={() => setViewRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Description</p>
                <p className="mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                  {viewRequest.description || "Aucune description fournie."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Catégorie</p>
                  <p className="font-bold text-slate-800 mt-0.5">{viewRequest.categories?.name || 'Général'}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Budget</p>
                  <p className="font-bold text-emerald-700 mt-0.5">{viewRequest.budget}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Localisation</p>
                  <p className="font-bold text-slate-800 mt-0.5">{viewRequest.city}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Publiée le</p>
                  <p className="font-bold text-slate-800 mt-0.5">{formatDateFull(viewRequest.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewRequest(null)}
                className="w-full bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER SA DEMANDE */}
      {editRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Modifier ma demande</h3>
              <button
                onClick={() => setEditRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle size={16} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titre de la demande *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catégorie *</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description détaillée *</label>
                <textarea
                  required
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Budget *</label>
                  <input
                    type="text"
                    required
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    placeholder="ex: 10 000 FCFA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ville *</label>
                  <select
                    value={editCity}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Cotonou">Cotonou</option>
                    <option value="Porto-Novo">Porto-Novo</option>
                    <option value="Parakou">Parakou</option>
                    <option value="Abomey-Calavi">Abomey-Calavi</option>
                    <option value="Ouidah">Ouidah</option>
                    <option value="Bohicon">Bohicon</option>
                    <option value="Autre">Autre ville</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro WhatsApp (Privé)</label>
                <input
                  type="tel"
                  value={editWhatsappNumber}
                  onChange={(e) => setEditWhatsappNumber(e.target.value)}
                  placeholder="+22997000000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditRequest(null)}
                  className="w-1/2 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loadingEdit}
                  className="w-1/2 bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition text-xs disabled:opacity-50"
                >
                  {loadingEdit ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navigation inférieure */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-6 shadow-lg z-50">
        <div className="max-w-md mx-auto flex justify-around items-center text-xs font-medium">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'home' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <Home size={20} />
            <span>Accueil</span>
          </button>

          <button
            onClick={() => setActiveTab(user ? 'publish' : 'auth')}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'publish' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <PlusCircle size={20} />
            <span>Publier</span>
          </button>

          <button
            onClick={() => setActiveTab(user ? 'my-requests' : 'auth')}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'my-requests' ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`}
          >
            <List size={20} />
            <span>Mes demandes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}