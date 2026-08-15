export type DriverRoutePoint = {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  recordedAt: string;
};

export function downsampleRouteTrace(
  points: DriverRoutePoint[],
  maximum = 800,
): DriverRoutePoint[] {
  if (points.length <= maximum) return points;
  const sampled: DriverRoutePoint[] = [];
  const step = (points.length - 1) / (maximum - 1);
  for (let index = 0; index < maximum; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }
  return sampled;
}
