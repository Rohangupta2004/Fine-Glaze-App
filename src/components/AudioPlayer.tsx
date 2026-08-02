import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { fontFamily } from '../theme/typography';

interface AudioPlayerProps {
  storagePath: string;
  isMine: boolean;
  durationLabel?: string;
}

export function AudioPlayer({ storagePath, isMine, durationLabel }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSecs, setPositionSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  const togglePlayPause = async () => {
    if (!audioUrl) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (!audioElementRef.current) {
          setLoading(true);
          const audio = new Audio(audioUrl);
          audioElementRef.current = audio;

          audio.onloadedmetadata = () => {
            setTotalSecs(Math.floor(audio.duration || 0));
            setLoading(false);
          };

          audio.onended = () => {
            setIsPlaying(false);
            setPositionSecs(0);
            if (timerRef.current) clearInterval(timerRef.current);
          };

          await audio.play();
          setIsPlaying(true);
          setLoading(false);

          timerRef.current = setInterval(() => {
            if (audioElementRef.current) {
              setPositionSecs(Math.floor(audioElementRef.current.currentTime || 0));
            }
          }, 500);
        } else {
          if (isPlaying) {
            audioElementRef.current.pause();
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
          } else {
            await audioElementRef.current.play();
            setIsPlaying(true);
            timerRef.current = setInterval(() => {
              if (audioElementRef.current) {
                setPositionSecs(Math.floor(audioElementRef.current.currentTime || 0));
              }
            }, 500);
          }
        }
      } catch (e) {
        console.warn('Audio play error:', e);
        setIsPlaying(false);
        setLoading(false);
      }
    } else {
      // Native fallback simulation player
      if (isPlaying) {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setIsPlaying(true);
        const maxSecs = 12;
        setTotalSecs(maxSecs);
        timerRef.current = setInterval(() => {
          setPositionSecs(s => {
            if (s >= maxSecs) {
              setIsPlaying(false);
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return s + 1;
          });
        }, 1000);
      }
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || secs <= 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progress = totalSecs > 0 ? Math.min(positionSecs / totalSecs, 1) : 0;

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
            {isPlaying || positionSecs > 0 ? formatTime(positionSecs) : durationLabel || formatTime(totalSecs) || 'Voice Note'}
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
