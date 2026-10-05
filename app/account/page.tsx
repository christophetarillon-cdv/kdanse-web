'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@/types';
import { updateUserProfile, getUserProfile } from '@/services/userService';

export default function AccountPage() {
  const { firebaseUser, user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
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
      if (formData.photoUrl && !photoFile) {
        // Keep existing photo if no new file
        profileData.photoUrl = formData.photoUrl;
      }

      const displayName = `${formData.firstName} ${formData.lastName}`.trim();
      const updatedUser: Partial<User> = {
        displayName,
        profile: profileData,
      };

      await updateUserProfile(firebaseUser!.uid, updatedUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!firebaseUser) return null;

  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div>
        <Link href="/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Retour au dashboard
        </Link>
        <h1 className="text-2xl sm:text-4xl font-bold mt-4 mb-2">👤 Mon compte</h1>
        <p className="text-gray-600">Gérez vos informations personnelles</p>
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
          <h2 className="text-lg font-semibold mb-4">📧 Infos du compte</h2>

          {/* Photo de profil */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">📸 Photo de profil</label>
            {formData.photoUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={formData.photoUrl}
                  alt="Photo de profil"
                  className="w-32 h-32 rounded-full object-cover border-2 border-blue-300"
                />
              </div>
            )}
            <input
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleInputChange}
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">JPG ou PNG, max 5MB</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={firebaseUser?.email || ''}
              className="w-full border rounded px-3 py-2 bg-gray-100"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Non modifiable</p>
          </div>

          {/* Nom et Prénom séparés */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prénom</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Christophe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nom</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Tarillon"
              />
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">📞 Coordonnées</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date de naissance</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">📍 Adresse</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rue</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
                placeholder="123 Rue de la Danse"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Code postal</label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="75001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ville</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Paris"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Licence FFDanse */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">🎖️ Licence FFDanse</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Numéro de licence</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
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
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold disabled:opacity-50 transition"
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
    </div>
  );
}
