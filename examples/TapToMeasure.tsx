/**
 * Measure with taps, no detector needed.
 *
 * The person taps the two edges of the sticker (or coin) in the photo, then
 * the two ends of what they want to measure. The distance between the first
 * two taps is the reference's diameter in pixels; the second two give the
 * length to convert. Always shown as an estimate.
 */
import { useState } from 'react';
import {
  Button,
  Image,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import {
  REFERENCE_OBJECTS,
  explainRefusal,
  scaleFromEllipse,
  toMillimetres,
} from '@molecare/scale-reference';

interface Point {
  x: number;
  y: number;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const PROMPTS = [
  'Tap one edge of the sticker',
  'Tap the opposite edge of the sticker',
  'Tap one end of what you want to measure',
  'Tap the other end',
];

export function TapToMeasure({ photoUri }: { photoUri: string }) {
  const [taps, setTaps] = useState<Point[]>([]);

  const onTap = (event: GestureResponderEvent) => {
    if (taps.length >= 4) return;
    const { locationX, locationY } = event.nativeEvent;
    setTaps([...taps, { x: locationX, y: locationY }]);
  };

  let result: string | null = null;
  const [a, b, c, d] = taps;
  if (a && b && c && d) {
    // Taps on a round sticker give its diameter; a tapped width has no tilt
    // information, so the major and minor axes are the same.
    const referencePx = distance(a, b);
    const scale = scaleFromEllipse(
      { majorAxisPx: referencePx, minorAxisPx: referencePx },
      REFERENCE_OBJECTS.STICKER_10MM.diameterMm
    );
    if (!scale.usable) {
      // Your own words, or translations, keyed by reason.
      result = explainRefusal(scale.reason, {
        reference_too_small:
          'The sticker is too small in this photo. Move the camera closer.',
        default: 'This photo cannot be measured. Try another one.',
      });
    } else {
      const mm = toMillimetres(distance(c, d), scale);
      result =
        mm === null
          ? 'Tap two different points.'
          : `About ${mm.toFixed(1)} mm (an estimate)`;
    }
  }

  return (
    <View>
      <Pressable
        onPress={onTap}
        accessibilityLabel="Photo to measure"
        accessibilityHint={PROMPTS[taps.length] ?? 'Measurement done'}
      >
        <Image
          source={{ uri: photoUri }}
          style={{ width: '100%', aspectRatio: 1 }}
        />
      </Pressable>
      <Text accessibilityRole="alert">{result ?? PROMPTS[taps.length]}</Text>
      <Button
        title="Start again"
        onPress={() => {
          setTaps([]);
        }}
      />
    </View>
  );
}
