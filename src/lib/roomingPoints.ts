// Points intermédiaires du rooming : état figé à une date, envoyé au centre.
//
// D'un point à l'autre, on reprend la façon de faire du club :
// - une chambre nouvelle ou modifiée est écrite en rouge ;
// - l'ancienne version d'une chambre qui a changé ou disparu reste en rouge
//   barré, sans numéro et sans être comptée, avec un commentaire qui dit ce
//   que sont devenues les personnes ;
// - au point suivant, les lignes barrées disparaissent et le rouge redevient noir.
//
// Une chambre est « la même » qu'au point précédent si elle a le même type et
// les mêmes personnes ; un simple changement de commentaire est marqué en rouge
// sur le commentaire seulement.

import type { RoomType } from '@/lib/rooming';
import type { RoomingRow } from '@/lib/roomingPlan';

export interface PointRow {
  type: RoomType;
  names: string[];
  comment: string;
  staff: boolean;
}

export interface RoomingPoint {
  id?: string;
  number: number;
  date: string; // AAAA-MM-JJ
  rows: PointRow[];
  createdBy?: string;
}

export type LineStatus = 'same' | 'new' | 'struck';

export interface PointLine extends PointRow {
  status: LineStatus;
  commentChanged: boolean;
  number: number | null; // numéro dans son tableau, null si barrée
}

export const TYPE_ORDER: RoomType[] = ['double', 'twin', 'single'];

const STRUCK_TYPE_LABELS: Record<RoomType, string> = {
  double: 'en chambre couple',
  twin: 'en chambre 2 lits',
  single: 'en chambre seule',
};

export const toPointRows = (rows: RoomingRow[]): PointRow[] =>
  rows.map((r) => ({ type: r.type, names: r.names, comment: r.comment, staff: r.staff }));

const norm = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
const keyOf = (r: PointRow) => `${r.type}|${r.names.map(norm).sort().join('|')}`;

// Ce que sont devenues les personnes d'une chambre barrée
const struckComment = (row: PointRow, current: PointRow[]) =>
  row.names
    .map((name) => {
      const now = current.find((r) => r.names.some((n) => norm(n) === norm(name)));
      if (!now) return `${name} : désistement`;
      const others = now.names.filter((n) => norm(n) !== norm(name));
      return `${name} ${STRUCK_TYPE_LABELS[now.type]}${others.length ? ` avec ${others.join(', ')}` : ''}`;
    })
    .join(' ; ');

// Lignes de chaque tableau pour le point `current`, comparé au point précédent
// (null pour le premier point : tout est en noir).
export const pointLines = (current: PointRow[], previous: PointRow[] | null): Record<RoomType, PointLine[]> => {
  const result: Record<RoomType, PointLine[]> = { double: [], twin: [], single: [] };

  if (!previous) {
    for (const row of current) result[row.type].push({ ...row, status: 'same', commentChanged: false, number: null });
  } else {
    // Rapprochement des chambres identiques (type + personnes)
    const unmatched = new Map<string, number[]>();
    current.forEach((row, i) => unmatched.set(keyOf(row), [...(unmatched.get(keyOf(row)) ?? []), i]));
    const used = new Set<number>();

    // Ordre du point précédent : les chambres conservées et les barrées gardent leur place
    for (const prev of previous) {
      const candidates = unmatched.get(keyOf(prev)) ?? [];
      const index = candidates.shift();
      if (index !== undefined) {
        used.add(index);
        const row = current[index];
        result[row.type].push({ ...row, status: 'same', commentChanged: norm(row.comment) !== norm(prev.comment), number: null });
      } else {
        result[prev.type].push({
          ...prev,
          comment: struckComment(prev, current),
          status: 'struck',
          commentChanged: false,
          number: null,
        });
      }
    }
    // Puis les chambres nouvelles
    current.forEach((row, i) => {
      if (!used.has(i)) result[row.type].push({ ...row, status: 'new', commentChanged: false, number: null });
    });
  }

  for (const type of TYPE_ORDER) {
    // Encadrement en fin de tableau (tri stable)
    result[type].sort((a, b) => Number(a.staff) - Number(b.staff));
    let n = 0;
    for (const line of result[type]) line.number = line.status === 'struck' ? null : ++n;
  }
  return result;
};

export const pointTotals = (rows: PointRow[]) => {
  const count = (type: RoomType) => rows.filter((r) => r.type === type).length;
  const peopleIn = (type: RoomType) => rows.filter((r) => r.type === type).reduce((n, r) => n + r.names.length, 0);
  const doubles = count('double');
  const twins = count('twin');
  const singles = count('single');
  return {
    doubles,
    twins,
    singles,
    rooms: doubles + twins + singles,
    peopleDoubles: peopleIn('double'),
    peopleTwins: peopleIn('twin'),
    peopleSingles: peopleIn('single'),
    people: rows.reduce((n, r) => n + r.names.length, 0),
  };
};

export const pointChanges = (lines: Record<RoomType, PointLine[]>) => {
  const all = TYPE_ORDER.flatMap((t) => lines[t]);
  return {
    added: all.filter((l) => l.status === 'new').length,
    removed: all.filter((l) => l.status === 'struck').length,
    comments: all.filter((l) => l.commentChanged).length,
  };
};

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_PLAIN = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

// « 11 août 2026 »
export const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// « 15 au 22 aout », comme dans les noms de fichiers du club
export const stayShort = (start?: string, end?: string) => {
  const ok = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!ok(start) || !ok(end)) return '';
  const [, sm, sd] = start!.split('-').map(Number);
  const [, em, ed] = end!.split('-').map(Number);
  return sm === em ? `${sd} au ${ed} ${MONTHS_PLAIN[em - 1]}` : `${sd} ${MONTHS_PLAIN[sm - 1]} au ${ed} ${MONTHS_PLAIN[em - 1]}`;
};

export const pointFileName = (
  point: Pick<RoomingPoint, 'number' | 'date' | 'rows'>,
  groupName: string,
  stay: string
) => {
  const t = pointTotals(point.rows);
  const parts = [
    `${point.number}-${(groupName || 'GROUPE').toUpperCase()}`,
    `Rooming${stay ? ` ${stay}` : ''}`,
    `${t.people} personnes`,
    `${t.rooms} chambres au ${longDate(point.date)}`,
  ];
  return `${parts.join(' - ')}.xlsx`.replace(/[\\/:*?"<>|]/g, '');
};
