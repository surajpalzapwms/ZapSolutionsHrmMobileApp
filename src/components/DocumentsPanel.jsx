// src/components/DocumentsPanel.jsx
// Profile photo + Aadhaar card + PAN card + light bill.
//   <DocumentsPanel />                 — the logged-in staff member's own
//   <DocumentsPanel staffId={id} />    — admin / super admin, any staff member
// Each document: upload (camera / gallery / PDF), view, replace, remove.
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
import { documentService, DOCUMENT_META } from "../services/documentService";
import { pickImage, pickPdf } from "../utils/filePick";
import { fileUrl } from "../utils/api";
import { bumpPhotoVersion, photoSource, setMyLocalPhoto } from "../utils/photoStore";
import Avatar from "./Avatar";
import { Card } from "./ModuleUI";
import { colors, radius } from "../theme/colors";
import { formatShortDate } from "../utils/format";

// Last loaded documents per person, so reopening the sheet is instant.
const cache = new Map();

const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function DocumentsPanel({ staffId = null, staffName = "", editable = true, onChanged, showPhoto = true }) {
  const admin = !!staffId;
  const cacheKey = admin ? `staff:${staffId}` : "me";
  const [data, setDataState] = useState(() => cache.get(cacheKey) || null);
  const [loading, setLoading] = useState(() => !cache.has(cacheKey));
  const setData = useCallback(
    (d) => {
      if (d) cache.set(cacheKey, d);
      else cache.delete(cacheKey);
      setDataState(d);
    },
    [cacheKey],
  );
  const [error, setError] = useState("");
  const [busyType, setBusyType] = useState(null);
  const [openType, setOpenType] = useState(null); // which row shows Camera / Gallery / PDF
  const [number, setNumber] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = admin ? await documentService.getForStaff(staffId) : await documentService.getMine();
      setData(res.data?.data || null);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load documents.");
    } finally {
      setLoading(false);
    }
  }, [admin, staffId, setData]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (type, picker) => {
    let file = null;
    try {
      file = await picker();
    } catch {
      Alert.alert("Couldn't open the file", "Please try again.");
      return;
    }
    if (!file) return;
    setBusyType(type);
    try {
      const payload = { type, data: file.data, mimeType: file.mimeType, fileName: file.fileName, number: number.trim() };
      const res = admin ? await documentService.uploadForStaff(staffId, payload) : await documentService.uploadMine(payload);
      setData(res.data?.data || null);
      setOpenType(null);
      setNumber("");
      if (type === "photo") {
        // Your own photo shows immediately everywhere (Home, Profile,
        // birthdays); an admin's upload refreshes that staff member's photo.
        if (admin) bumpPhotoVersion();
        else setMyLocalPhoto(file.dataUri);
      }
      onChanged?.(type);
    } catch (e) {
      Alert.alert("Upload failed", e.response?.data?.message || "Please check your internet and try again.");
    } finally {
      setBusyType(null);
    }
  };

  const remove = (doc) => {
    Alert.alert(`Remove ${doc.label}?`, "The uploaded file will be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusyType(doc.type);
          try {
            const res = admin
              ? await documentService.deleteForStaff(staffId, doc.type)
              : await documentService.deleteMine(doc.type);
            setData(res.data?.data || null);
            if (doc.type === "photo") {
              if (admin) bumpPhotoVersion();
              else setMyLocalPhoto(null);
            }
            onChanged?.(doc.type);
          } catch (e) {
            Alert.alert("Couldn't remove", e.response?.data?.message || "Please try again.");
          } finally {
            setBusyType(null);
          }
        },
      },
    ]);
  };

  const view = (doc) => {
    const url = fileUrl(doc.url);
    if (url) Linking.openURL(url).catch(() => Alert.alert("Couldn't open", "Please try again."));
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />;
  if (error) return <Text style={{ color: colors.danger, fontSize: 13, marginVertical: 8 }}>{error}</Text>;
  if (!data) return null;

  const docs = data.documents || [];
  const photo = docs.find((d) => d.type === "photo");
  const others = docs.filter((d) => d.type !== "photo");
  const uploadedCount = others.filter((d) => d.uploaded).length;

  return (
    <View>
      {showPhoto ? (
        <Card style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Avatar name={data.staffName || staffName} uri={data.photoUrl} size={64} self={!admin} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>Profile photo</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
              {photo?.uploaded ? `Updated ${formatShortDate(photo.uploadedAt)}` : "No photo — your initials are shown"}
            </Text>
            {editable ? (
              busyType === "photo" ? (
                <ActivityIndicator color={colors.primary} style={{ alignSelf: "flex-start", marginTop: 8 }} />
              ) : (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <SmallBtn label="📷 Camera" onPress={() => upload("photo", () => pickImage({ camera: true, square: true }))} />
                  <SmallBtn label="🖼 Gallery" onPress={() => upload("photo", () => pickImage({ camera: false, square: true }))} />
                  {photo?.uploaded ? <SmallBtn label="Remove" danger onPress={() => remove(photo)} /> : null}
                </View>
              )
            ) : null}
          </View>
        </Card>
      ) : null}

      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
        {uploadedCount} of {others.length} documents uploaded
      </Text>

      {others.map((doc) => {
        const meta = DOCUMENT_META[doc.type] || {};
        const open = openType === doc.type;
        const busy = busyType === doc.type;
        return (
          <Card key={doc.type} style={{ marginBottom: 10, paddingVertical: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {doc.uploaded && doc.isImage ? (
                <TouchableOpacity onPress={() => view(doc)}>
                  <Image
                    source={photoSource(doc.url)}
                    style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: colors.track }}
                    resizeMethod="resize"
                    fadeDuration={0}
                  />
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: doc.uploaded ? "#E6F7EC" : colors.track,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{doc.uploaded && !doc.isImage ? "📄" : meta.emoji}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{doc.label || meta.label}</Text>
                {doc.uploaded ? (
                  <>
                    {doc.number ? (
                      <Text style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>No. {doc.number}</Text>
                    ) : null}
                    <Text style={{ fontSize: 11, color: colors.success, marginTop: 2 }}>
                      ✓ Uploaded {formatShortDate(doc.uploadedAt)} · {kb(doc.size)}
                      {doc.uploadedByName ? ` · by ${doc.uploadedByName}` : ""}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 11, color: colors.warning, marginTop: 2 }}>Not uploaded · {meta.hint}</Text>
                )}
              </View>
            </View>

            {busy ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />
            ) : (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {doc.uploaded ? <SmallBtn label="👁 View" onPress={() => view(doc)} /> : null}
                {editable ? (
                  <SmallBtn
                    label={open ? "Close" : doc.uploaded ? "Replace" : "⬆ Upload"}
                    primary={!doc.uploaded && !open}
                    onPress={() => {
                      setOpenType(open ? null : doc.type);
                      setNumber(doc.number || "");
                    }}
                  />
                ) : null}
                {editable && doc.uploaded ? <SmallBtn label="Remove" danger onPress={() => remove(doc)} /> : null}
              </View>
            )}

            {open && !busy ? (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                {meta.numberLabel ? (
                  <>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>{meta.numberLabel} (optional)</Text>
                    <TextInput
                      value={number}
                      onChangeText={setNumber}
                      placeholder={meta.numberPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                      keyboardType={doc.type === "aadhaar" ? "number-pad" : "default"}
                      maxLength={doc.type === "aadhaar" ? 14 : 10}
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: radius.sm,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        fontSize: 14,
                        color: colors.text,
                        backgroundColor: "#F9FAFB",
                        marginBottom: 10,
                      }}
                    />
                  </>
                ) : null}
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <SmallBtn label="📷 Camera" primary onPress={() => upload(doc.type, () => pickImage({ camera: true }))} />
                  <SmallBtn label="🖼 Gallery" primary onPress={() => upload(doc.type, () => pickImage({ camera: false }))} />
                  <SmallBtn label="📄 PDF" primary onPress={() => upload(doc.type, pickPdf)} />
                </View>
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

function SmallBtn({ label, onPress, primary, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radius.pill,
        backgroundColor: primary ? colors.primary : danger ? colors.dangerSoft : colors.primarySoft,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: primary ? "#fff" : danger ? colors.danger : colors.primary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
