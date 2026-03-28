import { Insight } from './types';
import { AmenityCounts } from './scoring';

export function generateInsights(counts: AmenityCounts): Insight[] {
  const insights: Insight[] = [];

  // Transport insights (always include at least one)
  if (counts.stationCount >= 3) {
    insights.push({
      icon: 'Train',
      text: `Excellent transport links with ${counts.stationCount} stations within walking distance`,
      sentiment: 'positive',
    });
  } else if (counts.stationCount >= 1) {
    insights.push({
      icon: 'Train',
      text: `${counts.stationCount} rail station${counts.stationCount > 1 ? 's' : ''} nearby for quick connections`,
      sentiment: 'positive',
    });
  } else {
    insights.push({
      icon: 'Train',
      text: 'No rail stations nearby — you\'ll rely on buses',
      sentiment: 'negative',
    });
  }

  if (counts.busStopCount >= 5 && counts.stationCount === 0) {
    insights.push({
      icon: 'Bus',
      text: `Well-connected by bus with ${counts.busStopCount} stops in the area`,
      sentiment: 'positive',
    });
  }

  // Lifestyle insights (always include at least one)
  if (counts.cafeCount >= 5) {
    insights.push({
      icon: 'Coffee',
      text: `Thriving café culture with ${counts.cafeCount} options nearby`,
      sentiment: 'positive',
    });
  } else if (counts.cafeCount >= 2) {
    insights.push({
      icon: 'Coffee',
      text: `A handful of cafés to choose from in the area`,
      sentiment: 'neutral',
    });
  }

  if (counts.parkCount >= 2) {
    insights.push({
      icon: 'Trees',
      text: `Good green space access with ${counts.parkCount} parks in the area`,
      sentiment: 'positive',
    });
  } else if (counts.parkCount === 0) {
    insights.push({
      icon: 'Trees',
      text: 'Limited green space in the immediate area',
      sentiment: 'negative',
    });
  }

  if (counts.supermarketCount >= 2) {
    insights.push({
      icon: 'ShoppingCart',
      text: 'Well-served for grocery shopping with multiple stores nearby',
      sentiment: 'positive',
    });
  } else if (counts.supermarketCount + counts.convenienceCount >= 1) {
    insights.push({
      icon: 'ShoppingCart',
      text: 'At least one supermarket or convenience store within reach',
      sentiment: 'neutral',
    });
  }

  if (counts.gymCount >= 1) {
    insights.push({
      icon: 'Dumbbell',
      text: `Fitness options available nearby${counts.gymCount > 1 ? ` (${counts.gymCount} gyms)` : ''}`,
      sentiment: 'neutral',
    });
  }

  if (counts.schoolCount >= 3) {
    insights.push({
      icon: 'GraduationCap',
      text: `Well-served for education with ${counts.schoolCount} schools or colleges nearby`,
      sentiment: 'positive',
    });
  } else if (counts.schoolCount >= 1) {
    insights.push({
      icon: 'GraduationCap',
      text: `${counts.schoolCount} school${counts.schoolCount > 1 ? 's' : ''} or college${counts.schoolCount > 1 ? 's' : ''} in the area`,
      sentiment: 'neutral',
    });
  }

  if (counts.restaurantCount >= 5) {
    insights.push({
      icon: 'UtensilsCrossed',
      text: `Great dining scene with ${counts.restaurantCount} restaurants to explore`,
      sentiment: 'positive',
    });
  }

  // Safety insights (always include at least one)
  if (counts.crimeCount > 20) {
    insights.push({
      icon: 'ShieldAlert',
      text: 'Higher-than-average reported incidents — worth checking specifics',
      sentiment: 'negative',
    });
  } else if (counts.crimeCount < 10) {
    insights.push({
      icon: 'ShieldCheck',
      text: 'Relatively low crime levels in this area',
      sentiment: 'positive',
    });
  } else {
    insights.push({
      icon: 'Shield',
      text: 'Average crime levels for a UK urban area',
      sentiment: 'neutral',
    });
  }

  // Prioritise and return top 5, ensuring at least one from each category
  const prioritised = deduplicateByCategory(insights);
  return prioritised.slice(0, 5);
}

function deduplicateByCategory(insights: Insight[]): Insight[] {
  const seen = new Set<string>();
  const result: Insight[] = [];
  for (const insight of insights) {
    if (!seen.has(insight.icon)) {
      seen.add(insight.icon);
      result.push(insight);
    }
  }
  return result;
}
