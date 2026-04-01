export type Song = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  currentMood: string;
  targetMood: string;
  energy: number;
  audioUrl: string;
  cover: string;
  duration: string;
};

export const CURRENT_MOODS = [
  { id: "estresado", label: "Estresado", icon: "😫" },
  { id: "triste", label: "Triste", icon: "😢" },
  { id: "ansioso", label: "Ansioso", icon: "😰" },
  { id: "cansado", label: "Cansado", icon: "🥱" },
];

export const DESIRED_MOODS = [
  { id: "relajado", label: "Relajado", icon: "😌" },
  { id: "motivado", label: "Motivado", icon: "🔥" },
  { id: "energetico", label: "Energético", icon: "⚡" },
  { id: "en_paz", label: "En paz", icon: "🕊️" },
  { id: "feliz", label: "Feliz", icon: "✨" },
  { id: "concentrado", label: "Concentrado", icon: "🧠" },
];

export type MoodEntry = {
  id: string;
  date: string;
  currentMood: string;
  targetMood: string;
};
