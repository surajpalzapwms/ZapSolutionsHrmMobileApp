// src/components/Avatar.jsx — round photo, or initials when there is none.
//   <Avatar name uri size />          any staff member (uri may be relative)
//   <Avatar name uri size self />     YOUR photo: shows the copy saved on this
//                                     phone right after upload, so it appears
//                                     instantly everywhere.
// Photos are loaded with the login token (they are private on the server)
// and re-fetched after every upload (cache version).
import React, { memo, useEffect, useMemo, useState } from "react";
import { Image, Platform, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { getInitials } from "../utils/helpers";
import { photoSource, usePhotoState } from "../utils/photoStore";

function Avatar({ name, uri, size = 44, bg, color, self = false }) {
  const { version, myLocal } = usePhotoState();
  const [failed, setFailed] = useState(false);

  const source = useMemo(() => {
    if (self && myLocal) return { uri: myLocal };
    return uri ? photoSource(uri, version) : null;
  }, [self, myLocal, uri, version]);

  // A new photo (new link / new upload / photo version bump) gets a fresh
  // chance to load. Before, a photo that failed once (slow network, or the
  // list loaded a moment before the upload finished) stayed as initials
  // until the app was restarted, because signed links never change uri.
  const key = source?.uri;
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setFailed(false);
    setRetry(0);
  }, [key, version]);

  // One automatic retry a few seconds after a failure (network hiccup).
  useEffect(() => {
    if (!failed || retry >= 1) return undefined;
    const t = setTimeout(() => {
      setRetry((r) => r + 1);
      setFailed(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [failed, retry]);

  const s = { width: size, height: size, borderRadius: size / 2, backgroundColor: bg || colors.primarySoft };
  if (source && !failed) {
    return (
      <Image
        key={`${key}#${retry}`}
        source={source}
        style={s}
        onError={() => setFailed(true)}
        fadeDuration={0}
        // Decode at the size shown, not the full photo — much faster lists.
        resizeMethod={Platform.OS === "android" ? "resize" : undefined}
      />
    );
  }
  return (
    <View style={[s, { alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: color || colors.primary, fontWeight: "700", fontSize: size * 0.4 }}>{getInitials(name)}</Text>
    </View>
  );
}

export default memo(Avatar);
