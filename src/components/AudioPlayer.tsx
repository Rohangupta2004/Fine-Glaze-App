import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { fontFamily } from '../theme/typography';

interface AudioPlayerProps {
  storagePath: string;
  isMine: boolean;
  durationLabel?: string;
}

export function AudioPlayer({ storagePath, isMine, durationLabel }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSignedUrl() {
      try {
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(storagePath, 3600);
        if (error) throw error;
        if (mounted && data?.signedUrl) {
          setAudioUrl(data.signedUrl);
        }
      } catch (e) {
        console.warn('Could not get audio signed URL:', e);
      }
    }
    loadSignedUrl();
    return () => {
      mounted = false;
    };
  }, [storagePath]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const togglePlayPause = async () => {
    if (!audioUrl) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          if (positionMillis >= durationMillis && durationMillis > 0) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        setLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        setIsPlaying(true);
        setLoading(false);
      }
    } catch (e) {
      console.warn('Error playing audio:', e);
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPositionMillis(status.positionMillis || 0);
      setDurationMillis(status.durationMillis || 0);
      setIsPlaying(status.isPlaying || false);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPositionMillis(0);
      }
    }
  };

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  return (
    <View style={[styles.container, isMine ? styles.mineBg : styles.theirsBg]}>
      <TouchableOpacity
        style={[styles.playBtn, isMine ? styles.playBtnMine : styles.playBtnTheirs]}
        onPress={togglePlayPause}
        disabled={loading || !audioUrl}
        activeOpacity={0.8}
      >
        <Ionicons
          name={loading ? 'hourglass-sharp' : isPlaying ? 'pause-sharp' : 'play-sharp'}
          size={18}
          color={isMine ? '#5B4122' : '#FFFFFF'}
          style={!isPlaying && !loading ? { marginLeft: 2 } : undefined}
        />
      </TouchableOpacity>

      <View style={styles.trackArea}>
        {/* Waveform / Visual Bars */}
        <View style={styles.waveformContainer}>
          {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95, 50, 70, 85, 40, 60].map((h, i) => {
            const barProgress = (i + 1) / 15;
            const isFilled = progress >= barProgress;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { height: Math.max(6, (h / 100) * 22) },
                  isMine
                    ? isFilled ? styles.barMineFilled : styles.barMineEmpty
                    : isFilled ? styles.barTheirsFilled : styles.barTheirsEmpty,
                ]}
              />
            );
          })}
        </View>

        <View style={styles.timeRow}>
          <Text style={[styles.timeText, isMine ? styles.mineText : styles.theirsText]}>
            {isPlaying || positionMillis > 0 ? formatTime(positionMillis) : durationLabel || formatTime(durationMillis) || 'Voice Note'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 12,
    width: 220,
    marginBottom: 4,
  },
  mineBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  theirsBg: {
    backgroundColor: 'rgba(105, 80, 48, 0.06)',
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnMine: {
    backgroundColor: '#FFFFFF',
  },
  playBtnTheirs: {
    backgroundColor: '#695030',
  },
  trackArea: {
    flex: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  barMineFilled: {
    backgroundColor: '#FFFFFF',
  },
  barMineEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  barTheirsFilled: {
    backgroundColor: '#695030',
  },
  barTheirsEmpty: {
    backgroundColor: 'rgba(105, 80, 48, 0.25)',
  },
  timeRow: {
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: fontFamily.bold,
  },
  mineText: {
    color: '#FDFBF7',
  },
  theirsText: {
    color: '#695030',
  },
});
