'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AcquisitionSource, Dance, Level } from '@/types/courses';
import { getAcquisitionSources } from '@/services/acquisitionSourceService';

const OTHER_SOURCE = 'autre';

interface Dancer {
  firstName: string;
  lastName: string;
  email: string;
}

interface CourseSelection {
  [danceId: string]: string | null; // levelId or null
}

export default function CoursesPage() {
  const params = useParams();
  const router = useRouter();
  const membershipId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [dances, setDances] = useState<Dance[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentDancerIndex, setCurrentDancerIndex] = useState(0);
  const [selections, setSelections] = useState<CourseSelection[]>([]);
  const [attendedKdanse, setAttendedKdanse] = useState<boolean | null>(null);
  const [acquisitionSources, setAcquisitionSources] = useState<AcquisitionSource[]>([]);
  const [acquisitionSourceId, setAcquisitionSourceId] = useState('');
  const [acquisitionSourceOther, setAcquisitionSourceOther] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load membership
      const membershipRef = doc(db, 'memberships', membershipId);
      const membershipSnap = await getDoc(membershipRef);
      if (!membershipSnap.exists()) {
        console.error('Membership not found');
        router.push('/memberships');
        return;
      }

      const membership = membershipSnap.data();
      const dancersData = membership.registrationDetails?.dancers || [];
      setDancers(dancersData);

      setAttendedKdanse(typeof membership.alreadyAttendedKdanse === 'boolean' ? membership.alreadyAttendedKdanse : null);
      setAcquisitionSourceId(membership.acquisitionSourceId ?? '');
      setAcquisitionSourceOther(membership.acquisitionSourceOther ?? '');
      setAcquisitionSources(await getAcquisitionSources(true));

      // Initialize selections (empty for all dancers/dances)
      const initSelections = dancersData.map(() => ({}));
      setSelections(initSelections);

      // Load dances
      const dancesQuery = query(collection(db, 'dances'), orderBy('order', 'asc'));
      const dancesSnap = await getDocs(dancesQuery);
      const dancesData = dancesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Dance));
      setDances(dancesData);

      // Load levels
      const levelsQuery = query(collection(db, 'levels'), orderBy('order', 'asc'));
      const levelsSnap = await getDocs(levelsQuery);
      const levelsData = levelsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Level));
      setLevels(levelsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelSelect = (danceId: string, levelId: string | null) => {
    const newSelections = [...selections];
    newSelections[currentDancerIndex] = {
      ...newSelections[currentDancerIndex],
      [danceId]: levelId,
    };
    setSelections(newSelections);
  };

  const handlePrevious = () => {
    if (currentDancerIndex > 0) {
      setCurrentDancerIndex(currentDancerIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentDancerIndex < dancers.length - 1) {
      setCurrentDancerIndex(currentDancerIndex + 1);
    }
  };

  const originRequired = attendedKdanse === false;
  const acquisitionAnswerMissing =
    attendedKdanse === null ||
    (originRequired &&
      (!acquisitionSourceId || (acquisitionSourceId === OTHER_SOURCE && !acquisitionSourceOther.trim())));

  const handleViewSummary = async () => {
    if (attendedKdanse !== null) {
      try {
        await updateDoc(doc(db, 'memberships', membershipId), {
          alreadyAttendedKdanse: attendedKdanse,
          acquisitionSourceId: originRequired ? acquisitionSourceId : null,
          acquisitionSourceOther: originRequired && acquisitionSourceId === OTHER_SOURCE ? acquisitionSourceOther.trim() : '',
        });
      } catch (error) {
        console.error('Error saving acquisition source:', error);
        alert("Erreur lors de l'enregistrement de votre réponse");
        return;
      }
    }
    // Save selections to localStorage temporarily
    localStorage.setItem(
      `courses_${membershipId}`,
      JSON.stringify({
        dancers,
        selections,
        dances,
        levels,
      })
    );
    router.push(`/memberships/${membershipId}/courses/summary`);
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (dancers.length === 0) return <div className="p-8 text-center">Aucun danseur trouvé</div>;

  const currentDancer = dancers[currentDancerIndex];
  const currentSelections = selections[currentDancerIndex] || {};

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Sélection des Cours</h1>
          <p className="text-gray-600">Choisissez un niveau par danse pour chaque danseur</p>
        </div>

        {/* Progress */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-900">
                Danseur {currentDancerIndex + 1} de {dancers.length}
              </span>
              <span className="text-sm text-gray-600">
                {currentDancer.firstName} {currentDancer.lastName}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-ink h-2 rounded-full transition-all"
                style={{ width: `${((currentDancerIndex + 1) / dancers.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Course Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Cours pour {currentDancer.firstName}
          </h2>

          <div className="space-y-4">
            {dances.map((dance) => (
              <div key={dance.id} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                <span className="font-semibold text-gray-900 min-w-32">{dance.name}</span>
                <select
                  value={currentSelections[dance.id] || ''}
                  onChange={(e) => handleLevelSelect(dance.id, e.target.value || null)}
                  className="border-2 border-gray-300 rounded px-4 py-2 text-gray-900 min-w-40"
                >
                  <option value="">Pas de cours</option>
                  {levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {dancers.length > 1 && (
          <div className="flex gap-4 mb-8">
            <button
              onClick={handlePrevious}
              disabled={currentDancerIndex === 0}
              className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentDancerIndex > 0 ? `← Danseur précédent : ${dancers[currentDancerIndex - 1].firstName}` : '← Danseur précédent'}
            </button>
            <button
              onClick={handleNext}
              disabled={currentDancerIndex === dancers.length - 1}
              className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentDancerIndex < dancers.length - 1
                ? `Danseur suivant : ${dancers[currentDancerIndex + 1].firstName} →`
                : 'Danseur suivant →'}
            </button>
          </div>
        )}

        {currentDancerIndex === dancers.length - 1 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Avez-vous déjà participé à un stage Kdanse ?</h2>
            <p className="text-gray-600 mb-4">Merci de répondre pour valider votre inscription</p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer">
                <input
                  type="radio"
                  name="attendedKdanse"
                  checked={attendedKdanse === true}
                  onChange={() => setAttendedKdanse(true)}
                />
                <span className="text-gray-900">Oui</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer">
                <input
                  type="radio"
                  name="attendedKdanse"
                  checked={attendedKdanse === false}
                  onChange={() => setAttendedKdanse(false)}
                />
                <span className="text-gray-900">Non</span>
              </label>
            </div>
          </div>
        )}

        {currentDancerIndex === dancers.length - 1 && attendedKdanse === false && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Comment avez-vous connu notre stage ?</h2>
            <p className="text-gray-600 mb-4">Merci de répondre pour valider votre inscription</p>
            <div className="space-y-3">
              {acquisitionSources.map((source) => (
                <label key={source.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer">
                  <input
                    type="radio"
                    name="acquisitionSource"
                    value={source.id}
                    checked={acquisitionSourceId === source.id}
                    onChange={() => setAcquisitionSourceId(source.id)}
                  />
                  <span className="text-gray-900">{source.label}</span>
                </label>
              ))}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer">
                <input
                  type="radio"
                  name="acquisitionSource"
                  value={OTHER_SOURCE}
                  checked={acquisitionSourceId === OTHER_SOURCE}
                  onChange={() => setAcquisitionSourceId(OTHER_SOURCE)}
                />
                <span className="text-gray-900">Autre</span>
              </label>
              {acquisitionSourceId === OTHER_SOURCE && (
                <input
                  type="text"
                  value={acquisitionSourceOther}
                  onChange={(e) => setAcquisitionSourceOther(e.target.value)}
                  placeholder="Précisez"
                  className="w-full border-2 border-gray-300 rounded px-4 py-2 text-gray-900"
                />
              )}
            </div>
          </div>
        )}

        {/* Summary Button */}
        {currentDancerIndex === dancers.length - 1 && (
          <div>
            <button
              onClick={handleViewSummary}
              disabled={acquisitionAnswerMissing}
              className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 Voir le récapitulatif
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
