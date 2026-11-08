// Répartition des personnes d'une inscription dans les chambres réservées.
//
// Les personnes sont désignées par une clé stable liée à leur place dans
// l'inscription : « d0 », « d1 » pour les danseurs, « a0 », « a1 »… pour les
// accompagnateurs. Les noms peuvent donc changer (récapitulatif du panier,
// modification admin) sans casser la répartition.
//
// Le nombre de chambres reste porté par housingSolo / housingCouple (tarif) ;
// `rooms` détaille chaque chambre : type demandé, occupants, commentaire.
// Le lit double est une DEMANDE du danseur : le centre peut attribuer une
// chambre 2 lits à la place (géré plus tard dans la page Rooming).

export type Civility = 'M.' | 'Mme';
export const CIVILITIES: Civility[] = ['M.', 'Mme'];

export type RoomType = 'single' | 'double' | 'twin';

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Chambre 1 personne',
  double: 'Chambre 2 personnes, lit double',
  twin: 'Chambre 2 personnes, 2 lits séparés',
};

export interface RoomRequest {
  type: RoomType;
  occupants: string[];
  comment?: string;
  // Occupants choisis à la main : la répartition automatique n'y touche plus
  chosen?: boolean;
}

export interface RoomingPerson {
  key: string;
  firstName?: string;
  lastName?: string;
  civility?: Civility | '';
}

interface RoomingConfig {
  dancers?: { firstName?: string; lastName?: string; civility?: Civility | '' }[];
  accompanistDetails?: { firstName?: string; lastName?: string; civility?: Civility | '' }[];
  accompanists?: number;
  wantHousing?: boolean;
  housingSolo?: number;
  housingCouple?: number;
  rooms?: RoomRequest[];
}

export const capacityOf = (type: RoomType) => (type === 'single' ? 1 : 2);

export const roomingPeople = (config: RoomingConfig, dancerCount?: number): RoomingPerson[] => {
  const dancers = (config.dancers ?? []).slice(0, dancerCount ?? config.dancers?.length ?? 0);
  const accompanists = (config.accompanistDetails ?? []).slice(0, config.accompanists ?? config.accompanistDetails?.length ?? 0);
  return [
    ...dancers.map((d, i) => ({ key: `d${i}`, firstName: d.firstName, lastName: d.lastName, civility: d.civility })),
    ...accompanists.map((a, i) => ({ key: `a${i}`, firstName: a.firstName, lastName: a.lastName, civility: a.civility })),
  ];
};

// Libellé au format du centre : « M. NOM Prénom »
export const hotelName = (p: Pick<RoomingPerson, 'firstName' | 'lastName' | 'civility'>) =>
  [p.civility, (p.lastName ?? '').trim().toUpperCase(), (p.firstName ?? '').trim()].filter(Boolean).join(' ');

export const displayName = (p: RoomingPerson | undefined, fallback: string) => {
  const name = [p?.civility, p?.firstName?.trim(), p?.lastName?.trim()].filter(Boolean).join(' ');
  return name || fallback;
};

export const personFallbackLabel = (key: string) =>
  key.startsWith('d') ? `Danseur ${Number(key.slice(1)) + 1}` : `Accompagnateur ${Number(key.slice(1)) + 1}`;

// Met la liste des chambres en accord avec le nombre de chambres réservées et
// les personnes de l'inscription : garde les occupants choisis à la main,
// retire les personnes qui n'existent plus, puis place les autres dans l'ordre,
// chambres 2 personnes d'abord (un couple se retrouve dans la chambre double).
export const syncRooms = (
  housingSolo: number,
  housingCouple: number,
  people: RoomingPerson[],
  previous: RoomRequest[] = []
): RoomRequest[] => {
  const keys = new Set(people.map((p) => p.key));
  const clean = (r: RoomRequest): RoomRequest => ({
    ...r,
    occupants: r.chosen ? r.occupants.filter((k) => keys.has(k)).slice(0, capacityOf(r.type)) : [],
  });
  const prevDoubles = previous.filter((r) => r.type !== 'single').map(clean);
  const prevSingles = previous.filter((r) => r.type === 'single').map(clean);
  const doubles = Array.from({ length: Math.max(0, housingCouple) }, (_, i) =>
    prevDoubles[i] ?? { type: 'double' as RoomType, occupants: [] }
  );
  const singles = Array.from({ length: Math.max(0, housingSolo) }, (_, i) =>
    prevSingles[i] ?? { type: 'single' as RoomType, occupants: [] }
  );
  const rooms = [...doubles, ...singles];

  // Une personne ne peut être que dans une chambre
  const seen = new Set<string>();
  for (const room of rooms) {
    room.occupants = room.occupants.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
  }
  const unplaced = people.map((p) => p.key).filter((k) => !seen.has(k));
  for (const room of rooms) {
    while (unplaced.length && room.occupants.length < capacityOf(room.type)) {
      room.occupants.push(unplaced.shift()!);
    }
  }
  return rooms;
};

// Place `key` à la position `slot` de la chambre `roomIndex`. Si la personne
// était déjà ailleurs, elle échange sa place avec l'occupant actuel.
export const placePerson = (rooms: RoomRequest[], roomIndex: number, slot: number, key: string): RoomRequest[] => {
  const next = rooms.map((r) => ({ ...r, occupants: [...r.occupants] }));
  const target = next[roomIndex];
  const current = target.occupants[slot];
  if (key) {
    const fromRoom = next.findIndex((r) => r.occupants.includes(key));
    if (fromRoom >= 0) {
      const fromSlot = next[fromRoom].occupants.indexOf(key);
      if (current) next[fromRoom].occupants[fromSlot] = current;
      else next[fromRoom].occupants.splice(fromSlot, 1);
    }
  }
  if (key) target.occupants[slot] = key;
  else target.occupants.splice(slot, 1);
  target.occupants = target.occupants.filter(Boolean);
  // Dès qu'on choisit à la main, toute la répartition est figée
  return next.map((r) => ({ ...r, chosen: true }));
};

// Message d'erreur si la répartition est incomplète, sinon null
export const roomingError = (config: RoomingConfig, people: RoomingPerson[]): string | null => {
  if (!config.wantHousing) return null;
  const rooms = config.rooms ?? [];
  const capacity = rooms.reduce((n, r) => n + capacityOf(r.type), 0);
  if (rooms.length === 0) return 'Indiquez au moins une chambre';
  if (capacity < people.length) return `Pas assez de places : ${capacity} pour ${people.length} personnes`;
  const placed = new Set(rooms.flatMap((r) => r.occupants));
  const missing = people.filter((p) => !placed.has(p.key));
  if (missing.length) {
    return `Indiquez la chambre de : ${missing.map((p) => displayName(p, personFallbackLabel(p.key))).join(', ')}`;
  }
  const empty = rooms.findIndex((r) => r.occupants.length === 0);
  if (empty >= 0) return `La chambre ${empty + 1} n'a personne : retirez-la ou placez quelqu'un dedans`;
  if (people.some((p) => !p.civility)) return 'Indiquez la civilité (M. ou Mme) de chaque personne hébergée';
  return null;
};
