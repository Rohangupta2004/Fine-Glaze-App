import React, { useEffect, useState } from 'react';
import { Image, type ImageProps, ActivityIndicator, View } from 'react-native';
import { getSignedUrl } from '../lib/signedUrl';
import { colors } from '../theme/colors';

interface SignedImageProps extends Omit<ImageProps, 'source'> {
  bucket: string;
  storagePath: string;
}

/**
 * Drop-in Image replacement that resolves a signed URL from
 * a private Supabase storage bucket before rendering.
 * Shows a loading spinner while the URL is being fetched.
 */
export function SignedImage({ bucket, storagePath, style, ...rest }: SignedImageProps) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl(bucket, storagePath).then((url) => {
      if (!cancelled) setUri(url);
    });
    return () => {
      cancelled = true;
    };
  }, [bucket, storagePath]);

  if (!uri) {
    return (
      <View
        style={[
          style,
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.neutral[200],
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return <Image source={{ uri }} style={style} {...rest} />;
}
