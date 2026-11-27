/**
 * The subject worlds of the child app, the same ten as the mobile app (lib/theme/subjects.dart):
 * the same keys, colours, title fonts and 3D pictures, so the portal's child preview shows exactly
 * what the phone will. A lesson carries only its subject key; the look ships inside the app.
 * The server accepts the same keys (SUBJECTS in the backend's common/validation.ts).
 */

export const SUBJECT_KEYS = ['english', 'pagbasa', 'alpabasa', 'math', 'science', 'gmrc', 'makabansa', 'arts', 'digital', 'general'] as const;
export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export interface SubjectTheme {
  key: SubjectKey;
  /** The subject's name for teachers. */
  name: string;
  /** What children see the world called, in Filipino and English. */
  child: string;
  childEn: string;
  world: string;
  worldFil: string;
  main: string;
  /** Text on the main colour. */
  on: string;
  deep: string;
  tint: string;
  hl: string;
  pop: string;
  /** The title font, as a Google Fonts family name. */
  font: string;
  hero: string;
  icons: string[];
}

export const SUBJECTS: SubjectTheme[] = [
  { key: 'english', name: 'English Reading', child: 'English', childEn: 'English', world: 'Storybook Forest', worldFil: 'Gubat ng Kuwento', main: '#2B5FC1', on: '#FFFFFF', deep: '#173A7A', tint: '#EAF1FD', hl: '#FFE08A', pop: '#FFB547', font: 'Fraunces', hero: 'open-book', icons: ['owl', 'books', 'tree', 'bird', 'blue-book', 'sparkles'] },
  { key: 'pagbasa', name: 'Filipino Reading (Pagbasa)', child: 'Filipino', childEn: 'Filipino', world: 'Kuwentuhan sa Bahay-Kubo', worldFil: 'Kuwentuhan sa Bahay-Kubo', main: '#B04E00', on: '#FFFFFF', deep: '#6B2F00', tint: '#FFF1E2', hl: '#FFE1A8', pop: '#2F8F5B', font: 'Baloo 2', hero: 'hut', icons: ['mango', 'palm-tree', 'hibiscus', 'rooster', 'kite', 'sparkles'] },
  { key: 'alpabasa', name: 'Alpabasa (letters and sounds)', child: 'Alpabasa', childEn: 'Alpabasa', world: 'Letter Playground', worldFil: 'Palaruan ng Titik', main: '#7442B0', on: '#FFFFFF', deep: '#44226E', tint: '#F3ECFB', hl: '#FFE27A', pop: '#FF7EB6', font: 'Andika', hero: 'crayon', icons: ['balloon', 'teddy-bear', 'pencil', 'puzzle', 'memo', 'sparkles'] },
  { key: 'math', name: 'Math (Numeracy)', child: 'Matematika', childEn: 'Math', world: 'Number Market', worldFil: 'Palengke ng Numero', main: '#F2B01E', on: '#3D2A00', deep: '#6E4B00', tint: '#FFF6DC', hl: '#FFE7A3', pop: '#2B7FD9', font: 'Fredoka', hero: 'abacus', icons: ['coin', 'numbers', 'ruler', 'clock', 'cart', 'bread'] },
  { key: 'science', name: 'Science and Health', child: 'Agham at Kalusugan', childEn: 'Science and Health', world: 'Explorer Garden', worldFil: 'Hardin ng Tuklas', main: '#2E7D32', on: '#FFFFFF', deep: '#1B4D1F', tint: '#EAF6E8', hl: '#D9F2A6', pop: '#3FA9F5', font: 'Lexend', hero: 'microscope', icons: ['seedling', 'magnifier', 'butterfly', 'droplet', 'soap', 'leafy-green'] },
  { key: 'gmrc', name: 'Values (GMRC)', child: 'Kagandahang-asal', childEn: 'Values', world: 'Kind Hearts Village', worldFil: 'Nayon ng Kabutihan', main: '#C2185B', on: '#FFFFFF', deep: '#7A0F3A', tint: '#FDEBF2', hl: '#FFD6E2', pop: '#FF9EBB', font: 'Nunito', hero: 'heart', icons: ['handshake', 'hugging', 'house-garden', 'bread', 'smile-hearts', 'folded-hands'] },
  { key: 'makabansa', name: 'Makabansa (community and country)', child: 'Makabansa', childEn: 'Community', world: 'Our Islands', worldFil: 'Ating mga Isla', main: '#8D4E2A', on: '#FFFFFF', deep: '#5A2E14', tint: '#F8EEE4', hl: '#FCE38A', pop: '#2F6FD0', font: 'Lilita One', hero: 'globe', icons: ['carabao', 'minibus', 'building', 'fish', 'sailboat', 'compass'] },
  { key: 'arts', name: 'Arts, Music and Dance', child: 'Sining', childEn: 'Arts', world: 'Color and Rhythm Stage', worldFil: 'Entablado ng Sining', main: '#A3238F', on: '#FFFFFF', deep: '#5E1554', tint: '#FBE9F7', hl: '#FFE08A', pop: '#2FB8A6', font: 'Grandstander', hero: 'palette', icons: ['paintbrush', 'guitar', 'drum', 'maracas', 'dancer', 'notes'] },
  { key: 'digital', name: 'Digital Skills', child: 'Digital', childEn: 'Digital', world: 'Robot Lab', worldFil: 'Lab ng Robot', main: '#24324F', on: '#FFFFFF', deep: '#1A2540', tint: '#E8F7FA', hl: '#B8F1F8', pop: '#22B8CF', font: 'Exo 2', hero: 'robot', icons: ['laptop', 'mouse', 'keyboard', 'bulb', 'shield', 'phone'] },
  { key: 'general', name: 'General', child: 'Aralin', childEn: 'Lessons', world: 'Pocket Lessons', worldFil: 'Pocket Lessons', main: '#146B60', on: '#FFFFFF', deep: '#0F544B', tint: '#FFF9ED', hl: '#F6CC59', pop: '#8CC7E8', font: 'Fraunces', hero: 'star', icons: ['sun', 'sparkles', 'school', 'kite', 'balloon', 'party'] },
];

const BY_KEY = new Map(SUBJECTS.map((s) => [s.key, s]));

/** The world for a subject key; lessons with no subject yet show in General (today's look). */
export function subjectOf(key: string | null | undefined): SubjectTheme {
  return BY_KEY.get(key as SubjectKey) ?? BY_KEY.get('general')!;
}

export const isSubject = (key: unknown): key is SubjectKey => typeof key === 'string' && BY_KEY.has(key as SubjectKey);

export const subjectIcon = (icon: string) => `subjects/${icon}.webp`;

// ---------- colours for the child preview ----------

function mix(hex: string, toward: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(toward);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

/** The CSS variables the child preview reads, for one world (the phone's shadow = main 28% darker). */
export function themeVars(s: SubjectTheme): Record<string, string> {
  return {
    '--c-teal': s.main,
    '--c-teal-d': mix(s.main, '#000000', 0.28),
    '--c-sun': s.hl,
    '--c-sun-d': mix(s.hl, '#000000', 0.18),
    '--c-on': s.on,
    '--c-deep': s.deep,
    '--c-tint': s.tint,
    '--c-pop': s.pop,
    '--c-soft': mix(s.main, '#ffffff', 0.86),
    // Every world uses the one lesson font, as on the phone; worlds differ by colour and pictures.
    '--c-title': LESSON_FONT,
  };
}

/** The lesson font on the child's phone (Playpen Sans, served from /fonts, see styles.scss). */
export const LESSON_FONT = '"Playpen Sans PL", Andika, system-ui, sans-serif';

/** Story text size on the phone for a lesson level, in phone points (the preview scales it with the phone). */
export function lessonTextSize(level: string | null | undefined): number {
  switch ((level ?? '').toLowerCase().trim()) {
    case 'beginner':
    case 'letter':
      return 40;
    case 'word':
      return 34;
    case 'paragraph':
    case '':
      return 30;
    default:
      return 26; // Story and Short Story levels
  }
}

// ---------- suggesting a subject for an uploaded file ----------

/** Which language a story is in, from its most common small words (null when unsure). */
export function detectLanguage(text: string): 'English' | 'Filipino' | null {
  const words = text.toLowerCase().match(/[a-zñ']+/g) ?? [];
  const count = (list: string[]) => words.filter((w) => list.includes(w)).length;
  const en = count(['the', 'and', 'is', 'a', 'of', 'to', 'he', 'she', 'it', 'was', 'in', 'they', 'his', 'her']);
  const fil = count(['ang', 'ng', 'mga', 'sa', 'si', 'ay', 'na', 'ni', 'at', 'niya', 'siya', 'ito', 'kay', 'po']);
  if (en + fil < 5) return null;
  return fil >= en * 1.3 ? 'Filipino' : en >= fil * 1.3 ? 'English' : null;
}

const NAMED: [SubjectKey, RegExp][] = [
  ['math', /\b(matematika|mathematics|math|numeracy|pagbilang)\b/i],
  ['science', /\b(science|agham|kalusugan|health)\b/i],
  ['gmrc', /\b(gmrc|values education|edukasyon sa pagpapakatao|esp|kagandahang[- ]asal)\b/i],
  ['makabansa', /\b(makabansa|araling panlipunan|social studies)\b/i],
  ['arts', /\b(mapeh|arts?|music|musika|sining|dance|sayaw)\b/i],
  ['digital', /\b(digital|computer|kompyuter|ict)\b/i],
  ['alpabasa', /\b(alpabasa|alpabeto|alphabet|phonics|titik)\b/i],
];

export interface SubjectSuggestion {
  key: SubjectKey;
  /** Why, in a short sentence for the teacher. */
  reason: string;
}

/**
 * The likely subject of an uploaded lesson. A subject named in the file's heading or label wins;
 * otherwise a reading story goes to the reading world of its language.
 */
export function suggestSubject(input: { title: string; label?: string; text: string; language?: string }): SubjectSuggestion {
  const head = `${input.label ?? ''}\n${input.title}\n${input.text.slice(0, 240)}`;
  for (const [key, re] of NAMED) {
    const m = re.exec(head);
    if (m) return { key, reason: `The file says “${m[0]}”.` };
  }
  const lang = input.language ?? detectLanguage(input.text) ?? '';
  if (lang === 'English') return { key: 'english', reason: 'The story is in English.' };
  if (lang) return { key: 'pagbasa', reason: `The story is in ${lang}.` };
  return { key: 'general', reason: 'No subject was found in the file.' };
}
