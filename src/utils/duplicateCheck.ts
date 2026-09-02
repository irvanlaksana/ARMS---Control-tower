import { Case, Customer } from '../types/arms';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchType?: 'CONTRACT_NO' | 'NIK' | 'CUSTOMER_ID' | 'DEBTOR_NAME';
  matchReason?: string;
  matchedCase?: Case;
  matchedCustomer?: Customer;
}

/**
 * Normalize text for robust duplicate comparison (lowercase, trimmed, stripping special punctuation)
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Check if a Debtor Case already exists for the specified Client
 */
export function findDuplicateCaseForClient(
  existingCases: Case[],
  targetClientId: string,
  params: {
    customerId?: string;
    debtorName?: string;
    debtorNik?: string;
    contractNo?: string;
    excludeCaseId?: string | null;
  }
): DuplicateDetectionResult {
  if (!targetClientId || !existingCases || existingCases.length === 0) {
    return { isDuplicate: false };
  }

  const normTargetContract = normalizeString(params.contractNo);
  const normTargetNik = normalizeString(params.debtorNik);
  const normTargetName = normalizeString(params.debtorName);

  for (const cs of existingCases) {
    // Skip the case currently being edited
    if (params.excludeCaseId && cs.id === params.excludeCaseId) {
      continue;
    }

    // Must belong to the same client
    if (cs.clientId !== targetClientId) {
      continue;
    }

    // 1. Check exact Customer ID
    if (params.customerId && cs.customerId && cs.customerId === params.customerId) {
      return {
        isDuplicate: true,
        matchType: 'CUSTOMER_ID',
        matchReason: `Debitur ${cs.debtorName} sudah terdaftar pada Klien ini dengan No. Perkara ${cs.caseNo}`,
        matchedCase: cs,
      };
    }

    // 2. Check Contract No
    if (normTargetContract && cs.multifinanceContractNo) {
      const normExistingContract = normalizeString(cs.multifinanceContractNo);
      if (normExistingContract && normExistingContract === normTargetContract) {
        return {
          isDuplicate: true,
          matchType: 'CONTRACT_NO',
          matchReason: `Nomor Kontrak "${cs.multifinanceContractNo}" sudah terdaftar pada Klien ini untuk debitur ${cs.debtorName} (No. Perkara: ${cs.caseNo})`,
          matchedCase: cs,
        };
      }
    }

    // 3. Check NIK KTP
    if (normTargetNik && normTargetNik.length >= 10 && cs.debtorNik) {
      const normExistingNik = normalizeString(cs.debtorNik);
      if (normExistingNik && normExistingNik === normTargetNik) {
        return {
          isDuplicate: true,
          matchType: 'NIK',
          matchReason: `NIK KTP "${cs.debtorNik}" sudah terdaftar pada Klien ini atas nama ${cs.debtorName} (No. Perkara: ${cs.caseNo})`,
          matchedCase: cs,
        };
      }
    }

    // 4. Check Debtor Name
    if (normTargetName && normTargetName.length >= 4 && cs.debtorName) {
      const normExistingName = normalizeString(cs.debtorName);
      if (normExistingName && normExistingName === normTargetName) {
        return {
          isDuplicate: true,
          matchType: 'DEBTOR_NAME',
          matchReason: `Nama Debitur "${cs.debtorName}" sudah terdaftar pada Klien ini dengan No. Perkara ${cs.caseNo} (No. Kontrak: ${cs.multifinanceContractNo})`,
          matchedCase: cs,
        };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Check if a Customer (Debtor master record) already exists in Customer Master
 */
export function findDuplicateCustomerMaster(
  existingCustomers: Customer[],
  params: {
    fullName?: string;
    nikKtp?: string;
    contractNo?: string;
    phone?: string;
    excludeCustomerId?: string | null;
  }
): { isDuplicate: boolean; matchReason?: string; matchedCustomer?: Customer } {
  if (!existingCustomers || existingCustomers.length === 0) {
    return { isDuplicate: false };
  }

  const normName = normalizeString(params.fullName);
  const normNik = normalizeString(params.nikKtp);
  const normContract = normalizeString(params.contractNo);

  for (const c of existingCustomers) {
    if (params.excludeCustomerId && c.id === params.excludeCustomerId) {
      continue;
    }

    if (normNik && normNik.length >= 10 && c.nikKtp && normalizeString(c.nikKtp) === normNik) {
      return {
        isDuplicate: true,
        matchReason: `NIK KTP "${c.nikKtp}" sudah terdaftar pada Master Debitur atas nama ${c.fullName}`,
        matchedCustomer: c,
      };
    }

    if (normContract && normContract.length >= 4 && c.contractNo && normalizeString(c.contractNo) === normContract) {
      return {
        isDuplicate: true,
        matchReason: `Nomor Kontrak "${c.contractNo}" sudah terdaftar atas nama ${c.fullName}`,
        matchedCustomer: c,
      };
    }

    if (normName && normName.length >= 4 && c.fullName && normalizeString(c.fullName) === normName) {
      return {
        isDuplicate: true,
        matchReason: `Nama Debitur "${c.fullName}" sudah terdaftar di Master Debitur (${c.nikKtp ? `NIK: ${c.nikKtp}` : `Kontrak: ${c.contractNo || '-'}`})`,
        matchedCustomer: c,
      };
    }
  }

  return { isDuplicate: false };
}
