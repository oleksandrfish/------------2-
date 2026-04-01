import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

function ProgressBar({
  progress,
  dynamicColor = false,
}: {
  progress: number;
  dynamicColor?: boolean;
}) {
  const animatedProgress = useSharedValue(progress);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 450 });
  }, [animatedProgress, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
    backgroundColor: dynamicColor
      ? interpolateColor(
          animatedProgress.value,
          [0, 25, 50, 75, 100],
          ["#2f80ed", "#45a66b", "#5fc3e7", "#f4c542", "#d84a56"]
        )
      : "#2f80ed",
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fillStyle]}>
        <Text style={styles.fillText}>{progress}%</Text>
      </Animated.View>
    </View>
  );
}

export default function Index() {
  const [progress, setProgress] = useState(0);

  const handleNext = () => {
    setProgress((current) => (current >= 100 ? 0 : current + 25));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <ProgressBar progress={progress} dynamicColor />

          <Pressable onPress={handleNext} style={styles.button}>
            <Text style={styles.buttonText}>next</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#edf4ff",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 24,
    gap: 20,
    shadowColor: "#19335d",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  track: {
    width: "100%",
    height: 20,
    borderRadius: 999,
    backgroundColor: "#e6ebf2",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    minWidth: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  fillText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#17305d",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
