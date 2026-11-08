// Fichier Excel d'un point de rooming, au modèle « Répartition de chambres »
// fourni par le centre (Fleurs d'Aubrac) : mêmes textes, polices, couleurs,
// bordures et largeurs. Si un tableau dépasse les 29 lignes du modèle, des
// lignes sont ajoutées (accord du centre) et les totaux descendent d'autant.

import type ExcelJS from 'exceljs';
import type { RoomType } from '@/lib/rooming';
import type { RoomingSettings } from '@/lib/roomingPlan';
import { longDate, PointLine, pointTotals, PointRow, TYPE_ORDER } from '@/lib/roomingPoints';

const RED = 'FFFF0000';
const YELLOW = 'FFFFFF00';
// Couleurs du thème du modèle (accent1 / accent4 / accent6, éclaircies à 40 % et 80 %)
const HEAD: Record<RoomType, string> = { double: 'FF9DC3E6', twin: 'FFFFD966', single: 'FFA9D08E' };
const LIGHT: Record<RoomType, string> = { double: 'FFDEEBF7', twin: 'FFFFF2CC', single: 'FFE2EFDA' };
const STAFF_FILL = 'FFFFF2CC';
const TEMPLATE_ROWS = 29;
const FIRST_ROW = 8;

const INSTRUCTIONS =
  'En premier lieu, renseignez le nom de votre groupe et le N° de réservation, date de séjour et total de chambres. Ensuite il vous suffit de compléter le nom de vos participants dans les 3 tableaux ci-dessous correspondants ( chambre double, twin et/ou single). La zone "commentaire" sert pour les précisions du type rez-de-chaussée obligatoire, chambre PMR ou autre.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           Merci de ne pas modifier le modèle de ce document. Document à remplir de manière informatique (ne pas imprimer) et nous renvoyer, merci.';

// Colonnes de chaque tableau : numéro, nom(s), commentaire
const COLUMNS: Record<RoomType, { num: string; names: string[]; comment: string }> = {
  double: { num: 'A', names: ['B', 'C'], comment: 'D' },
  twin: { num: 'E', names: ['F', 'G'], comment: 'H' },
  single: { num: 'I', names: ['J'], comment: 'K' },
};

const TITLES: Record<RoomType, { range: string; text: string }> = {
  double: { range: 'B6:D6', text: 'Chambre COUPLE (lit double suivant disponibilités)' },
  twin: { range: 'F6:H6', text: 'Chambre Twin (2 lits séparés)' },
  single: { range: 'J6:K6', text: 'Chambre single (personne seule)' },
};

const thin = { style: 'thin' as const };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const solid = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

export interface RoomingWorkbookInput {
  settings: RoomingSettings;
  date: string; // AAAA-MM-JJ
  lines: Record<RoomType, PointLine[]>;
  rows: PointRow[]; // chambres du point (sans les barrées), pour les totaux
}

export const buildRoomingWorkbook = async ({ settings, date, lines, rows }: RoomingWorkbookInput): Promise<ArrayBuffer> => {
  const { default: Excel } = await import('exceljs');
  const wb = new Excel.Workbook();
  const ws = wb.addWorksheet('Feuil1', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  const widths: Record<string, number> = { A: 3.2, B: 25.7, C: 25.7, D: 22.7, E: 3.2, F: 25.7, G: 25.7, H: 22.7, I: 3.2, J: 25.7, K: 22.7 };
  Object.entries(widths).forEach(([col, width]) => (ws.getColumn(col).width = width));
  const font = (size = 11, extra: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: 'Calibri', size, ...extra });

  // En-tête
  ws.mergeCells('B1:K1');
  const title = ws.getCell('B1');
  title.value = `Merci de compléter ce document "Répartiton de chambres" au ${longDate(date)}`;
  title.font = font(16, { bold: true });
  title.alignment = { horizontal: 'center' };
  title.fill = solid(YELLOW);
  ws.mergeCells('B2:K3');
  const help = ws.getCell('B2');
  help.value = INSTRUCTIONS;
  help.font = font(11);
  help.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(1).height = 21;
  ws.getRow(3).height = 29.25;

  const totals = pointTotals(rows);
  const header: [string, string, string, string, boolean][] = [
    ['B4', 'Groupe:', 'C4:D4', settings.groupName ?? '', false],
    ['F4', 'Date Séjour :', 'G4:H4', settings.stayLabel ?? '', false],
    ['B5', 'Résa N°:', 'C5:D5', settings.bookingRef ?? '', false],
    ['F5', 'Total chambres:', 'G5:H5', `${totals.rooms} CHAMBRES (${totals.people} personnes)`, true],
  ];
  for (const [labelCell, label, range, value, highlight] of header) {
    const l = ws.getCell(labelCell);
    l.value = label;
    l.font = font(16, { bold: true });
    l.alignment = { horizontal: 'right', vertical: 'middle' };
    l.border = box;
    ws.mergeCells(range);
    const v = ws.getCell(range.split(':')[0]);
    v.value = value;
    v.font = font(16, { color: { argb: RED } });
    v.alignment = { horizontal: 'center' };
    v.border = box;
    if (highlight) v.fill = solid(YELLOW);
  }
  [4, 5, 6].forEach((r) => (ws.getRow(r).height = 21));

  // Tableaux
  const dataRows = Math.max(TEMPLATE_ROWS, ...TYPE_ORDER.map((t) => lines[t].length));
  const lastRow = FIRST_ROW + dataRows - 1;
  ws.getRow(7).height = 16;

  for (const type of TYPE_ORDER) {
    const cols = COLUMNS[type];
    ws.mergeCells(TITLES[type].range);
    const t = ws.getCell(TITLES[type].range.split(':')[0]);
    t.value = TITLES[type].text;
    t.font = font(16, { bold: true });
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    t.fill = solid(HEAD[type]);
    t.border = box;

    const heads: [string, string, boolean][] = [
      [cols.num, '#', true],
      ...cols.names.map((c): [string, string, boolean] => [c, 'Civilité +NOM + Prénom', true]),
      [cols.comment, 'Commentaires', type === 'twin'],
    ];
    for (const [col, text, bold] of heads) {
      const c = ws.getCell(`${col}7`);
      c.value = text;
      c.font = font(11, { bold });
      c.alignment = col === cols.num ? { horizontal: 'center', vertical: 'middle' } : { vertical: 'middle' };
      c.fill = solid(LIGHT[type]);
      c.border = box;
    }

    for (let i = 0; i < dataRows; i++) {
      const r = FIRST_ROW + i;
      const line = lines[type][i];
      const num = ws.getCell(`${cols.num}${r}`);
      num.value = line ? line.number : null;
      num.font = font(11, { bold: true });
      num.alignment = { horizontal: 'center', vertical: 'middle' };
      num.fill = solid(LIGHT[type]);
      num.border = box;

      const struck = line?.status === 'struck';
      const red = line && line.status !== 'same';
      const fill = line?.staff ? solid(STAFF_FILL) : undefined;
      cols.names.forEach((col, slot) => {
        const c = ws.getCell(`${col}${r}`);
        c.value = line?.names[slot] ?? null;
        c.font = font(11, red ? { color: { argb: RED }, strike: struck } : {});
        c.alignment = { vertical: 'middle' };
        c.border = box;
        if (fill) c.fill = fill;
      });
      const comment = ws.getCell(`${cols.comment}${r}`);
      comment.value = line?.comment || null;
      comment.font = font(10, red || line?.commentChanged ? { color: { argb: RED } } : {});
      comment.alignment = { vertical: 'middle', wrapText: true };
      comment.border = box;
      if (fill) comment.fill = fill;

      // Ligne plus haute quand un commentaire long passe sur deux lignes
      const longest = Math.max(0, ...TYPE_ORDER.map((t2) => (lines[t2][i]?.comment ?? '').length));
      if (longest > 28) ws.getRow(r).height = 30;
    }
  }

  // Totaux (calculés ici : pas de formule à corriger à la main)
  const base = lastRow + 2;
  const sideLeft = { left: { style: 'medium' as const } };
  const put = (addr: string, value: string | number, opts: { red?: boolean; border?: Partial<ExcelJS.Borders> } = {}) => {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = font(11, opts.red ? { color: { argb: RED } } : {});
    c.alignment = { vertical: 'middle' };
    if (opts.border) c.border = opts.border;
  };
  put(`B${base}`, 'Nombre de chambres ', { red: true, border: { left: { style: 'medium' }, top: { style: 'medium' } } });
  put(`B${base + 1}`, 'en chambre double 1 lit :', { border: sideLeft });
  put(`C${base + 1}`, totals.doubles);
  put(`F${base + 1}`, 'en chambre double 2 lits :');
  put(`G${base + 1}`, totals.twins);
  put(`J${base + 1}`, 'en chambre individuelle :');
  put(`K${base + 1}`, totals.singles);
  put(`B${base + 2}`, 'TOTAL =', { red: true, border: { left: { style: 'medium' }, bottom: { style: 'medium' } } });
  put(`C${base + 2}`, totals.rooms, { red: true, border: { bottom: { style: 'medium' } } });

  put(`B${base + 5}`, 'Nombre de personnes', { red: true, border: { left: { style: 'medium' }, top: { style: 'medium' } } });
  put(`B${base + 6}`, 'Chambres double 1 lit :', { border: sideLeft });
  put(`C${base + 6}`, totals.peopleDoubles);
  put(`F${base + 6}`, 'Chambre double 2 lits :');
  put(`G${base + 6}`, totals.peopleTwins);
  put(`J${base + 6}`, 'Chambre individuelle :');
  put(`K${base + 6}`, totals.peopleSingles);
  put(`B${base + 7}`, 'TOTAL =', { red: true, border: { left: { style: 'medium' }, bottom: { style: 'medium' } } });
  put(`C${base + 7}`, totals.people, { red: true, border: { bottom: { style: 'medium' } } });

  ws.pageSetup.printArea = `A1:K${base + 7}`;
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
};

export const downloadBuffer = (buffer: ArrayBuffer, fileName: string) => {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
