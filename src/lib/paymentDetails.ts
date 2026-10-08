import { deleteField } from 'firebase/firestore';
import { Membership, PaymentDetailsDraft, PaymentInstallment } from '@/types';

const CHEQUE_KEYS = ['chequeNumber', 'chequeBank', 'chequeCity', 'chequeName'] as const;

export const toInputDate = (value: Date | string): string =>
  new Date(value).toISOString().slice(0, 10);

export const draftFromInstallment = (inst: PaymentInstallment): PaymentDetailsDraft => ({
  amount: inst.amount,
  method: inst.method,
  date: toInputDate(inst.dueDate),
  chequeNumber: inst.chequeNumber,
  chequeBank: inst.chequeBank,
  chequeCity: inst.chequeCity,
  chequeName: inst.chequeName,
  chequeVacancesCount: inst.chequeVacancesCount,
});

export const draftFromMembership = (membership: Membership): PaymentDetailsDraft => ({
  amount: membership.amount,
  method: (membership.paymentMethod as PaymentDetailsDraft['method']) || 'cheque',
  date: toInputDate(membership.paymentDate || membership.createdAt),
  chequeNumber: membership.chequeNumber,
  chequeBank: membership.chequeBank,
  chequeCity: membership.chequeCity,
  chequeName: membership.chequeName,
});

// Champs de détail utiles au mode choisi; les champs non utiles sont supprimés du document
export const toPaymentDetailsUpdate = (draft: PaymentDetailsDraft) => {
  const isCheque = draft.method === 'cheque';
  const isChequeVacances = draft.method === 'cheque_vacances';
  const update: Record<string, unknown> = {};

  for (const key of CHEQUE_KEYS) {
    const value = draft[key]?.trim();
    update[key] = isCheque && value ? value : deleteField();
  }

  update.chequeVacancesCount =
    isChequeVacances && draft.chequeVacancesCount && draft.chequeVacancesCount > 0
      ? draft.chequeVacancesCount
      : deleteField();

  return update;
};
