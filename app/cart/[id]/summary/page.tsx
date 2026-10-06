'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getCart, submitCart } from '@/services/cartService';
import { Cart } from '@/types/cart';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CartSummaryPage() {
  const params = useParams();
  const cartId = params.id as string;
  const { firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Infos danseurs complètes (Phase 2b validation)
  const [dancersInfo, setDancersInfo] = useState<any[]>([]);

  // Danseurs disponibles du compte utilisateur
  const [profileDancers, setProfileDancers] = useState<any[]>([]);

  // Index du danseur du compte sélectionné pour chaque danseur du panier
  const [selectedDancerIndices, setSelectedDancerIndices] = useState<(number | null)[]>([]);

  // Infos compte si nouvel utilisateur
  const [accountInfo, setAccountInfo] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!authLoading && cartId) {
      fetchCart();
    }
  }, [authLoading, cartId, firebaseUser]);

  const fetchCart = async () => {
    try {
      const cartData = await getCart(cartId);
      if (!cartData) {
        router.push('/cart');
        return;
      }
      // Verify ownership only if user is connected
      if (firebaseUser && cartData.userId !== firebaseUser.uid) {
        router.push('/cart');
        return;
      }
      setCart(cartData);

      // Initialiser les infos des danseurs à partir du cart
      if (cartData.items && cartData.items.length > 0) {
        const allDancers = cartData.items.flatMap((item) => item.configuration.dancers || []);
        let dancersToSet = allDancers.map((d: any) => ({
          ...d,
          dateOfBirth: '',
          postalAddress: { street: '', postalCode: '', city: '' },
          license: { number: '', federation: 'ffdanse', active: false },
        }));

        // Si l'utilisateur est connecté, charger ses données existantes
        if (firebaseUser) {
          try {
            // Charger depuis la collection 'users'
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();
              const userProfile = userData.profile || {};
              const accountDancers = userProfile.dancers || [];

              // Stocker les danseurs du compte pour le sélecteur
              setProfileDancers(accountDancers);

              // Initialiser les indices sélectionnés (par défaut: -1 = aucun sélectionné)
              setSelectedDancerIndices(new Array(dancersToSet.length).fill(-1));

              // Pré-remplir avec les données des danseurs du profil utilisateur
              dancersToSet = dancersToSet.map((dancer, dancerIndex) => {
                // Chercher un danseur du compte qui correspond au nom du panier
                let selectedIndex = -1;
                let selectedDancer = null;

                // D'abord chercher une correspondance de nom exact
                const matchingIndex = accountDancers.findIndex(
                  (d: any) => d.firstName === dancer.firstName && d.lastName === dancer.lastName
                );

                if (matchingIndex >= 0) {
                  selectedIndex = matchingIndex;
                  selectedDancer = accountDancers[matchingIndex];
                } else if (accountDancers.length > 0) {
                  // Sinon prendre le premier danseur du compte
                  selectedIndex = 0;
                  selectedDancer = accountDancers[0];
                }

                // Mettre à jour l'indice sélectionné
                setSelectedDancerIndices((prev) => {
                  const newIndices = [...prev];
                  newIndices[dancerIndex] = selectedIndex;
                  return newIndices;
                });

                if (selectedDancer) {
                  return {
                    ...dancer,
                    firstName: selectedDancer.firstName,
                    lastName: selectedDancer.lastName,
                    dateOfBirth: selectedDancer.dateOfBirth || '',
                    postalAddress: selectedDancer.postalAddress || { street: '', postalCode: '', city: '' },
                    license: selectedDancer.license || { number: '', federation: 'ffdanse', active: false },
                    selectedDancerIndex: selectedIndex,
                  };
                } else {
                  const hasNameMismatch =
                    (userData.prenom !== dancer.firstName || userData.nom !== dancer.lastName);

                  return {
                    ...dancer,
                    firstName: dancer.firstName,
                    lastName: dancer.lastName,
                    dateOfBirth: userProfile.dateOfBirth ?
                      new Date(userProfile.dateOfBirth.seconds * 1000).toISOString().split('T')[0] : '',
                    postalAddress: userProfile.postalAddress || { street: '', postalCode: '', city: '' },
                    license: userProfile.license || { number: '', federation: 'ffdanse', active: false },
                    hasNameMismatch,
                    accountFirstName: userData.prenom,
                    accountLastName: userData.nom,
                    selectedDancerIndex: -1,
                  };
                }
              });
            }
          } catch (error) {
            console.error('Error loading user memberships:', error);
          }
        }

        setDancersInfo(dancersToSet);
      }

      // Pré-remplir email si user connecté
      if (firebaseUser?.email) {
        setAccountInfo((prev) => ({ ...prev, email: firebaseUser.email || '' }));
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = async () => {
    if (!cart) return;

    // Valider que tous les champs danseurs sont remplis
    for (const dancer of dancersInfo) {
      if (!dancer.dateOfBirth || !dancer.postalAddress?.street || !dancer.postalAddress?.postalCode || !dancer.postalAddress?.city) {
        alert('Veuillez remplir toutes les informations des danseurs');
        return;
      }
    }

    // Si pas connecté, valider compte
    if (!firebaseUser) {
      if (!accountInfo.email || !accountInfo.password || accountInfo.password !== accountInfo.confirmPassword) {
        alert('Veuillez remplir les informations de compte correctement');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Sauvegarder les données des danseurs si l'utilisateur est connecté
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);

        // Transformer dancersInfo pour la sauvegarde
        const dancersToSave = dancersInfo.map(d => ({
          firstName: d.firstName,
          lastName: d.lastName,
          dateOfBirth: d.dateOfBirth,
          postalAddress: d.postalAddress,
          license: d.license,
        }));

        // Sauvegarder dans le profil utilisateur
        await updateDoc(userRef, {
          'profile.dancers': dancersToSave,
          'profile.lastUpdated': new Date(),
        });
      }

      // Mark cart as submitted
      await submitCart(cart.id);
      // Redirect to payment page
      router.push(`/cart/${cart.id}/pay`);
    } catch (error) {
      console.error('Error:', error);
      alert('Erreur lors de la validation du panier');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) return <div className="p-8">Chargement...</div>;
  if (!cart) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/cart" className="text-blue-600 hover:underline">
            ← Retour au panier
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">📋 Résumé de votre commande</h1>
          <p className="text-gray-700 font-medium">Vérifiez tous les détails avant de payer</p>
        </div>

        <div className="space-y-6">
          {/* Items recap */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Inscriptions</h2>
            </div>

            <div className="divide-y">
              {cart.items.map((item) => (
                <div key={item.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{item.stageName}</h3>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{item.totals?.total}€</span>
                  </div>

                  <div className="bg-blue-50 rounded border border-blue-200 p-4 space-y-2 text-sm">
                    <p>
                      <strong>Danseurs:</strong> {item.configuration.danceType === 'solo' ? '1 danseur' : '2 danseurs'}
                      {item.configuration.dancers.some((d) => d.licensed) && ' (licencié FFDanse)'}
                    </p>
                    {item.configuration.accompanists > 0 && (
                      <p>
                        <strong>Accompagnateurs:</strong> {item.configuration.accompanists}
                      </p>
                    )}
                    {item.configuration.wantHousing && (
                      <p>
                        <strong>Hébergement:</strong>
                        {item.configuration.housingSolo > 0 && ` ${item.configuration.housingSolo} solo`}
                        {item.configuration.housingSolo > 0 && item.configuration.housingCouple > 0 && ' +'}
                        {item.configuration.housingCouple > 0 && ` ${item.configuration.housingCouple} couple`}
                      </p>
                    )}
                    {!item.configuration.wantHousing && <p><strong>Hébergement:</strong> Aucun</p>}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Stage:</span>
                      <span className="font-medium">{item.totals?.stageTotal}€</span>
                    </div>
                    {item.totals?.housingTotal ? (
                      <div className="flex justify-between">
                        <span>Hébergement:</span>
                        <span className="font-medium">{item.totals.housingTotal}€</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>Sous-total:</span>
                      <span>{item.totals?.total}€</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section validation infos danseurs */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">📝 Informations des danseurs</h2>
              <p className="text-sm text-gray-700 mt-1">Complétez les informations avant de payer</p>
              {firebaseUser && (
                <p className="text-sm text-blue-700 mt-2 font-medium">
                  ✓ Vos données ont été pré-remplies à partir de votre compte existant
                </p>
              )}
            </div>

            <div className="p-6 space-y-6">
              {dancersInfo.map((dancer, idx) => (
                <div key={idx} className="border rounded-lg p-6 space-y-4">
                  <h3 className="font-bold text-lg text-gray-900">
                    Danseur {idx + 1}: {dancer.firstName} {dancer.lastName}
                  </h3>

                  {/* Sélecteur de danseur du compte */}
                  {firebaseUser && profileDancers.length > 0 && (
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Utiliser un danseur de mon compte
                      </label>
                      <select
                        value={selectedDancerIndices[idx] ?? -1}
                        onChange={(e) => {
                          const selectedIndex = parseInt(e.target.value);
                          const newIndices = [...selectedDancerIndices];
                          newIndices[idx] = selectedIndex;
                          setSelectedDancerIndices(newIndices);

                          // Pré-remplir les données du danseur sélectionné
                          if (selectedIndex >= 0) {
                            const selectedDancer = profileDancers[selectedIndex];
                            const newDancers = [...dancersInfo];
                            newDancers[idx] = {
                              ...newDancers[idx],
                              firstName: selectedDancer.firstName,
                              lastName: selectedDancer.lastName,
                              dateOfBirth: selectedDancer.dateOfBirth || '',
                              postalAddress: selectedDancer.postalAddress || { street: '', postalCode: '', city: '' },
                              license: selectedDancer.license || { number: '', federation: 'ffdanse', active: false },
                              selectedDancerIndex: selectedIndex,
                            };
                            setDancersInfo(newDancers);
                          }
                        }}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                      >
                        <option value={-1}>-- Choisir un danseur --</option>
                        {profileDancers.map((d: any, idx) => (
                          <option key={idx} value={idx}>
                            {d.firstName} {d.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Alerte si les noms ne correspondent pas */}
                  {dancer.hasNameMismatch && (
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded p-4">
                      <p className="text-sm text-yellow-800 font-medium mb-3">
                        ⚠️ Les noms/prénoms ne correspondent pas avec votre compte
                      </p>
                      <p className="text-xs text-yellow-700 mb-4">
                        Votre compte: <strong>{dancer.accountFirstName} {dancer.accountLastName}</strong>
                      </p>
                      <p className="text-xs text-yellow-700">
                        Veuillez confirmer les noms/prénoms pour cette inscription
                      </p>
                    </div>
                  )}

                  {/* Noms et prénoms */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Prénom*</label>
                      <input
                        type="text"
                        value={dancer.firstName}
                        onChange={(e) => {
                          const newDancers = [...dancersInfo];
                          newDancers[idx].firstName = e.target.value;
                          setDancersInfo(newDancers);
                        }}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Nom*</label>
                      <input
                        type="text"
                        value={dancer.lastName}
                        onChange={(e) => {
                          const newDancers = [...dancersInfo];
                          newDancers[idx].lastName = e.target.value;
                          setDancersInfo(newDancers);
                        }}
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                      />
                    </div>
                  </div>

                  {/* Date de naissance */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Date de naissance*</label>
                    <input
                      type="date"
                      value={dancer.dateOfBirth}
                      onChange={(e) => {
                        const newDancers = [...dancersInfo];
                        newDancers[idx].dateOfBirth = e.target.value;
                        setDancersInfo(newDancers);
                      }}
                      className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  </div>

                  {/* Adresse */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Rue*</label>
                    <input
                      type="text"
                      value={dancer.postalAddress?.street || ''}
                      onChange={(e) => {
                        const newDancers = [...dancersInfo];
                        newDancers[idx].postalAddress.street = e.target.value;
                        setDancersInfo(newDancers);
                      }}
                      placeholder="123 Rue de la Danse"
                      className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Code postal*</label>
                      <input
                        type="text"
                        value={dancer.postalAddress?.postalCode || ''}
                        onChange={(e) => {
                          const newDancers = [...dancersInfo];
                          newDancers[idx].postalAddress.postalCode = e.target.value;
                          setDancersInfo(newDancers);
                        }}
                        placeholder="75001"
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Ville*</label>
                      <input
                        type="text"
                        value={dancer.postalAddress?.city || ''}
                        onChange={(e) => {
                          const newDancers = [...dancersInfo];
                          newDancers[idx].postalAddress.city = e.target.value;
                          setDancersInfo(newDancers);
                        }}
                        placeholder="Paris"
                        className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Licence FFDanse */}
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">Licence FFDanse (optionnel)</label>
                    <input
                      type="text"
                      value={dancer.license?.number || ''}
                      onChange={(e) => {
                        const newDancers = [...dancersInfo];
                        newDancers[idx].license.number = e.target.value;
                        setDancersInfo(newDancers);
                      }}
                      placeholder="Numéro de licence"
                      className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500 mb-2"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dancer.license?.active || false}
                        onChange={(e) => {
                          const newDancers = [...dancersInfo];
                          newDancers[idx].license.active = e.target.checked;
                          setDancersInfo(newDancers);
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">Licence active</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section compte si pas connecté */}
          {!firebaseUser && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">🔐 Créer votre compte</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email*</label>
                  <input
                    type="email"
                    value={accountInfo.email}
                    onChange={(e) => setAccountInfo({ ...accountInfo, email: e.target.value })}
                    placeholder="votre@email.com"
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Mot de passe*</label>
                  <input
                    type="password"
                    value={accountInfo.password}
                    onChange={(e) => setAccountInfo({ ...accountInfo, password: e.target.value })}
                    placeholder="Au moins 6 caractères"
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Confirmer mot de passe*</label>
                  <input
                    type="password"
                    value={accountInfo.confirmPassword}
                    onChange={(e) => setAccountInfo({ ...accountInfo, confirmPassword: e.target.value })}
                    placeholder="Confirmer le mot de passe"
                    className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-lg p-6">
            <div className="space-y-3 mb-6">
              <div className="text-lg">
                <div className="flex justify-between text-gray-700 mb-2">
                  <span>Total stages:</span>
                  <span className="font-medium">{cart.totals.stageTotal}€</span>
                </div>
                {cart.totals.housingTotal > 0 && (
                  <div className="flex justify-between text-gray-700 mb-2">
                    <span>Total hébergement:</span>
                    <span className="font-medium">{cart.totals.housingTotal}€</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-2xl font-bold text-orange-600 pt-4 border-t border-orange-300">
                <span>Montant à payer:</span>
                <span>{cart.totals.total}€</span>
              </div>
            </div>

            <button
              onClick={handleContinueToPayment}
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Validation en cours...' : 'Continuer vers le paiement'}
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="mb-2">
              <strong>ℹ️ Important :</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Vérifiez vos informations avant de continuer</li>
              <li>Vous pourrez modifier votre configuration de paiement à l'étape suivante</li>
              <li>Les places d'hébergement sont réservées après paiement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
