// Rooming d'un stage : liste des chambres à transmettre au centre, calculée à
// partir des inscriptions (registrationDetails.rooms) et des corrections de
// l'admin (type attribué par le centre, commentaire), rangées dans
// rooming/{stageId}.
//
// Entrent dans le rooming les inscriptions avec hébergement qui ont au moins
// un paiement validé : payées, ou en échéancier avec au moins une échéance
// reçue. Les inscriptions gratuites (bénévoles, profs) sont payées d'office et
// marquées « Encadrement ».

import {
  capacityOf,
  hotelName,
  personFallbackLabel,
  RoomingPerson,
  RoomRequest,
  roomingPeople,
  RoomType,
  syncRooms,
} from '@/lib/rooming';

export interface RoomingSettings {
  groupName?: string;
  bookingRef?: string;
  stayLabel?: string;
  contractRooms?: number | null;
}

export interface RoomOverride {
  type?: RoomType;
  comment?: string;
}

export interface RoomingDoc {
  settings?: RoomingSettings;
  overrides?: Record<string, RoomOverride>;
}

export interface RoomingMembership {
  id: string;
  status?: string;
  paymentPlanId?: string | null;
  freeRole?: string;
  createdAt?: Date;
  registrationDetails?: {
    dancers?: { firstName?: string; lastName?: string; civility?: 'M.' | 'Mme' | '' }[];
    accompanists?: number;
    accompanistDetails?: { firstName?: string; lastName?: string; civility?: 'M.' | 'Mme' | '' }[];
    wantHousing?: boolean;
    housingSolo?: number;
    housingCouple?: number;
    rooms?: RoomRequest[];
  };
}

export interface RoomingRow {
  id: string; // `${membershipId}:${roomIndex}`, stable tant que l'inscription ne change pas ses chambres
  membershipId: string;
  roomIndex: number;
  requestedType: RoomType;
  type: RoomType; // attribué : correction admin, sinon demandé
  names: string[]; // « M. NOM Prénom », dans l'ordre des places
  comment: string; // commentaire transmis au centre
  memberComment: string;
  staff: boolean;
  issues: string[];
}

export interface RoomingIssue {
  membershipId: string;
  label: string;
  message: string;
}

export interface RoomingResult {
  rows: RoomingRow[];
  pending: { membershipId: string; label: string; status: string }[];
  issues: RoomingIssue[];
}

export const STAFF_COMMENT = 'Encadrement';

const VALIDATED_STATUSES = new Set(['paid', 'active', 'completed']);

export const hasValidatedPayment = (m: RoomingMembership, receivedPlanIds: Set<string>) =>
  m.status !== 'cancelled' &&
  (VALIDATED_STATUSES.has(m.status ?? '') || (!!m.paymentPlanId && receivedPlanIds.has(m.paymentPlanId)));

const peopleOf = (m: RoomingMembership): RoomingPerson[] => roomingPeople(m.registrationDetails ?? {});

const labelOf = (m: RoomingMembership) => {
  const names = peopleOf(m)
    .map((p) => [p.firstName, p.lastName].filter(Boolean).join(' '))
    .filter(Boolean);
  return names.join(', ') || m.id;
};

export const computeRooming = (
  memberships: RoomingMembership[],
  receivedPlanIds: Set<string>,
  overrides: Record<string, RoomOverride> = {}
): RoomingResult => {
  const rows: RoomingRow[] = [];
  const pending: RoomingResult['pending'] = [];
  const issues: RoomingIssue[] = [];

  const sorted = [...memberships].sort(
    (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
  );

  for (const m of sorted) {
    const details = m.registrationDetails ?? {};
    if (!details.wantHousing || m.status === 'cancelled') continue;
    if (!hasValidatedPayment(m, receivedPlanIds)) {
      pending.push({ membershipId: m.id, label: labelOf(m), status: m.status ?? '' });
      continue;
    }

    const people = peopleOf(m);
    const stored = details.rooms ?? [];
    const rooms = stored.length
      ? stored
      : syncRooms(details.housingSolo ?? 0, details.housingCouple ?? 0, people);
    const label = labelOf(m);
    const staff = !!m.freeRole;

    if (!stored.length) {
      issues.push({ membershipId: m.id, label, message: 'Répartition dans les chambres non saisie : proposée automatiquement, à vérifier' });
    }
    const placed = new Set(rooms.flatMap((r) => r.occupants));
    const missing = people.filter((p) => !placed.has(p.key));
    if (missing.length) {
      issues.push({
        membershipId: m.id,
        label,
        message: `Sans chambre : ${missing.map((p) => [p.firstName, p.lastName].filter(Boolean).join(' ') || personFallbackLabel(p.key)).join(', ')}`,
      });
    }
    const noCivility = people.filter((p) => placed.has(p.key) && !p.civility);
    if (noCivility.length) {
      issues.push({
        membershipId: m.id,
        label,
        message: `Civilité manquante : ${noCivility.map((p) => [p.firstName, p.lastName].filter(Boolean).join(' ') || personFallbackLabel(p.key)).join(', ')}`,
      });
    }

    rooms.forEach((room, roomIndex) => {
      const id = `${m.id}:${roomIndex}`;
      const override = overrides[id] ?? {};
      const names = room.occupants.map((key) => {
        const person = people.find((p) => p.key === key);
        return person ? hotelName(person) || personFallbackLabel(key) : personFallbackLabel(key);
      });
      // Une chambre 2 personnes occupée par une seule personne reste une
      // chambre 2 personnes (payée comme telle) ; seul l'admin peut la passer en single
      let type: RoomType = override.type ?? room.type;
      if (capacityOf(type) < names.length) type = room.type;
      const memberComment = (room.comment ?? '').trim();
      const comment =
        override.comment !== undefined
          ? override.comment
          : [staff ? STAFF_COMMENT : '', memberComment].filter(Boolean).join(' - ');
      const rowIssues: string[] = [];
      if (names.length === 0) rowIssues.push('Chambre sans occupant');
      else if (names.length < capacityOf(type)) rowIssues.push('Une place libre');
      rows.push({
        id,
        membershipId: m.id,
        roomIndex,
        requestedType: room.type,
        type,
        names,
        comment,
        memberComment,
        staff,
        issues: rowIssues,
      });
      if (rowIssues.length) issues.push({ membershipId: m.id, label, message: `Chambre ${roomIndex + 1} : ${rowIssues.join(', ')}` });
    });
  }

  // Encadrement en fin de tableau, comme dans les fichiers envoyés au centre
  rows.sort((a, b) => Number(a.staff) - Number(b.staff));
  return { rows, pending, issues };
};

export const roomingTotals = (rows: RoomingRow[]) => {
  const count = (type: RoomType) => rows.filter((r) => r.type === type).length;
  const doubles = count('double');
  const twins = count('twin');
  const singles = count('single');
  const people = rows.reduce((n, r) => n + r.names.length, 0);
  return { doubles, twins, singles, rooms: doubles + twins + singles, people };
};
