export const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MAJOR_SCALES_MAP: Record<string, string[]> = {
  'C':  ['C', 'Dm', 'Em', 'F', 'G', 'Am'],
  'C#': ['C#', 'D#m', 'Fm', 'F#', 'G#', 'A#m'],
  'Db': ['C#', 'D#m', 'Fm', 'F#', 'G#', 'A#m'], 
  'D':  ['D', 'Em', 'F#m', 'G', 'A', 'Bm'],
  'D#': ['D#', 'Fm', 'Gm', 'G#', 'A#', 'Cm'],
  'Eb': ['D#', 'Fm', 'Gm', 'G#', 'A#', 'Cm'], 
  'E':  ['E', 'F#m', 'G#m', 'A', 'B', 'C#m'],
  'F':  ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm'],
  'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m'],
  'Gb': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m'], 
  'G':  ['G', 'Am', 'Bm', 'C', 'D', 'Em'],
  'G#': ['G#', 'A#m', 'Cm', 'C#', 'D#', 'Fm'],
  'Ab': ['G#', 'A#m', 'Cm', 'C#', 'D#', 'Fm'], 
  'A':  ['A', 'Bm', 'C#m', 'D', 'E', 'F#m'],
  'A#': ['A#', 'Cm', 'Dm', 'D#', 'F', 'Gm'],
  'Bb': ['A#', 'Cm', 'Dm', 'D#', 'F', 'Gm'], 
  'B':  ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m'],
};

// Exportada para que sea útil en otros archivos si es necesario
export function normalizeNote(note: string): string {
  const flatToSharp: Record<string, string> = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#'
  };
  return flatToSharp[note] || note;
}

export function getSemitonesBetween(from: string, to: string): number {
  // También normalizamos aquí por si comparas "Bb" con "B"
  const fromNormalized = normalizeNote(from.toUpperCase());
  const toNormalized = normalizeNote(to.toUpperCase());
  
  const fromIdx = CHROMATIC_SCALE.indexOf(fromNormalized);
  const toIdx = CHROMATIC_SCALE.indexOf(toNormalized);
  
  if (fromIdx === -1 || toIdx === -1) return 0;
  return toIdx - fromIdx;
}

export function transposeSingleNote(note: string, semitones: number): string {
  const isMinor = note.endsWith('m');
  let baseNote = isMinor ? note.slice(0, -1) : note;

  baseNote = normalizeNote(baseNote);

  const index = CHROMATIC_SCALE.indexOf(baseNote);
  if (index === -1) return note; 

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  const transposedNote = CHROMATIC_SCALE[newIndex];
  return isMinor ? `${transposedNote}m` : transposedNote;
}

export function transposeFullChord(chordText: string, semitones: number): string {
  const chordRegex = /([A-G][#b]?m?)(?:\/([A-G][#b]?))?/g;

  return chordText.replace(chordRegex, (match, root, bass) => {
    const transposedRoot = transposeSingleNote(root, semitones);
    if (bass) {
      // Quitamos la 'm' si por error el bajo la trae (ej. C/Am -> C#/A#)
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
      // Normalizamos el acorde que viene de la canción para compararlo con el mapa
      const normalizedChord = normalizeNote(chord);
      // Las notas en MAJOR_SCALES_MAP están mayormente en sostenidos, 
      // pero el mapa ya incluye Bb en algunas escalas como F. 
      // Por seguridad, comparamos contra versiones normalizadas.
      if (scaleNotes.includes(chord) || scaleNotes.map(normalizeNote).includes(normalizedChord)) {
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