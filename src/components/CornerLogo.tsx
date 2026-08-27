import { Image, View } from 'react-native';

/**
 * The single shared implementation of the Zap Solutionz logo badge — same
 * white card, shadow, and image treatment everywhere it appears
 * (Login, Home, every quick-action sheet, every tab screen header).
 *
 * variant="corner" (default): flush against the top-left corner of a
 * gradient header (Login, Home), rounded only on the bottom-right so it
 * reads as attached to the corner. Requires the parent to have
 * `position: 'relative'` (or be a View that isn't already
 * `position: 'absolute'`) for it to anchor correctly.
 *
 * variant="inline": a small fully-rounded badge that sits inline in a
 * plain white header row, next to a title (quick-action sheet headers,
 * the Activity/Analytics/Profile tab headers).
 */
export default function CornerLogo({
  size = 64,
  variant = 'corner',
}: {
  size?: number;
  variant?: 'corner' | 'inline';
}) {
  if (variant === 'inline') {
    return (
      <View
        className="items-center justify-center bg-white shadow-lg"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          marginRight: 10,
        }}>
        <Image
          source={require('../../assets/zap-logo.png')}
          resizeMode="contain"
          style={{ width: '80%', height: '55%' }}
        />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center bg-white shadow-lg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        paddingVertical: 8,
        borderBottomRightRadius: 20,
        zIndex: 10,
      }}>
      <Image
        source={require('../../assets/zap-logo.png')}
        resizeMode="contain"
        style={{ width: '85%', height: size * 0.4 }}
      />
    </View>
  );
}
