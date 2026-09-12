import { Text, View } from 'react-native';
import { WeakSpot } from '@/lib/progress';
import { styles } from '@/styles';

export function WeakSpotsList({ weakSpots }: { weakSpots: WeakSpot[] }) {
  if (weakSpots.length === 0) return <Text style={styles.trendEmpty}>No recurring mistakes yet — they'll show up here as you practice.</Text>;
  return <View>
    {weakSpots.map((spot) => <View key={`${spot.category}:${spot.note}`} style={styles.weakSpotRow}>
      <View style={styles.weakSpotHeader}>
        <Text style={styles.weakSpotCategory}>{spot.category}</Text>
        <Text style={styles.weakSpotCount}>seen {spot.count}×</Text>
      </View>
      <Text style={styles.weakSpotNote}>{spot.note}</Text>
    </View>)}
  </View>;
}
