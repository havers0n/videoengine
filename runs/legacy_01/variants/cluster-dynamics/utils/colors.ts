export const CLUSTER_COLORS = [
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#eab308', // Yellow 500
  '#22c55e', // Green 500
  '#06b6d4', // Cyan 500
  '#3b82f6', // Blue 500
  '#a855f7', // Purple 500
  '#ec4899', // Pink 500
  '#14b8a6', // Teal 500
  '#6366f1', // Indigo 500
];

export const getClusterColor = (index: number): string => {
  return CLUSTER_COLORS[index % CLUSTER_COLORS.length];
};
