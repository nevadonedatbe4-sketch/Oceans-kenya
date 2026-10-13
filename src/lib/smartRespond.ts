// ─────────────────────────────────────────────────────────────
// SMART RESPOND — offline, deterministic suggested-reply engine.
//
// No external AI service: it reads the client's message plus the known
// record context (name, property, location, budget) and composes a small set
// of genuinely contextual replies. Every suggestion is editable and is never
// auto-sent — the caller inserts it into the composer.
// ─────────────────────────────────────────────────────────────

export interface SmartRespondContext {
  /** The incoming client / lead message to reply to. */
  clientMessage?: string | null;
  /** Client or lead first / full name. */
  clientName?: string | null;
  /** Property or listing the enquiry is about. */
  propertyTitle?: string | null;
  /** Location / area of the enquiry. */
  propertyLocation?: string | null;
  /** Signed-in agent / staff name. */
  agentName?: string | null;
  /** Budget or price hint already known on the record. */
  budget?: string | null;
}

export interface SmartReply {
  id: string;
  /** Short label shown on the chip. */
  label: string;
  /** The full reply text inserted into the composer. */
  text: string;
}

/** Intent categories we can recognise from the client's wording. */
type Intent =
  | 'viewing'
  | 'price'
  | 'availability'
  | 'location'
  | 'financing'
  | 'documents'
  | 'timeline'
  | 'thanks'
  | 'general';

const INTENT_PATTERNS: { intent: Intent; words: string[] }[] = [
  { intent: 'viewing', words: ['viewing', 'view ', 'tour', 'visit', 'see the', 'show me', 'site visit', 'inspection'] },
  { intent: 'price', words: ['price', 'cost', 'how much', 'rate', 'budget', 'pricing', 'quote', 'charges', 'fee'] },
  { intent: 'availability', words: ['available', 'availability', 'still', 'vacant', 'taken', 'occupied', 'free'] },
  { intent: 'location', words: ['location', 'where', 'area', 'neighbourhood', 'neighborhood', 'directions', 'map', 'near'] },
  { intent: 'financing', words: ['mortgage', 'financ', 'loan', 'installment', 'instalment', 'deposit', 'payment plan', 'credit'] },
  { intent: 'documents', words: ['title', 'deed', 'document', 'paperwork', 'survey', 'lease', 'agreement', 'certificate'] },
  { intent: 'timeline', words: ['when', 'move in', 'move-in', 'ready', 'timeline', 'available from', 'next month', 'asap'] },
  { intent: 'thanks', words: ['thank', 'thanks', 'appreciate', 'cheers', 'great,', 'perfect,'] },
];

function firstWord(input?: string | null): string {
  const name = (input || '').trim();
  if (!name) return '';
  return name.split(/\s+/)[0];
}

function detectIntents(text: string): Intent[] {
  const hay = ` ${(text || '').toLowerCase()} `;
  const found = INTENT_PATTERNS
    .filter(({ words }) => words.some((w) => hay.includes(w)))
    .map(({ intent }) => intent);
  return found.length ? found : ['general'];
}

/**
 * Build a handful of context-aware replies. The property / area / budget the
 * record already knows are woven in, so suggestions never read as generic.
 */
export function generateSmartReplies(ctx: SmartRespondContext): SmartReply[] {
  const name = firstWord(ctx.clientName);
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const sign = firstWord(ctx.agentName) ? `\n\nBest regards,\n${firstWord(ctx.agentName)}` : '';
  const prop = (ctx.propertyTitle || '').trim();
  const area = (ctx.propertyLocation || '').trim();
  const budget = (ctx.budget || '').trim();
  const aboutProp = prop ? ` for ${prop}` : '';
  const inArea = area ? ` in ${area}` : '';

  const reply = (id: string, label: string, body: string): SmartReply => ({
    id,
    label,
    text: `${body}${sign}`,
  });

  const intents = detectIntents(ctx.clientMessage || '');
  const out: SmartReply[] = [];
  const push = (r: SmartReply) => { if (!out.some((x) => x.id === r.id)) out.push(r); };

  if (intents.includes('viewing')) {
    push(reply('viewing', 'Offer a viewing',
      `${greeting} thanks for your interest${aboutProp}. I can arrange a viewing at a time that suits you — would you prefer a weekday or the weekend? Just let me know two or three slots and I'll confirm.`));
  }
  if (intents.includes('price')) {
    push(reply('price', 'Share pricing',
      budget
        ? `${greeting} the pricing for this one is around ${budget}${aboutProp}. That can be discussed depending on terms — would you like me to send the full price breakdown?`
        : `${greeting} thanks for asking. Let me confirm the current pricing${aboutProp} and send you the full breakdown — is there a budget range you're working with so I can guide you better?`));
  }
  if (intents.includes('availability')) {
    push(reply('availability', 'Confirm availability',
      `${greeting} good news — this one is still available${aboutProp} unless it moves before we speak. Shall I reserve a viewing slot for you before it goes?`));
  }
  if (intents.includes('location')) {
    push(reply('location', 'Share the location',
      `${greeting} the property is${inArea || ' in a great location'}. I can send you the exact pin and a map link, and talk you through the neighbourhood${aboutProp}. Would that help?`));
  }
  if (intents.includes('financing')) {
    push(reply('financing', 'Explain financing',
      `${greeting} yes, financing options are available${aboutProp}. I can walk you through the deposit, the payment plan and the monthly amounts — would you like me to send those details?`));
  }
  if (intents.includes('documents')) {
    push(reply('documents', 'Offer documents',
      `${greeting} I can share the relevant documents (title / paperwork) once we've confirmed interest. Let me know which ones you'd like to review first and I'll arrange them for you.`));
  }
  if (intents.includes('timeline')) {
    push(reply('timeline', 'Confirm timeline',
      `${greeting} I'll confirm the exact availability date for you${aboutProp}. Could you let me know your ideal move-in window so I can match it to what's coming up?`));
  }
  if (intents.includes('thanks')) {
    push(reply('thanks', 'Acknowledge & follow up',
      `${greeting} you're very welcome — happy to help. I'll keep you posted on the next steps${aboutProp}. Let me know if anything else comes up.`));
  }

  // Always offer a strong opener + a soft question, so there is always something.
  push(reply('intro', 'Warm intro + question',
    `${greeting} thank you for reaching out to Oceans${aboutProp ? ' about ' + prop : ''}. I'd be glad to help — could you share a little more about what you're looking for (budget, size and preferred area) so I can send you the best options?`));

  push(reply('call', 'Offer a quick call',
    `${greeting} would you be open to a quick call? It's often the fastest way to answer everything at once${aboutProp ? ' about ' + prop : ''}. Let me know a good time and I'll ring you.`));

  push(reply('next', 'Move it forward',
    `${greeting} to help you move forward, I can put together a short shortlist${inArea || ''} that matches what you're after. Would you like me to send that across today?`));

  return out.slice(0, 5);
}