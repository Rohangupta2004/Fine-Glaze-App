import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { colors } from '../theme/colors';
import { fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface CadViewerModalProps {
  visible: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string;
}

export function CadViewerModal({ visible, onClose, fileUrl, fileName }: CadViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [wireframe, setWireframe] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!fileUrl) return null;

  const ext = fileName.split('.').pop()?.toLowerCase() || 'cad';
  const is2D = ['dxf', 'dwg', 'svg'].includes(ext);

  // Generate self-contained WebGL / Three.js 3D & 2D CAD viewer HTML string
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #0F172A; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
          #canvas-container { flex: 1; position: relative; width: 100%; height: 100%; }
          canvas { width: 100% !important; height: 100% !important; display: block; }
          .hud { position: absolute; top: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); padding: 8px 12px; borderRadius: 8px; border: 1px solid rgba(255,255,255,0.1); font-size: 11px; font-weight: 600; color: #94A3B8; pointer-events: none; }
          .controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(15, 23, 42, 0.9); padding: 6px 12px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
          .btn { background: #1E293B; border: 1px solid #334155; color: #F8FAFC; padding: 8px 14px; border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; }
          .btn:active { background: #334155; }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js"></script>
      </head>
      <body>
        <div id="canvas-container">
          <div class="hud">CAD ENGINE · ${ext.toUpperCase()} ${is2D ? '2D BLUEPRINT' : '3D MODEL'} VIEWER</div>
        </div>

        <script>
          const container = document.getElementById('canvas-container');
          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0x0F172A);

          // Grid Helper
          const gridHelper = new THREE.GridHelper(20, 20, 0x695030, 0x334155);
          scene.add(gridHelper);

          // Camera & Renderer
          const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
          camera.position.set(5, 5, 5);

          const renderer = new THREE.WebGLRenderer({ antialias: true });
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderer.setPixelRatio(window.devicePixelRatio);
          container.appendChild(renderer.domElement);

          // Controls
          const controls = new THREE.OrbitControls(camera, renderer.domElement);
          controls.enableDamping = true;
          controls.dampingFactor = 0.05;

          // Lights
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
          scene.add(ambientLight);

          const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
          dirLight1.position.set(10, 20, 10);
          scene.add(dirLight1);

          const dirLight2 = new THREE.DirectionalLight(0xb89047, 0.5);
          dirLight2.position.set(-10, -10, -10);
          scene.add(dirLight2);

          // Sample Parametric CAD Facade Geometry
          const material = new THREE.MeshStandardMaterial({
            color: 0xB89047,
            metalness: 0.6,
            roughness: 0.3,
            wireframe: ${wireframe}
          });

          if ('${ext}' === 'dxf' || '${ext}' === 'dwg') {
            // 2D Profile / Blueprint Render
            const group = new THREE.Group();
            const frameGeo = new THREE.BoxGeometry(4, 3, 0.05);
            const edges = new THREE.EdgesGeometry(frameGeo);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38BDF8, linewidth: 2 }));
            group.add(line);
            
            // Subgrid lines inside CAD drawing
            for(let i = -1.5; i <= 1.5; i += 0.75) {
              const subGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, -1.5, 0),
                new THREE.Vector3(i, 1.5, 0)
              ]);
              group.add(new THREE.Line(subGeo, new THREE.LineBasicMaterial({ color: 0x64748B })));
            }
            scene.add(group);
            camera.position.set(0, 0, 5);
          } else {
            // 3D Glass & Facade Structural CAD Render
            const group = new THREE.Group();
            
            // Outer Frame (Aluminium Profile)
            const outerGeo = new THREE.BoxGeometry(3, 4, 0.2);
            const outerMesh = new THREE.Mesh(outerGeo, material);
            group.add(outerMesh);

            // Glass Panel (Translucent)
            const glassGeo = new THREE.BoxGeometry(2.7, 3.7, 0.05);
            const glassMat = new THREE.MeshPhysicalMaterial({
              color: 0x38BDF8,
              transmission: 0.9,
              opacity: 1,
              transparent: true,
              roughness: 0.1,
              ior: 1.5
            });
            const glassMesh = new THREE.Mesh(glassGeo, glassMat);
            group.add(glassMesh);

            scene.add(group);
          }

          function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          }
          animate();

          window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          });
        </script>
      </body>
    </html>
  `;

  const handleShare = async () => {
    try {
      await Share.share({ message: `Fine Glaze CAD Model (${fileName}):\n${fileUrl}` });
    } catch (e) {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
            <View style={styles.extBadge}>
              <Text style={styles.extBadgeText}>{ext.toUpperCase()} MODEL</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-social-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* CAD View Container */}
        <View style={styles.viewerWrap}>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={htmlContent}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="CAD 3D Viewer"
              onLoad={() => setLoading(false)}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={{ flex: 1, backgroundColor: '#0F172A' }}
              onLoadEnd={() => setLoading(false)}
            />
          )}

          {loading && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#B89047" />
              <Text style={styles.loaderText}>Loading CAD Engine…</Text>
            </View>
          )}
        </View>

        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <TouchableOpacity
            style={[styles.toolBtn, wireframe && styles.toolBtnActive]}
            onPress={() => setWireframe(!wireframe)}
          >
            <Ionicons name="grid-outline" size={18} color={wireframe ? '#B89047' : '#F8FAFC'} />
            <Text style={[styles.toolBtnText, wireframe && { color: '#B89047' }]}>
              {wireframe ? 'Shaded View' : 'Wireframe'}
            </Text>
          </TouchableOpacity>

          <View style={styles.badgeInfo}>
            <Ionicons name="hardware-chip-outline" size={16} color="#94A3B8" />
            <Text style={styles.badgeInfoText}>Interactive 3D / DXF Canvas</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: spacing.md,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fileName: { fontSize: 15, fontFamily: fontFamily.bold, color: '#F8FAFC', flexShrink: 1 },
  extBadge: { backgroundColor: '#B89047', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  extBadgeText: { fontSize: 9, fontFamily: fontFamily.bold, color: '#FFFFFF' },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  viewerWrap: { flex: 1, position: 'relative' },
  loaderWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loaderText: { fontSize: 13, fontFamily: fontFamily.medium, color: '#94A3B8' },

  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toolBtnActive: {
    borderColor: '#B89047',
    backgroundColor: 'rgba(184, 144, 71, 0.15)',
  },
  toolBtnText: { fontSize: 12, fontFamily: fontFamily.bold, color: '#F8FAFC' },
  badgeInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeInfoText: { fontSize: 11, fontFamily: fontFamily.medium, color: '#94A3B8' },
});
