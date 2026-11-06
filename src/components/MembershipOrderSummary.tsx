import { Membership } from '@/types';

const Row = ({ label, value, tone, bold }: { label: string; value: string; tone?: 'green' | 'muted'; bold?: boolean }) => (
  <div className={`flex justify-between gap-4 ${bold ? 'font-bold pt-2 border-t' : ''} ${tone === 'green' ? 'text-green-700' : ''}`}>
    <span className={tone === 'muted' ? 'italic text-gray-700' : ''}>{label}</span>
    <span className={tone === 'muted' ? 'italic text-gray-700' : ''}>{value}</span>
  </div>
);

// Récapitulatif de commande : danseurs, accompagnateurs, hébergement, prix et assurance
export default function MembershipOrderSummary({ membership }: { membership: Membership }) {
  const details = membership.registrationDetails;
  const breakdown = membership.priceBreakdown;
  const accompanists = details.accompanistDetails?.filter((a) => a.firstName || a.lastName) ?? [];
  const soloCount = details.housingSolo ?? 0;
  const coupleCount = details.housingCouple ?? 0;

  return (
    <div className="bg-gold-50 rounded border border-gold-200 p-4 space-y-3 text-sm">
      <p className="font-semibold text-gray-900">🧾 Récapitulatif de commande</p>

      <div>
        <p className="font-semibold text-gray-900">Danseurs</p>
        {details.dancers.map((dancer, idx) => (
          <p key={idx} className="text-gray-900">
            {[dancer.firstName, dancer.lastName].filter(Boolean).join(' ') || `Danseur ${idx + 1}`}
            <span className="text-gray-700">
              {' · '}
              {dancer.licensed ? 'licencié FFDanse' : 'non licencié'}
            </span>
          </p>
        ))}
      </div>

      {details.accompanists > 0 && (
        <div>
          <p className="font-semibold text-gray-900">Accompagnateurs</p>
          {accompanists.length > 0 ? (
            accompanists.map((a, idx) => (
              <p key={idx} className="text-gray-900">{`${a.firstName} ${a.lastName}`.trim()}</p>
            ))
          ) : (
            <p className="text-gray-900">{details.accompanists}</p>
          )}
        </div>
      )}

      {details.wantHousing && (
        <div>
          <p className="font-semibold text-gray-900">Hébergement</p>
          {soloCount > 0 && (
            <Row
              label={`${soloCount} chambre(s) 1 personne${breakdown ? ` (${soloCount} × ${breakdown.housingSoloPrice}€)` : ''}`}
              value={breakdown ? `${soloCount * breakdown.housingSoloPrice}€` : ''}
            />
          )}
          {coupleCount > 0 && (
            <Row
              label={`${coupleCount} chambre(s) 2 personnes${breakdown ? ` (${coupleCount} × ${breakdown.housingCouplePrice}€)` : ''}`}
              value={breakdown ? `${coupleCount * breakdown.housingCouplePrice}€` : ''}
            />
          )}
        </div>
      )}

      <div className="space-y-1">
        {breakdown && <Row label="Stage" value={`${breakdown.stageTotal}€`} />}
        {breakdown && breakdown.housingTotal > 0 && <Row label="Hébergement" value={`${breakdown.housingTotal}€`} />}
        {!!membership.discountAmount && (
          <Row
            label={`Réduction${membership.discountCode ? ` ${membership.discountCode}` : ''}`}
            value={`−${membership.discountAmount}€`}
            tone="green"
          />
        )}
        {membership.insuranceChosen === true && (
          <Row
            label={`Assurance annulation${membership.insurancePercent ? ` ${membership.insurancePercent} %` : ''} (non remboursable)`}
            value={`${membership.insuranceAmount ?? 0}€`}
          />
        )}
        {membership.insuranceChosen === false && (
          <Row label="Assurance annulation" value="pas souscrite" tone="muted" />
        )}
        <Row label="Total" value={`${membership.amount}€`} bold />
      </div>
    </div>
  );
}
