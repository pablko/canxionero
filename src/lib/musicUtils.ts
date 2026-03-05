export const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MAJOR_SCALES_MAP: Record<string, string[]> = {
  'C':  ['C', 'Dm', 'Em', 'F', 'G', 'Am'],
  'C#': ['C#', 'D#m', 'Fm', 'F#', 'G#', 'A#m'],
  'D':  ['D', 'Em', 'F#m', 'G', 'A', 'Bm'],
  'D#': ['D#', 'Fm', 'Gm', 'G#', 'A#', 'Cm'],
  'E':  ['E', 'F#m', 'G#m', 'A', 'B', 'C#m'],
  'F':  ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm'],
  'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m'],
  'G':  ['G', 'Am', 'Bm', 'C', 'D', 'Em'],
  'G#': ['G#', 'A#m', 'Cm', 'C#', 'D#', 'Fm'],
  'A':  ['A', 'Bm', 'C#m', 'D', 'E', 'F#m'],
  'A#': ['A#', 'Cm', 'Dm', 'D#', 'F', 'Gm'],
  'B':  ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m'],
};

export function getSemitonesBetween(from: string, to: string): number {
  const fromIdx = CHROMATIC_SCALE.indexOf(from.toUpperCase());
  const toIdx = CHROMATIC_SCALE.indexOf(to.toUpperCase());
  return toIdx - fromIdx;
}

export function transposeSingleNote(note: string, semitones: number): string {
  const root = note.replace(/m$/, ""); 
  const isMinor = note.endsWith("m");
  
  const index = CHROMATIC_SCALE.indexOf(root.toUpperCase());
  if (index === -1) return note;

  const newIndex = (index + semitones + 12) % 12;
  return CHROMATIC_SCALE[newIndex] + (isMinor ? "m" : "");
}

export function transposeFullChord(chordText: string, semitones: number): string {
  const chordRegex = /([A-G][#b]?m?)(?:\/([A-G][#b]?))?/g;

  return chordText.replace(chordRegex, (match, root, bass) => {
    const transposedRoot = transposeSingleNote(root, semitones);
    if (bass) {
      const transposedBass = transposeSingleNote(bass, semitones).replace(/m$/, "");
      return `${transposedRoot}/${transposedBass}`;
    }
    return transposedRoot;
  });
}

export function detectScale(chords: string[]): string {
  if (chords.length === 0) return 'C';

  const cleanChords = chords
    .map(c => c.split('/')[0].replace(/\s/g, '').trim())
    .filter(c => c !== "");

  const firstChord = cleanChords[0];
  const uniqueChords = Array.from(new Set(cleanChords));

  let bestScale = 'C';
  let maxScore = -1;

  for (const [root, scaleNotes] of Object.entries(MAJOR_SCALES_MAP)) {
    let score = 0;
    uniqueChords.forEach(chord => {
      if (scaleNotes.includes(chord)) {
        score += 10; 
        if (chord === root) score += 15; 
        if (chord === scaleNotes[4]) score += 10;
        if (chord === scaleNotes[2] || chord === scaleNotes[1]) score += 5;
      }
    });

    if (firstChord === root) score += 20;

    if (score > maxScore) {
      maxScore = score;
      bestScale = root;
    }
  }

  return bestScale;
}