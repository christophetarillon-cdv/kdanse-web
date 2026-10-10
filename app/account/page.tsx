'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, SavedDancer } from '@/types';
import { updateUserProfile, getUserProfile, updateSavedDancer, resolveLinkedDancers } from '@/services/userService';

interface DancerDraft {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  street: string;
  postalCode: string;
  city: string;
  licenseNumber: string;
  licenseActive: boolean;
}

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

const inputClass = 'w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium';

export default function AccountPage() {
  const { firebaseUser, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [dancers, setDancers] = useState<SavedDancer[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dancerDraft, setDancerDraft] = useState<DancerDraft | null>(null);
  const [savingDancer, setSavingDancer] = useState(false);
  const [dancerError, setDancerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
    street: '',
    postalCode: '',
    city: '',
    licenseNumber: '',
    licenseActive: false,
    photoUrl: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
      return;
    }

    if (firebaseUser && user) {
      fetchUserData();
    }
  }, [firebaseUser, authLoading, user, router]);

  const fetchUserData = async () => {
    try {
      const userData = await getUserProfile(firebaseUser!.uid);
      if (userData) {
        setDancers(await resolveLinkedDancers((userData.profile as any)?.dancers || []));
        setFormData({
          firstName: userData.profile?.firstName || (userData as any).prenom || '',
          lastName: userData.profile?.lastName || (userData as any).nom || '',
          phone: userData.profile?.phone || '',
          dateOfBirth: userData.profile?.dateOfBirth
            ? new Date(userData.profile.dateOfBirth).toISOString().split('T')[0]
            : '',
          street: userData.profile?.postalAddress?.street || '',
          postalCode: userData.profile?.postalAddress?.postalCode || '',
          city: userData.profile?.postalAddress?.city || '',
          licenseNumber: userData.profile?.license?.number || '',
          licenseActive: userData.profile?.license?.active || false,
          photoUrl: userData.profile?.photoUrl || (userData as any).photo || '',
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'file' && files) {
      setPhotoFile(files[0]);
      // Show preview
      const reader = new FileReader();
      reader.onload = () => {
        setFormData(prev => ({
          ...prev,
          photoUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const profileData: any = {};

      // Add name fields
      if (formData.firstName) profileData.firstName = formData.firstName;
      if (formData.lastName) profileData.lastName = formData.lastName;

      // Add optional profile fields only if they have values
      if (formData.phone) profileData.phone = formData.phone;
      if (formData.dateOfBirth) profileData.dateOfBirth = new Date(formData.dateOfBirth);
      if (formData.street || formData.postalCode || formData.city) {
        profileData.postalAddress = {
          street: formData.street,
          postalCode: formData.postalCode,
          city: formData.city,
        };
      }
      if (formData.licenseNumber) {
        profileData.license = {
          number: formData.licenseNumber,
          federation: 'ffdanse',
          active: formData.licenseActive,
        };
      }

      // Save photo if selected or keep existing
      if (formData.photoUrl) {
        profileData.photoUrl = formData.photoUrl;
      }

      // Le champ profile est remplacé entier: conserver les danseurs enregistrés
      const currentUser = await getUserProfile(firebaseUser!.uid);
      profileData.dancers = (currentUser?.profile as any)?.dancers || [];

      const displayName = `${formData.firstName} ${formData.lastName}`.trim();
      const updatedUser: Partial<User> = {
        displayName,
        profile: profileData,
      };

      await updateUserProfile(firebaseUser!.uid, updatedUser);
      setPhotoFile(null); // Clear file after save
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photoUrl: '',
    }));
    setPhotoFile(null);
  };

  const isAccountHolder = (dancer: SavedDancer) => {
    if (dancer.uid && dancer.uid === firebaseUser?.uid) return true;
    const sameName =
      normalize(formData.firstName) !== '' &&
      normalize(dancer.firstName) === normalize(formData.firstName) &&
      normalize(dancer.lastName) === normalize(formData.lastName);
    const sameEmail = !!dancer.email && normalize(dancer.email) === normalize(firebaseUser?.email);
    return sameName || sameEmail;
  };

  const visibleDancers = dancers
    .map((dancer, index) => ({ dancer, index }))
    .filter(({ dancer }) => !isAccountHolder(dancer));

  const startEditDancer = (index: number, dancer: SavedDancer) => {
    setEditingIndex(index);
    setDancerError(null);
    setDancerDraft({
      firstName: dancer.firstName || '',
      lastName: dancer.lastName || '',
      email: dancer.email || '',
      dateOfBirth: dancer.dateOfBirth ? new Date(dancer.dateOfBirth).toISOString().split('T')[0] : '',
      street: dancer.postalAddress?.street || '',
      postalCode: dancer.postalAddress?.postalCode || '',
      city: dancer.postalAddress?.city || '',
      licenseNumber: dancer.license?.number || '',
      licenseActive: dancer.license?.active || false,
    });
  };

  const cancelEditDancer = () => {
    setEditingIndex(null);
    setDancerDraft(null);
    setDancerError(null);
  };

  const handleDancerFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setDancerDraft(prev => (prev ? { ...prev, [name]: type === 'checkbox' ? checked : value } : prev));
  };

  const handleSaveDancer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIndex === null || !dancerDraft) return;

    setSavingDancer(true);
    setDancerError(null);

    try {
      const updated: SavedDancer = {
        firstName: dancerDraft.firstName.trim(),
        lastName: dancerDraft.lastName.trim(),
        postalAddress: {
          street: dancerDraft.street.trim(),
          postalCode: dancerDraft.postalCode.trim(),
          city: dancerDraft.city.trim(),
        },
        license: {
          number: dancerDraft.licenseNumber.trim(),
          active: dancerDraft.licenseActive,
        },
      };
      if (dancerDraft.email.trim()) updated.email = dancerDraft.email.trim();
      if (dancerDraft.dateOfBirth) updated.dateOfBirth = dancerDraft.dateOfBirth;

      const newDancers = await updateSavedDancer(firebaseUser!.uid, editingIndex, updated);
      setDancers(newDancers);
      setEditingIndex(null);
      setDancerDraft(null);
    } catch (err) {
      console.error('Error saving dancer:', err);
      setDancerError('Erreur lors de la sauvegarde du danseur. Veuillez réessayer.');
    } finally {
      setSavingDancer(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div>
        <Link href="/dashboard" className="text-gold-deep hover:underline mb-4 inline-block">
          ← Retour au dashboard
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold mt-4 mb-2">👤 Mon compte</h1>
        <p className="text-gray-700 font-medium">Gérez vos informations personnelles</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6 max-w-2xl">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-900">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded p-4 text-green-900">
            ✅ Profil mis à jour avec succès!
          </div>
        )}

        {/* Infos du compte */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📧 Infos du compte</h2>

          {/* Photo de profil */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-900 mb-2">📸 Photo de profil</label>
            {formData.photoUrl && (
              <div className="mb-4">
                <div className="flex justify-center mb-4">
                  <img
                    src={formData.photoUrl}
                    alt="Photo de profil"
                    className="w-32 h-32 rounded-full object-cover border-2 border-gold-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded text-sm font-medium mb-2"
                >
                  ✖️ Supprimer la photo
                </button>
              </div>
            )}
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleInputChange}
              className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
            />
            <p className="text-xs text-gray-800 mt-1">JPG ou PNG, max 5MB</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Email</label>
            <input
              type="email"
              value={firebaseUser?.email || ''}
              className="w-full border-2 border-gray-300 rounded px-3 py-2 bg-white text-gray-900 font-medium"
              disabled
            />
            <p className="text-xs text-gray-900 font-medium mt-1">Non modifiable</p>
          </div>

          {/* Nom et Prénom séparés */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Prénom</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                placeholder="Christophe"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Nom</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                placeholder="Tarillon"
              />
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📞 Coordonnées</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Date de naissance</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📍 Adresse</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Rue</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                placeholder="123 Rue de la Danse"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Code postal</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                  placeholder="75001"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Ville</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                  placeholder="Paris"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Licence FFDanse */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🎖️ Licence FFDanse</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Numéro de licence</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 font-medium"
                placeholder="Ex: 123456789"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="licenseActive"
                checked={formData.licenseActive}
                onChange={handleInputChange}
                className="rounded"
              />
              <span className="text-sm font-medium">Licence active</span>
            </label>
          </div>
        </div>

        {/* Bouton submit */}
        <div className="border-t pt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-ink hover:bg-ink-soft text-white py-2 rounded font-semibold disabled:opacity-50 transition"
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
          <button
            type="button"
            onClick={() => fetchUserData()}
            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold transition"
          >
            Annuler
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">👥 Mes danseurs</h2>

        {visibleDancers.length === 0 ? (
          <p className="text-gray-900 font-medium">
            Aucun danseur enregistré pour le moment. Ils seront ajoutés lors de votre prochaine inscription.
          </p>
        ) : (
          <ul className="space-y-4">
            {visibleDancers.map(({ dancer, index }) => {
              const cityLine = [dancer.postalAddress?.postalCode, dancer.postalAddress?.city]
                .filter(Boolean)
                .join(' ');
              const addressLine = [dancer.postalAddress?.street, cityLine].filter(Boolean).join(', ');
              const isEditing = editingIndex === index && dancerDraft !== null;

              return (
                <li key={`${dancer.firstName}-${dancer.lastName}-${index}`} className="border rounded p-4 space-y-1 text-sm">
                  {isEditing ? (
                    <form onSubmit={handleSaveDancer} className="space-y-3">
                      {dancerError && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-900">
                          {dancerError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Prénom</label>
                          <input type="text" name="firstName" value={dancerDraft.firstName} onChange={handleDancerFieldChange} required className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Nom</label>
                          <input type="text" name="lastName" value={dancerDraft.lastName} onChange={handleDancerFieldChange} required className={inputClass} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Email</label>
                        <input type="email" name="email" value={dancerDraft.email} onChange={handleDancerFieldChange} className={inputClass} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Date de naissance</label>
                        <input type="date" name="dateOfBirth" value={dancerDraft.dateOfBirth} onChange={handleDancerFieldChange} className={inputClass} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Rue</label>
                        <input type="text" name="street" value={dancerDraft.street} onChange={handleDancerFieldChange} className={inputClass} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Code postal</label>
                          <input type="text" name="postalCode" value={dancerDraft.postalCode} onChange={handleDancerFieldChange} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-1">Ville</label>
                          <input type="text" name="city" value={dancerDraft.city} onChange={handleDancerFieldChange} className={inputClass} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">Numéro de licence FFDanse</label>
                        <input type="text" name="licenseNumber" value={dancerDraft.licenseNumber} onChange={handleDancerFieldChange} className={inputClass} />
                      </div>

                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="licenseActive" checked={dancerDraft.licenseActive} onChange={handleDancerFieldChange} className="rounded" />
                        <span className="text-sm font-medium text-gray-900">Licence active</span>
                      </label>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={savingDancer}
                          className="flex-1 bg-ink hover:bg-ink-soft text-white py-2 rounded font-semibold disabled:opacity-50 transition"
                        >
                          {savingDancer ? 'Sauvegarde...' : '💾 Enregistrer'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditDancer}
                          className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded font-semibold transition"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="font-bold text-gray-900 text-base">
                        {dancer.firstName} {dancer.lastName}
                      </p>
                      {dancer.email && (
                        <p className="text-gray-900"><strong>Email:</strong> {dancer.email}</p>
                      )}
                      {dancer.dateOfBirth && (
                        <p className="text-gray-900">
                          <strong>Date de naissance:</strong> {new Date(dancer.dateOfBirth).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      {addressLine && (
                        <p className="text-gray-900"><strong>Adresse:</strong> {addressLine}</p>
                      )}
                      {dancer.license?.number && (
                        <p className="text-gray-900">
                          <strong>Licence FFDanse:</strong> {dancer.license.number} {dancer.license.active ? '(active)' : '(inactive)'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => startEditDancer(index, dancer)}
                        disabled={editingIndex !== null}
                        className="mt-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                      >
                        ✏️ Modifier
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
