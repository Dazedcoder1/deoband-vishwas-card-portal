import { WARDS } from '../db.js';
import { normalizeMobile, isValidMobile } from './cards.js';

const clean = (v, max = 200) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));

/** Validates beneficiary fields. `partial` = only validate fields that are present (for PATCH). */
export function validateCardInput(body = {}, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (k) => !partial || body[k] !== undefined;

  if (has('fullName')) {
    data.fullName = clean(body.fullName, 120);
    if (data.fullName.length < 3) errors.push('Beneficiary full name is required.');
  }
  if (has('mobile')) {
    data.mobile = normalizeMobile(body.mobile);
    if (!isValidMobile(data.mobile)) errors.push('Enter a valid 10-digit Indian mobile number.');
  }
  if (has('ward')) {
    data.ward = clean(body.ward, 80);
    if (!WARDS.includes(data.ward)) errors.push('Select a valid village / ward.');
  }
  if (has('familyMembers')) {
    data.familyMembers = parseInt(body.familyMembers, 10);
    if (!(data.familyMembers >= 1 && data.familyMembers <= 20)) errors.push('Family members must be between 1 and 20.');
  }
  if (has('voterId')) data.voterId = clean(body.voterId, 20).toUpperCase() || null;
  if (has('address')) data.address = clean(body.address, 300) || null;
  if (has('dob')) {
    data.dob = clean(body.dob, 10) || null;
    if (data.dob && !/^\d{4}-\d{2}-\d{2}$/.test(data.dob)) errors.push('Date of birth must be a valid date.');
  }
  if (has('gender')) {
    data.gender = clean(body.gender, 10) || null;
    if (data.gender && !['male', 'female', 'other'].includes(data.gender)) errors.push('Invalid gender.');
  }
  return errors.length ? { errors } : { data };
}
