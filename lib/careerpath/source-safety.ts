const NEGATION_WORDS = /\b(?:never|not|no|didn['’]?t|did\s+not|haven['’]?t|have\s+not|hasn['’]?t|has\s+not|don['’]?t|do\s+not|doesn['’]?t|does\s+not|cannot|can['’]?t|without)\b/i;

const INSTRUCTIONAL_CLAIM_WORDS = /\b(?:add\s+that|say\s+that|claim\s+that|write\s+that|pretend(?:\s+that)?|invent(?:ed|ing)?|fabricat(?:e|ed|ing)|make\s+up|just\s+add)\b/i;

const DECEPTION_FRAMING = /\b(?:don['’]?t|do\s+not)\s+(?:call|label|treat)\s+(?:these|them|it)\s+(?:as\s+)?(?:fake|fabricated|invented|unverified)\b/i;
const VERIFICATION_BYPASS = /(?:\bno\s+need\s+to\s+(?:ask|verify|check)\b|\b(?:don['’]?t|do\s+not)\s+(?:ask|verify|check)\b|\bskip\s+(?:verification|evidence|proof)\b|\bwithout\s+(?:verification|evidence|proof)\b|\bregardless\s+of\s+(?:whether|if)\b|\b(?:i\s+)?(?:don['’]?t|do\s+not)\s+care\s+if\b.{0,120}\b(?:missing|unsupported|not\s+in|not\s+from)\b)/i;
const FACT_INSERTION = /\b(?:add|include|insert|put|state|claim|write|rewrite)\b/i;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function flexibleTermPattern(value: string) {
  return value.trim().split(/\s+/).map(escapeRegExp).join("\\s+");
}

function clauseBefore(text: string, index: number, maxLength = 180) {
  const prefix = text.slice(Math.max(0, index - maxLength), index);
  return prefix.split(/[.!?;\n]/).pop() || prefix;
}

/**
 * Detect explicit requests to put invented or deliberately unverified claims
 * into Career Memory. Legitimate commands such as "add my internship at X"
 * stay allowed. Requests that explicitly bypass verification are blocked before
 * any generative handler runs, even when they are disguised as a rewrite.
 */
export function isFabricationInstruction(message: string) {
  const text = message.replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (DECEPTION_FRAMING.test(text)) return true;
  if (INSTRUCTIONAL_CLAIM_WORDS.test(text)) return true;
  if (VERIFICATION_BYPASS.test(text) && FACT_INSERTION.test(text)) return true;
  if (/\bmake\s+(?:my|the)\s+(?:profile|resume|cv)\b.{0,80}\b(?:impressive|stronger|better)\b/i.test(text) && /\badd\b/i.test(text)) return true;
  if (/\badd\s+that\b/i.test(text) && /\b(?:expert|led|managed|increased|improved|users?|revenue|performance|team)\b/i.test(text)) return true;
  return false;
}

/** Return true when an action occurrence is locally negated or framed as an instruction. */
export function hasUnsafeActionContext(text: string, actionIndex: number) {
  const prefix = clauseBefore(text, actionIndex);
  if (INSTRUCTIONAL_CLAIM_WORDS.test(prefix)) return true;
  const tail = prefix.slice(-90);
  if (/\b(?:never|not|no|didn['’]?t|did\s+not|haven['’]?t|have\s+not|hasn['’]?t|has\s+not|don['’]?t|do\s+not|doesn['’]?t|does\s+not|cannot|can['’]?t)\b(?:\s+\w+){0,5}\s*$/i.test(tail)) return true;
  return false;
}

/**
 * A term is explicitly negative only when every occurrence lives in a clause
 * whose preceding context denies possession/knowledge/experience. This allows
 * a later affirmative statement to override an earlier negative one.
 */
export function isExplicitlyNegatedTerm(term: string, evidence: string) {
  const clean = term.trim();
  if (!clean || !evidence.trim()) return false;
  const matcher = new RegExp(flexibleTermPattern(clean), "gi");
  const matches = [...evidence.matchAll(matcher)];
  if (!matches.length) return false;

  let sawNegated = false;
  for (const match of matches) {
    const index = match.index ?? 0;
    const prefix = clauseBefore(evidence, index, 220);
    if (INSTRUCTIONAL_CLAIM_WORDS.test(prefix)) {
      sawNegated = true;
      continue;
    }
    const normalizedPrefix = prefix.replace(/\s+/g, " ").trim();
    const scope = normalizedPrefix.split(/\bbut\b|\bhowever\b/i).pop() || normalizedPrefix;
    const deniedKnowledge = /\b(?:do\s+not|don['’]?t|did\s+not|didn['’]?t|not|never|no)\b[^.!?;\n]{0,140}\b(?:know|use|used|worked\s+with|experience\s+with|experience\s+in|familiar\s+with|skilled\s+in)?[^.!?;\n]{0,140}$/i.test(scope);
    if (deniedKnowledge || NEGATION_WORDS.test(scope.slice(-120))) {
      sawNegated = true;
      continue;
    }
    return false;
  }
  return sawNegated;
}

/**
 * For action-style claims, require at least one affirmative occurrence of the
 * action verb in the source. This prevents token-overlap checks from turning
 * "I have never managed a team" into "Managed a team".
 */
export function actionClaimHasAffirmativeSupport(claim: string, evidence: string) {
  const action = claim.trim().match(/^(?:i\s+)?(implemented|wrote|created|developed|designed|built|led|managed|improved|increased|reduced|decreased|optimized|automated|delivered|launched|tested|won|published|fixed|shipped|completed)\b/i)?.[1];
  if (!action) return true;
  const matcher = new RegExp(`\\b${escapeRegExp(action)}\\b`, "gi");
  const occurrences = [...evidence.matchAll(matcher)];
  if (!occurrences.length) return false;
  return occurrences.some((match) => !hasUnsafeActionContext(evidence, match.index ?? 0));
}

export function isFocusedAchievementMessage(message: string) {
  const text = message.trim();
  if (!text || isFabricationInstruction(text)) return false;
  if (text.length > 650) return false;
  if ((text.match(/\b(?:skills?|projects?|experience|education|certifications?|github|linkedin)\s*:/gi) || []).length >= 2) return false;

  const explicitLog = /^\s*(?:(?:please\s+)?log\s+)?(?:achievement|accomplishment)\s*[:\-]/i.test(text) || /^\s*today\b/i.test(text);
  const actionMatch = /\b(?:i\s+)?(built|made|created|optimized|improved|reduced|increased|won|published|fixed|delivered|launched|shipped|completed)\b/i.exec(text);
  if (!actionMatch) return false;
  if (hasUnsafeActionContext(text, actionMatch.index)) return false;
  return explicitLog || /^\s*i\s+(?:built|made|created|optimized|improved|reduced|increased|won|published|fixed|delivered|launched|shipped|completed)\b/i.test(text) || /^\s*(?:built|created|won|launched|shipped|completed)\b/i.test(text);
}
