// src/components/PhoneField.jsx — phone number with a country picker (flag + calling code).
// The app version of the website's PhoneInput:
//   • an EMPTY field starts with the COMPANY's country (Saudi company → 🇸🇦 +966 ...), India when the
//     company has none;
//   • the user can tap the flag and pick ANY other country (search by name or code); a country the
//     user picked is kept;
//   • the company's country is first in the list.
// value    : stored string "+91 9876543210" (old plain digits = India)
// onChange : called with the new stored string ("" when the number is empty)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { companyPhoneCountry, formatPhone, getPhoneCountry, orderedCountries, parsePhone } from "../utils/phone";
import { colors, radius } from "../theme/colors";

export default function PhoneField({ label, value = "", onChange, error, required = false, editable = true, placeholder = "Phone number" }) {
  const insets = useSafeAreaInsets();
  const { tenant } = useAuth(); // re-render when the company's country becomes known / changes
  const home = useMemo(() => companyPhoneCountry(), [tenant?.country]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => parsePhone(value), [value]);
  const [country, setCountry] = useState(parsed.country);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickedByUser = useRef(false);
  const lastValue = useRef(value);

  // Follow the value when the parent loads / resets it. Same calling code = keep what the user picked
  // (Canada vs US share +1). An empty value only resets the country when it just became empty.
  useEffect(() => {
    if (value) {
      setCountry((prev) => (getPhoneCountry(prev).dial === getPhoneCountry(parsed.country).dial ? prev : parsed.country));
    } else if (lastValue.current) {
      pickedByUser.current = false;
      setCountry(home);
    }
    lastValue.current = value;
  }, [value, parsed.country, home]);

  // Empty field: start with the company's country (also once its details finish loading).
  useEffect(() => {
    if (!value && !pickedByUser.current) setCountry(home);
  }, [home]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (nextCountry, nextNational) => onChange?.(formatPhone(nextCountry, nextNational));

  const onNumber = (text) => {
    // Digits only; a pasted "+971 50 123 4567" is split into code + number.
    if (text.trim().startsWith("+")) {
      const p = parsePhone(text);
      setCountry(p.country);
      emit(p.country, p.national.slice(0, 15));
      return;
    }
    emit(country, text.replace(/\D/g, "").slice(0, 15));
  };

  const pick = (iso) => {
    pickedByUser.current = true;
    setCountry(iso);
    setOpen(false);
    setQuery("");
    emit(iso, parsed.national);
  };

  const list = useMemo(() => orderedCountries(home), [home]);
  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const filtered = useMemo(
    () => (!q ? list : list.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dial.startsWith(q))),
    [q, list],
  );

  const current = getPhoneCountry(country);

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 }}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          backgroundColor: editable ? colors.card : "#F1F1F5",
          borderRadius: radius.md,
        }}
      >
        <TouchableOpacity
          disabled={!editable}
          activeOpacity={0.8}
          onPress={() => setOpen(true)}
          accessibilityLabel={`Country: ${current.name} +${current.dial}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRightWidth: 1,
            borderRightColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 20 }}>{current.flag}</Text>
          <Text style={{ fontSize: 14.5, color: colors.text, marginLeft: 6, fontWeight: "600" }}>+{current.dial}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginLeft: 6 }}>▾</Text>
        </TouchableOpacity>
        <TextInput
          value={parsed.national}
          onChangeText={onNumber}
          editable={editable}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5, color: colors.text }}
        />
      </View>
      {error ? <Text style={{ fontSize: 11.5, color: colors.danger, marginTop: 5 }}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.screen }}>
          <View
            style={{
              paddingTop: insets.top + 8,
              paddingBottom: 12,
              paddingHorizontal: 16,
              backgroundColor: colors.card,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 15, color: colors.textMuted, fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 16.5, fontWeight: "800", color: colors.text }}>Select country</Text>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ padding: 12 }}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search country or code"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  borderRadius: radius.md,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  fontSize: 14.5,
                  color: colors.text,
                }}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.iso}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
              ListEmptyComponent={<Text style={{ textAlign: "center", color: colors.textMuted, marginTop: 24 }}>No country found</Text>}
              renderItem={({ item }) => {
                const selected = item.iso === country;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => pick(item.iso)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: selected ? colors.primarySoft : colors.card,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{item.flag}</Text>
                    <Text style={{ flex: 1, fontSize: 14.5, color: colors.text, fontWeight: selected ? "700" : "400" }} numberOfLines={1}>
                      {item.name}
                      {item.iso === home ? "  · company country" : ""}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>+{item.dial}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
