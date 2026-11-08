'use client';

import {
  capacityOf,
  displayName,
  personFallbackLabel,
  placePerson,
  RoomingPerson,
  RoomRequest,
} from '@/lib/rooming';

interface Props {
  people: RoomingPerson[];
  rooms: RoomRequest[];
  onChange: (rooms: RoomRequest[]) => void;
}

// Répartition des personnes dans les chambres réservées : type de lit pour les
// chambres 2 personnes, occupants, commentaire pour le centre.
export default function RoomAssignment({ people, rooms, onChange }: Props) {
  if (rooms.length === 0) return null;
  const nameOf = (key: string) => displayName(people.find((p) => p.key === key), personFallbackLabel(key));

  const update = (index: number, changes: Partial<RoomRequest>) =>
    onChange(rooms.map((r, i) => (i === index ? { ...r, ...changes } : r)));

  return (
    <div className="space-y-3">
      <p className="font-medium text-gray-900">Qui dort dans quelle chambre ?</p>
      {rooms.map((room, index) => (
        <div key={index} className="bg-white border rounded p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-semibold text-gray-900">
              Chambre {index + 1} · {room.type === 'single' ? '1 personne' : '2 personnes'}
            </span>
            {room.type !== 'single' && (
              <div className="flex gap-4 text-gray-900">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={room.type === 'double'} onChange={() => update(index, { type: 'double' })} />
                  Lit double
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={room.type === 'twin'} onChange={() => update(index, { type: 'twin' })} />
                  2 lits séparés
                </label>
              </div>
            )}
          </div>
          <div className={`grid gap-3 ${capacityOf(room.type) === 2 ? 'sm:grid-cols-2' : ''}`}>
            {Array.from({ length: capacityOf(room.type) }, (_, slot) => (
              <select
                key={slot}
                value={room.occupants[slot] ?? ''}
                onChange={(e) => onChange(placePerson(rooms, index, slot, e.target.value))}
                className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 bg-white"
              >
                <option value="">{slot === 0 ? '— Choisir une personne —' : '— Place libre —'}</option>
                {people.map((p) => (
                  <option key={p.key} value={p.key}>
                    {nameOf(p.key)}
                  </option>
                ))}
              </select>
            ))}
          </div>
          <input
            type="text"
            placeholder="Commentaire pour le centre (rez-de-chaussée, PMR, proche de…), facultatif"
            value={room.comment ?? ''}
            onChange={(e) => update(index, { comment: e.target.value })}
            className="w-full border-2 border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-500"
          />
        </div>
      ))}
      <p className="text-sm text-gray-700">
        Le lit double est une demande : selon les disponibilités, le centre peut attribuer une chambre à 2 lits séparés.
      </p>
    </div>
  );
}

// Choix de la civilité, demandée par le centre d'hébergement
export function CivilitySelect({
  value,
  onChange,
  className = '',
}: {
  value: string | undefined;
  onChange: (value: 'M.' | 'Mme' | '') => void;
  className?: string;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value as 'M.' | 'Mme' | '')}
      className={`border-2 border-gray-300 rounded px-3 py-2 text-gray-900 bg-white ${className}`}
      aria-label="Civilité"
    >
      <option value="">Civilité</option>
      <option value="M.">M.</option>
      <option value="Mme">Mme</option>
    </select>
  );
}
