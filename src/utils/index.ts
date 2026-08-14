export const formatScore = (score?: number): string => {
  if (score === undefined || score === null) return 'N/A';
  return `${score}%`;
};

export const getGradeBadgeColor = (grade: string): string => {
  if (grade.startsWith('A')) return 'bg-[#4F6D58] text-white';
  if (grade.startsWith('B')) return 'bg-[#4F6D58]/80 text-white';
  if (grade.startsWith('C')) return 'bg-amber-600 text-white';
  return 'bg-red-600 text-white';
};

export const truncateText = (text: string, maxLength: number = 60): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
