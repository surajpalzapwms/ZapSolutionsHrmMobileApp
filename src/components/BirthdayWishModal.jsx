// src/components/BirthdayWishModal.jsx
//
// <BirthdayWishModal />  — opens from the "🎉 Wish" button on a colleague's
//   birthday (from 12:00 midnight India time on the day). A party card —
//   balloons, cake, confetti, gifts — with the colleague's photo, quick
//   ready-made wishes and a box to write your own message (max 300 chars).
//
// <MyWishesModal />      — the birthday person's own list of wishes received.
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Avatar from "./Avatar";
import { getMyBirthdayWishes, wishBirthday } from "../services/celebrationService";
import { colors, radius } from "../theme/colors";

const PINK = "#BE185D";
const MAX = 300;

// Party icons floating around the card.
const PARTY = ["🎈", "🎉", "🎂", "🎁", "🥳", "🎊", "🍰", "✨", "🎈", "🎀", "🧁", "🎉"];

const QUICK_WISHES = (first) => [
  `Happy Birthday, ${first}! 🎂`,
  `Many many happy returns of the day, ${first}! 🎉`,
  `Wishing you a fantastic year ahead! 🥳`,
  `Have a blast today, ${first}! 🎈🎁`,
];

// One emoji that gently bobs up and down (and fades in).
function FloatingIcon({ icon, delay, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.Text
      style={[
        { position: "absolute", fontSize: 24 },
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] }) },
          ],
        },
      ]}
    >
      {icon}
    </Animated.Text>
  );
}

// Confetti burst shown after the wish is sent.
function Confetti({ run }) {
  const pieces = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      v: new Animated.Value(0),
      x: (i % 9) * 11 - 44 + Math.random() * 8,
      icon: ["🎉", "🎊", "✨", "🎈", "💖"][i % 5],
    })),
  ).current;
  useEffect(() => {
    if (!run) return;
    pieces.forEach((p) => p.v.setValue(0));
    Animated.stagger(
      30,
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true })),
    ).start();
  }, [run, pieces]);
  if (!run) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 60, left: 0, right: 0, alignItems: "center" }}>
      {pieces.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: "absolute",
            fontSize: 20,
            opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.x * 3] }) },
              { translateY: p.v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -90, 140] }) },
            ],
          }}
        >
          {p.icon}
        </Animated.Text>
      ))}
    </View>
  );
}

/**
 * Props: visible, item ({ id, name, photoUrl, team }), onClose,
 *        onWished(updatedItem)
 */
export default function BirthdayWishModal({ visible, item, onClose, onWished }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const first = String(item?.name || "").split(" ")[0] || "friend";

  useEffect(() => {
    if (visible) {
      setText("");
      setSent(false);
    }
  }, [visible, item?.id]);

  const send = async () => {
    if (sending || !item) return;
    const message = text.trim() || `Happy Birthday, ${first}! 🎂`;
    setSending(true);
    try {
      const res = await wishBirthday(item.id, message);
      setSent(true);
      onWished?.({ ...item, wishedByMe: true, wishCount: res?.data?.wishCount ?? (item.wishCount || 0) + 1 });
      setTimeout(() => onClose?.(), 1600);
    } catch (e) {
      Alert.alert("Couldn't send wish", e.response?.data?.message || "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "rgba(17,0,34,0.55)", justifyContent: "center", padding: 18 }}
      >
        <View style={{ backgroundColor: "#FFF5FA", borderRadius: 24, overflow: "hidden", maxHeight: "92%" }}>
          {/* Party header */}
          <View style={{ backgroundColor: PINK, paddingTop: 38, paddingBottom: 58, alignItems: "center" }}>
            {PARTY.map((icon, i) => (
              <FloatingIcon
                key={i}
                icon={icon}
                delay={i * 120}
                style={{ left: `${3 + Math.floor(i / 2) * 15}%`, top: i % 2 ? 4 : 96, fontSize: 20 }}
              />
            ))}
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 1 }}>IT&apos;S A CELEBRATION!</Text>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 6, textAlign: "center", paddingHorizontal: 24 }}>
              🎂 Happy Birthday, {first}! 🎉
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              style={{
                position: "absolute",
                right: 12,
                top: 12,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "rgba(255,255,255,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Photo overlapping the header */}
          <View style={{ alignItems: "center", marginTop: -44, zIndex: 2, elevation: 2 }}>
            <View style={{ borderWidth: 4, borderColor: "#fff", borderRadius: 50, backgroundColor: "#fff" }}>
              <Avatar name={item?.name} uri={item?.photoUrl} size={84} bg="#FCE7F3" color={PINK} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8 }}>{item?.name}</Text>
            {item?.team ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{item.team}</Text> : null}
          </View>

          <Confetti run={sent} />

          {sent ? (
            <View style={{ alignItems: "center", padding: 28 }}>
              <Text style={{ fontSize: 44 }}>🥳</Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: PINK, marginTop: 8 }}>Wish sent!</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: "center" }}>
                {first} will see your message on their birthday card.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 14 }} keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 8 }}>Pick a wish or write your own</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {QUICK_WISHES(first).map((w) => {
                  const active = text === w;
                  return (
                    <TouchableOpacity
                      key={w}
                      onPress={() => setText(w)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: radius.pill,
                        borderWidth: 1,
                        borderColor: active ? PINK : "#FBCFE8",
                        backgroundColor: active ? PINK : "#fff",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: active ? "#fff" : PINK, fontWeight: "600" }}>{w}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={text}
                onChangeText={(t) => setText(t.slice(0, MAX))}
                placeholder={`Write something nice for ${first}… 🎈`}
                placeholderTextColor={colors.textMuted}
                multiline
                style={{
                  minHeight: 96,
                  borderWidth: 1,
                  borderColor: "#FBCFE8",
                  borderRadius: radius.md,
                  padding: 12,
                  fontSize: 14,
                  color: colors.text,
                  backgroundColor: "#fff",
                  textAlignVertical: "top",
                }}
              />
              <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "right", marginTop: 4 }}>
                {text.length}/{MAX}
              </Text>
              <TouchableOpacity
                onPress={send}
                disabled={sending}
                activeOpacity={0.85}
                style={{
                  marginTop: 10,
                  paddingVertical: 14,
                  borderRadius: radius.md,
                  alignItems: "center",
                  backgroundColor: PINK,
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>🎉 Send birthday wish</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The birthday person's wishes received this year. Props: visible, onClose */
export function MyWishesModal({ visible, onClose }) {
  const [wishes, setWishes] = useState(null);
  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    getMyBirthdayWishes()
      .then((list) => !cancelled && setWishes(list))
      .catch(() => !cancelled && setWishes([]));
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <View style={{ maxHeight: "80%", backgroundColor: "#FFF5FA", borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#FBCFE8" }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: PINK }}>💌 Your birthday wishes</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 22, color: colors.textMuted }}>×</Text>
            </TouchableOpacity>
          </View>
          {wishes === null ? (
            <ActivityIndicator color={PINK} style={{ margin: 30 }} />
          ) : (
            <FlatList
              data={wishes}
              keyExtractor={(w) => String(w._id)}
              contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 20 }}>No wishes yet — they&apos;re on the way! 🎈</Text>
              }
              renderItem={({ item: w }) => (
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    backgroundColor: "#fff",
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: "#FBCFE8",
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <Avatar name={w.fromName} uri={w.photoUrl} size={38} bg="#FCE7F3" color={PINK} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>{w.fromName}</Text>
                    <Text style={{ fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 19 }}>
                      {w.message || "Happy Birthday! 🎂"}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
