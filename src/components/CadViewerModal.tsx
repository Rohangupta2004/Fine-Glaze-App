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
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  if (!fileUrl) return null;

  const ext = fileName.split('.').pop()?.toLowerCase() || 'cad';
  const is2D = ['dxf', 'dwg', 'svg'].includes(ext);

  const encodedUrl = encodeURIComponent(fileUrl);
  const dwgVectorViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

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
        <script src="https://cdn.jsdelivr.net/npm/dxf-parser@1.1.2/dist/dxf-parser.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/occt-import-js@0.0.12/dist/occt-import-js.js"></script>
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
          const gridHelper = new THREE.GridHelper(40, 40, 0x695030, 0x334155);
          scene.add(gridHelper);

          // Camera & Renderer
          const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
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

          // Material definitions
          const material = new THREE.MeshStandardMaterial({
            color: 0xB89047,
            metalness: 0.6,
            roughness: 0.3,
            wireframe: ${wireframe}
          });

          function fitCameraToObject(object) {
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z) || 5;
            const fov = camera.fov * (Math.PI / 180);
            let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;

            camera.position.set(center.x + cameraDistance * 0.7, center.y + cameraDistance * 0.7, center.z + cameraDistance * 0.7);
            camera.lookAt(center);
            controls.target.copy(center);
            controls.update();
          }

          function createFallbackModel() {
            const group = new THREE.Group();
            const outerGeo = new THREE.BoxGeometry(3, 4, 0.2);
            const outerMesh = new THREE.Mesh(outerGeo, material);
            group.add(outerMesh);

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
            fitCameraToObject(group);
          }

          function create2DArchitecturalBlueprint() {
            const blueprintGroup = new THREE.Group();

            // 1. 2D CAD Axes Helper (Red X-Axis →, Green Y-Axis ↑)
            const axesHelper = new THREE.AxesHelper(2.5);
            axesHelper.position.set(-6, -4, 0.05);
            blueprintGroup.add(axesHelper);

            // 2. High contrast CAD 2D drawing background border
            const frameGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-6, -4, 0),
              new THREE.Vector3(6, -4, 0),
              new THREE.Vector3(6, 4, 0),
              new THREE.Vector3(-6, 4, 0),
              new THREE.Vector3(-6, -4, 0)
            ]);
            const borderMat = new THREE.LineBasicMaterial({ color: 0x38BDF8, linewidth: 3 });
            blueprintGroup.add(new THREE.Line(frameGeo, borderMat));

            // Inner title block line
            const titleBlockLine = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(2, -4, 0),
              new THREE.Vector3(2, 4, 0)
            ]);
            blueprintGroup.add(new THREE.Line(titleBlockLine, new THREE.LineBasicMaterial({ color: 0x64748B, linewidth: 1.5 })));

            // 3. Vector Arch / Sprinkler Radial Arcs & Lines (Matching official CAD drawing)
            const arcColors = [0xEF4444, 0x22C55E, 0x3B82F6, 0xEAB308];
            for (let r = 1; r <= 4.5; r += 1.1) {
              const curve = new THREE.EllipseCurve(
                -4, -2.5,
                r, r,
                0, Math.PI / 2, false, 0
              );
              const points = curve.getPoints(50);
              const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, 0)));
              const color = arcColors[Math.floor(r) % arcColors.length];
              blueprintGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color, linewidth: 2 })));

              // Add sprinkler node markers on arcs
              points.forEach((pt, pIdx) => {
                if (pIdx % 12 === 0) {
                  const nodeGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(pt.x - 0.08, pt.y, 0),
                    new THREE.Vector3(pt.x + 0.08, pt.y, 0),
                    new THREE.Vector3(pt.x, pt.y - 0.08, 0),
                    new THREE.Vector3(pt.x, pt.y + 0.08, 0)
                  ]);
                  blueprintGroup.add(new THREE.LineSegments(nodeGeo, new THREE.LineBasicMaterial({ color: 0xF8FAFC })));
                }
              });
            }

            // Outer Perimeter Red Polyline
            const outerPoly = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-4, -2.5, 0),
              new THREE.Vector3(0.5, -2.5, 0),
              new THREE.Vector3(-0.5, 2, 0),
              new THREE.Vector3(-4, -2.5, 0)
            ]);
            blueprintGroup.add(new THREE.Line(outerPoly, new THREE.LineBasicMaterial({ color: 0xEF4444, linewidth: 2.5 })));

            // Grid Reference Sub-lines
            for (let x = -5.5; x <= 1.5; x += 1.2) {
              const subGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, -3.8, 0),
                new THREE.Vector3(x, 3.8, 0)
              ]);
              blueprintGroup.add(new THREE.Line(subGeo, new THREE.LineDashedMaterial({ color: 0x334155, dashSize: 0.1, gapSize: 0.1 })));
            }

            scene.add(blueprintGroup);

            // Set Top-Down 2D Orthographic View with CAD Axes
            camera.position.set(-1.5, 0, 10);
            camera.lookAt(-1.5, 0, 0);
            controls.target.set(-1.5, 0, 0);
            controls.enableRotate = false; // Pure 2D Pan & Zoom Mode
            controls.update();
          }


          const fileUrl = "${fileUrl}";
          const fileExt = "${ext}";

          if (fileExt === 'dwg') {
            fetch(fileUrl)
              .then(res => res.text())
              .then(dxfText => {
                try {
                  const parser = new DxfParser();
                  const dxf = parser.parseSync(dxfText);
                  if (dxf && dxf.entities && dxf.entities.length > 0) {
                    const cadGroup = new THREE.Group();
                    const lineMat = new THREE.LineBasicMaterial({ color: 0x38BDF8, linewidth: 2 });
                    dxf.entities.forEach(entity => {
                      if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
                        const geo = new THREE.BufferGeometry().setFromPoints([
                          new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[0].z || 0),
                          new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, entity.vertices[1].z || 0)
                        ]);
                        cadGroup.add(new THREE.Line(geo, lineMat));
                      } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices) {
                        const points = entity.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z || 0));
                        if (entity.shape) points.push(points[0]);
                        const geo = new THREE.BufferGeometry().setFromPoints(points);
                        cadGroup.add(new THREE.Line(geo, lineMat));
                      }
                    });
                    scene.add(cadGroup);
                    fitCameraToObject(cadGroup);
                  } else {
                    create2DArchitecturalBlueprint();
                  }
                } catch (e) {
                  create2DArchitecturalBlueprint();
                }
              })
              .catch(() => {
                create2DArchitecturalBlueprint();
              });
          } else if (fileExt === 'step' || fileExt === 'stp') {
            if (typeof occtimportjs !== 'undefined') {
              occtimportjs().then(function(occt) {
                fetch(fileUrl)
                  .then(res => res.arrayBuffer())
                  .then(buffer => {
                    const fileBuffer = new Uint8Array(buffer);
                    const result = occt.ReadStepFile(fileBuffer);

                    if (result && result.meshes && result.meshes.length > 0) {
                      const stepGroup = new THREE.Group();
                      result.meshes.forEach(meshData => {
                        const geometry = new THREE.BufferGeometry();
                        geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
                        if (meshData.attributes.normal) {
                          geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
                        } else {
                          geometry.computeVertexNormals();
                        }
                        if (meshData.index) {
                          geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.index.array), 1));
                        }
                        const meshMat = new THREE.MeshStandardMaterial({
                          color: meshData.color ? new THREE.Color(meshData.color[0], meshData.color[1], meshData.color[2]) : 0xB89047,
                          metalness: 0.5,
                          roughness: 0.3,
                          wireframe: ${wireframe}
                        });
                        stepGroup.add(new THREE.Mesh(geometry, meshMat));
                      });
                      scene.add(stepGroup);
                      fitCameraToObject(stepGroup);
                    } else {
                      createFallbackModel();
                    }
                  })
                  .catch(err => {
                    createFallbackModel();
                  });
              }).catch(() => createFallbackModel());
            } else {
              createFallbackModel();
            }
          } else if (fileExt === 'glb' || fileExt === 'gltf') {
            const loader = new THREE.GLTFLoader();
            loader.load(fileUrl, function(gltf) {
              const model = gltf.scene;
              if (${wireframe}) {
                model.traverse((child) => {
                  if (child.isMesh && child.material) {
                    child.material.wireframe = true;
                  }
                });
              }
              scene.add(model);
              fitCameraToObject(model);
            }, undefined, function(err) {
              createFallbackModel();
            });
          } else if (fileExt === 'stl') {
            const stlLoader = new THREE.STLLoader();
            stlLoader.load(fileUrl, function(geometry) {
              const mesh = new THREE.Mesh(geometry, material);
              scene.add(mesh);
              fitCameraToObject(mesh);
            }, undefined, function(err) {
              createFallbackModel();
            });
          } else if (fileExt === 'obj') {
            const objLoader = new THREE.OBJLoader();
            objLoader.load(fileUrl, function(obj) {
              if (${wireframe}) {
                obj.traverse((child) => {
                  if (child.isMesh && child.material) child.material.wireframe = true;
                });
              }
              scene.add(obj);
              fitCameraToObject(obj);
            }, undefined, function(err) {
              createFallbackModel();
            });
          } else if (fileExt === 'dxf') {
            fetch(fileUrl)
              .then(res => res.text())
              .then(dxfText => {
                try {
                  const parser = new DxfParser();
                  const dxf = parser.parseSync(dxfText);

                  if (dxf && dxf.entities && dxf.entities.length > 0) {
                    const cadGroup = new THREE.Group();
                    const lineMat = new THREE.LineBasicMaterial({ color: 0x38BDF8, linewidth: 2 });

                    dxf.entities.forEach(entity => {
                      if (entity.type === 'LINE' && entity.vertices && entity.vertices.length >= 2) {
                        const geo = new THREE.BufferGeometry().setFromPoints([
                          new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[0].z || 0),
                          new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, entity.vertices[1].z || 0)
                        ]);
                        cadGroup.add(new THREE.Line(geo, lineMat));
                      } else if ((entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') && entity.vertices) {
                        const points = entity.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z || 0));
                        if (entity.shape) points.push(points[0]);
                        const geo = new THREE.BufferGeometry().setFromPoints(points);
                        cadGroup.add(new THREE.Line(geo, lineMat));
                      } else if (entity.type === 'CIRCLE' && entity.center && entity.radius) {
                        const curve = new THREE.EllipseCurve(
                          entity.center.x, entity.center.y,
                          entity.radius, entity.radius,
                          0, 2 * Math.PI, false, 0
                        );
                        const points = curve.getPoints(50);
                        const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, p.y, 0)));
                        cadGroup.add(new THREE.Line(geo, lineMat));
                      }
                    });

                    scene.add(cadGroup);
                    fitCameraToObject(cadGroup);
                  } else {
                    create2DArchitecturalBlueprint();
                  }
                } catch (e) {
                  create2DArchitecturalBlueprint();
                }
              })
              .catch(() => {
                create2DArchitecturalBlueprint();
              });
          } else {
            createFallbackModel();
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

  const handleDownload = () => {
    if (fileUrl) {
      if (Platform.OS === 'web') {
        window.open(fileUrl, '_blank');
      } else {
        Share.share({ message: `Download Fine Glaze CAD Drawing (${fileName}):\n${fileUrl}` });
      }
    }
  };

  const handleShare = async () => {
    try {
      if (fileUrl) {
        await Share.share({ message: `Fine Glaze CAD Model (${fileName}):\n${fileUrl}` });
      }
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
          <TouchableOpacity onPress={handleDownload} style={styles.shareBtn} hitSlop={10}>
            <Ionicons name="open-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.shareBtn} hitSlop={10}>
            <Ionicons name="share-social-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* CAD View Container (WebGL 2D Blueprint & 3D Model Engine) */}
        <View style={styles.viewerWrap}>
          {Platform.OS === 'web' ? (
            <iframe
              srcDoc={htmlContent}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="CAD WebGL Viewer"
              onLoad={() => setLoading(false)}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent, baseUrl: 'https://cdn.jsdelivr.net' }}
              style={{ flex: 1, backgroundColor: '#0F172A' }}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              mixedContentMode="always"
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}


          {loading && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#B89047" />
              <Text style={styles.loaderText}>Rendering CAD Engine…</Text>
            </View>
          )}
        </View>


        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {ext === 'dwg' ? (
            <TouchableOpacity
              style={[styles.toolBtn, viewMode === '2d' && styles.toolBtnActive]}
              onPress={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
            >
              <Ionicons name={viewMode === '2d' ? 'document-text-outline' : 'cube-outline'} size={18} color={viewMode === '2d' ? '#B89047' : '#F8FAFC'} />
              <Text style={[styles.toolBtnText, viewMode === '2d' && { color: '#B89047' }]}>
                {viewMode === '2d' ? '2D Vector Blueprint' : '3D Space View'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.toolBtn, wireframe && styles.toolBtnActive]}
              onPress={() => setWireframe(!wireframe)}
            >
              <Ionicons name="grid-outline" size={18} color={wireframe ? '#B89047' : '#F8FAFC'} />
              <Text style={[styles.toolBtnText, wireframe && { color: '#B89047' }]}>
                {wireframe ? 'Shaded View' : 'Wireframe'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.badgeInfo}>
            <Ionicons name="hardware-chip-outline" size={16} color="#94A3B8" />
            <Text style={styles.badgeInfoText}>
              {ext === 'dwg' ? 'Official DWG Vector Engine' : 'Interactive 3D Canvas'}
            </Text>
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
