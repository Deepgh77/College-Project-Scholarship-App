/**
 * Eligibility Engine for End-to-End Scholarship Application Management System
 * Deterministic, explainable rule evaluation following Disjunctive Normal Form (OR of ANDs).
 */

const ALLOWED_FIELD_PATHS = [
  'category',
  'annualFamilyIncome',
  'age',
  'gender',
  'previousPercentage',
  'courseYear',
  'state',
  'isHandicapped',
  'disabilityPercentage',
  'collegeId',
];

/**
 * Deterministically calculates age in full years from date of birth.
 * @param {Date|string|null} dob - Date of birth
 * @param {Date} [currentDate=new Date()] - Reference evaluation date
 * @returns {number|null} Age in years or null if invalid/null
 */
function calculateAge(dob, currentDate = new Date()) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Extracts and normalizes genuine student value strictly from allowlist.
 * Ensures NULL never converts into synthetic values (e.g. 0, OPEN, MALE).
 */
function extractFieldValue(profile, fieldPath, evaluationDate = new Date()) {
  if (!profile) return null;

  switch (fieldPath) {
    case 'age':
      return calculateAge(profile.dob, evaluationDate);
    case 'annualFamilyIncome':
      return profile.annualFamilyIncome !== null && profile.annualFamilyIncome !== undefined
        ? Number(profile.annualFamilyIncome)
        : null;
    case 'previousPercentage':
      return profile.previousPercentage !== null && profile.previousPercentage !== undefined
        ? Number(profile.previousPercentage)
        : null;
    case 'courseYear':
      return profile.courseYear !== null && profile.courseYear !== undefined
        ? Number(profile.courseYear)
        : null;
    case 'disabilityPercentage':
      return profile.disabilityPercentage !== null && profile.disabilityPercentage !== undefined
        ? Number(profile.disabilityPercentage)
        : null;
    case 'isHandicapped':
      return profile.isHandicapped === true;
    case 'category':
      return profile.category || null;
    case 'gender':
      return profile.gender || null;
    case 'state':
      return profile.state || null;
    case 'collegeId':
      return profile.collegeId || null;
    default:
      return null;
  }
}

/**
 * Validates that rule targetValue is compatible with operator and fieldPath.
 */
function validateRuleTarget(operator, targetValue) {
  switch (operator) {
    case 'LTE':
    case 'GTE':
      return typeof targetValue === 'number' && !isNaN(targetValue);
    case 'EQ':
    case 'NEQ':
      return (
        typeof targetValue === 'string' ||
        typeof targetValue === 'number' ||
        typeof targetValue === 'boolean'
      );
    case 'IN':
      return Array.isArray(targetValue) && targetValue.length > 0;
    default:
      return false;
  }
}

/**
 * Evaluates a single rule against genuine student profile data.
 */
function evaluateSingleRule(rule, profile, evaluationDate = new Date()) {
  const { id: ruleId, ruleGroup, fieldPath, operator, targetValue, failureReasonText } = rule;

  // 1. Strict Allowlist Enforcement
  if (!ALLOWED_FIELD_PATHS.includes(fieldPath)) {
    return {
      ruleId,
      ruleGroup,
      fieldPath,
      operator,
      targetValue,
      actualValue: null,
      status: 'CONFIG_ERROR',
      message: `Configuration error: Field '${fieldPath}' is not an authorized eligibility criterion.`,
      failureReason: failureReasonText,
    };
  }

  // 2. Validate Target Value Compatibility
  if (!validateRuleTarget(operator, targetValue)) {
    return {
      ruleId,
      ruleGroup,
      fieldPath,
      operator,
      targetValue,
      actualValue: null,
      status: 'CONFIG_ERROR',
      message: `Configuration error: Target value is malformed for operator '${operator}'.`,
      failureReason: failureReasonText,
    };
  }

  // 3. Extract Genuine Student Fact
  const actualValue = extractFieldValue(profile, fieldPath, evaluationDate);

  // 4. Strict NULL Handling: Missing fact cannot evaluate to true or false
  if (actualValue === null || actualValue === undefined) {
    let fieldDisplay = fieldPath;
    if (fieldPath === 'annualFamilyIncome') fieldDisplay = 'Annual family income';
    if (fieldPath === 'category') fieldDisplay = 'Caste category';
    if (fieldPath === 'age') fieldDisplay = 'Date of birth (for age calculation)';
    if (fieldPath === 'previousPercentage') fieldDisplay = 'Previous examination marks percentage';
    if (fieldPath === 'state') fieldDisplay = 'State of residence';
    if (fieldPath === 'collegeId') fieldDisplay = 'Registered institute';

    return {
      ruleId,
      ruleGroup,
      fieldPath,
      operator,
      targetValue,
      actualValue: null,
      status: 'INCOMPLETE',
      message: `${fieldDisplay} is missing from your profile.`,
      failureReason: failureReasonText,
    };
  }

  // 5. Deterministic Comparison
  let satisfied = false;
  switch (operator) {
    case 'LTE':
      satisfied = Number(actualValue) <= Number(targetValue);
      break;
    case 'GTE':
      satisfied = Number(actualValue) >= Number(targetValue);
      break;
    case 'EQ':
      satisfied = actualValue === targetValue;
      break;
    case 'NEQ':
      satisfied = actualValue !== targetValue;
      break;
    case 'IN':
      satisfied = Array.isArray(targetValue) && targetValue.includes(actualValue);
      break;
  }

  if (satisfied) {
    return {
      ruleId,
      ruleGroup,
      fieldPath,
      operator,
      targetValue,
      actualValue,
      status: 'SATISFIED',
      message: `Requirement satisfied (${fieldPath}: ${actualValue}).`,
      failureReason: null,
    };
  } else {
    return {
      ruleId,
      ruleGroup,
      fieldPath,
      operator,
      targetValue,
      actualValue,
      status: 'FAILED',
      message: failureReasonText || `Requirement not met for ${fieldPath}.`,
      failureReason: failureReasonText,
    };
  }
}

/**
 * Evaluates all rules of a scholarship for a given student profile.
 * Follows Disjunctive Normal Form (OR-of-ANDs):
 * - Within one ruleGroup:
 *     - ALL rules SATISFIED -> group = SATISFIED
 *     - ANY rule FAILED -> group = FAILED
 *     - NO rule FAILED, but one or more rules are INCOMPLETE -> group = INCOMPLETE
 * - Across multiple ruleGroups:
 *     - IF ANY group is SATISFIED -> overall = ELIGIBLE
 *     - ELSE IF ALL groups are FAILED -> overall = NOT_ELIGIBLE
 *     - ELSE -> overall = INCOMPLETE
 *
 * @param {Array} rules - List of ScholarshipRule records
 * @param {Object|null} profile - StudentProfile record
 * @param {Date} [evaluationDate=new Date()] - Evaluation reference date
 * @returns {Object} Deterministic explainable evaluation result
 */
function evaluateScholarshipEligibility(rules, profile, evaluationDate = new Date()) {
  if (!rules || rules.length === 0) {
    return {
      status: 'ELIGIBLE',
      isEligible: true,
      summary: 'No specific eligibility criteria configured. Open to all students.',
      evaluatedGroups: [],
      missingFields: [],
      failedReasons: [],
    };
  }

  // 1. Group rules by ruleGroup
  const groupsMap = {};
  for (const rule of rules) {
    const g = rule.ruleGroup || 'DEFAULT';
    if (!groupsMap[g]) groupsMap[g] = [];
    groupsMap[g].push(rule);
  }

  const evaluatedGroups = [];
  const missingFieldsSet = new Set();
  const failedReasonsSet = new Set();

  for (const [groupName, groupRules] of Object.entries(groupsMap)) {
    const evaluatedRules = groupRules.map((r) => evaluateSingleRule(r, profile, evaluationDate));

    // Determine group status:
    // ALL SATISFIED -> SATISFIED
    // ANY FAILED (or CONFIG_ERROR) -> FAILED
    // NO FAILED, but one or more INCOMPLETE -> INCOMPLETE
    let hasFailed = false;
    let hasIncomplete = false;

    for (const res of evaluatedRules) {
      if (res.status === 'FAILED' || res.status === 'CONFIG_ERROR') {
        hasFailed = true;
        if (res.failureReason) failedReasonsSet.add(res.failureReason);
      } else if (res.status === 'INCOMPLETE') {
        hasIncomplete = true;
        missingFieldsSet.add(res.fieldPath);
      }
    }

    let groupStatus = 'SATISFIED';
    if (hasFailed) {
      groupStatus = 'FAILED';
    } else if (hasIncomplete) {
      groupStatus = 'INCOMPLETE';
    }

    evaluatedGroups.push({
      groupName,
      status: groupStatus,
      rules: evaluatedRules,
    });
  }

  // Across multiple ruleGroups (OR semantics):
  // - IF ANY group is SATISFIED -> overall = ELIGIBLE
  // - ELSE IF ALL groups are FAILED -> overall = NOT_ELIGIBLE
  // - ELSE -> overall = INCOMPLETE
  const anySatisfied = evaluatedGroups.some((g) => g.status === 'SATISFIED');
  const allFailed = evaluatedGroups.every((g) => g.status === 'FAILED');

  let overallStatus = 'INCOMPLETE';
  let summary = '';

  if (anySatisfied) {
    overallStatus = 'ELIGIBLE';
    summary = 'All eligibility criteria are satisfied.';
  } else if (allFailed) {
    overallStatus = 'NOT_ELIGIBLE';
    summary = 'You do not meet the criteria for this scholarship.';
  } else {
    overallStatus = 'INCOMPLETE';
    const missingArr = Array.from(missingFieldsSet);
    summary =
      missingArr.length > 0
        ? `Profile incomplete: Missing required information (${missingArr.join(', ')}).`
        : 'Additional information is required to evaluate eligibility.';
  }

  return {
    status: overallStatus,
    isEligible: overallStatus === 'ELIGIBLE',
    summary,
    evaluatedGroups,
    missingFields: Array.from(missingFieldsSet),
    failedReasons: Array.from(failedReasonsSet),
  };
}

module.exports = {
  ALLOWED_FIELD_PATHS,
  calculateAge,
  extractFieldValue,
  validateRuleTarget,
  evaluateSingleRule,
  evaluateScholarshipEligibility,
};
