import React, { useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from './ui';
import { C } from '../lib/theme';
import type { PhotoKind } from '../lib/types';

type Capture = { uri: string; base64: string; mime: string; kind: PhotoKind };
const KINDS: { id: PhotoKind; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { id: 'meal', label: 'Meal', icon: 'restaurant-outline', color: '#7BE0CD' },
  { id: 'pack', label: 'Medicine', icon: 'medkit-outline', color: '#FF96BD' },
  { id: 'document', label: 'Report', icon: 'document-text-outline', color: '#B9AAFF' },
  { id: 'skin', label: 'Skin concern', icon: 'heart-outline', color: '#FFD18A' },
];

export function CoachCamera({ visible, onClose, onAnalyze }: { visible: boolean; onClose: () => void; onAnalyze: (photo: Capture) => void }) {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [kind, setKind] = useState<PhotoKind>('meal');
  const [photo, setPhoto] = useState<Capture | null>(null);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const selected = KINDS.find(item => item.id === kind)!;
  const close = () => { setPhoto(null); setReady(false); onClose(); };
  const take = async () => {
    if (!ready || taking || !camera.current) return;
    setTaking(true);
    try {
      const captured = await camera.current.takePictureAsync({ quality: 0.7 });
      if (!captured?.uri) throw new Error('No photo returned');
      const ctx = ImageManipulator.manipulate(captured.uri);
      if (Math.max(captured.width, captured.height) > 1440) {
        ctx.resize(captured.width >= captured.height ? { width: 1440 } : { height: 1440 });
      }
      const image = await ctx.renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
      if (!result.base64 || result.base64.length > 1800000) throw new Error('The image is too large to send.');
      setPhoto({ uri: result.uri, base64: result.base64, mime: 'image/jpeg', kind });
    } catch (error) { Alert.alert('Camera', error instanceof Error ? error.message : 'Could not take the photo. Please try again.'); }
    finally { setTaking(false); }
  };
  return <Modal visible={visible} animationType="slide" onRequestClose={close}>
    <View style={{ flex: 1, backgroundColor: '#100C1A' }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 22, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Txt size={21} weight="800">AuraCoach camera</Txt><Txt size={12} color={C.muted}>Choose a guide, then take a photo</Txt></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={close} style={{ padding: 10 }}><Ionicons name="close" size={25} color={C.white} /></Pressable>
      </View>
      {!permission?.granted ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 25 }}>
        <Txt color={C.muted}>Camera permission is needed to take a photo. Photos are not sent until you choose Analyze.</Txt>
        <Pressable accessibilityRole="button" onPress={requestPermission} style={{ padding: 14, borderRadius: 14, backgroundColor: C.violetDeep }}><Txt weight="700">Allow camera</Txt></Pressable>
      </View> : <>
        <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 22, overflow: 'hidden', backgroundColor: '#252034' }}>
          {photo ? <Image source={{ uri: photo.uri }} resizeMode="contain" style={{ flex: 1 }} /> : visible ? <CameraView ref={camera} facing="back" style={{ flex: 1 }} onCameraReady={() => setReady(true)} /> : null}
          <View pointerEvents="none" style={{ position: 'absolute', left: 18, top: 18, backgroundColor: '#130E25DD', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', gap: 7, alignItems: 'center' }}>
            <Ionicons name={selected.icon} size={15} color={selected.color} /><Txt size={12} weight="700" color={selected.color}>{selected.label} guide</Txt>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: '12%', right: '12%', top: '20%', bottom: '20%', borderWidth: 2, borderColor: selected.color, borderRadius: 22, opacity: 0.85 }} />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 14, left: 15, right: 15, backgroundColor: '#120D20DD', borderRadius: 12, padding: 9 }}>
            <Txt size={11} color={C.white}>{kind === 'skin' ? 'Guide only. A photo cannot identify an infection or pathogen.' : 'Guide only — the frame does not identify or measure anything.'}</Txt>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }} style={{ flexGrow: 0 }}>
          {KINDS.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setKind(item.id); if (photo) setPhoto({ ...photo, kind: item.id }); }} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 30, backgroundColor: kind === item.id ? '#483762' : '#241C35' }}>
            <Ionicons name={item.icon} size={15} color={item.color} /><Txt size={12} color={C.white}>{item.label}</Txt>
          </Pressable>)}
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingBottom: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
          {photo ? <>
            <Pressable onPress={() => { setPhoto(null); setReady(false); }} style={{ backgroundColor: '#302440', paddingHorizontal: 22, paddingVertical: 13, borderRadius: 15 }}><Txt weight="700">Retake</Txt></Pressable>
            <Pressable onPress={() => { const result = photo; setPhoto(null); setReady(false); onClose(); onAnalyze(result); }} style={{ backgroundColor: C.violetDeep, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 15 }}><Txt weight="700">Analyze photo</Txt></Pressable>
          </> : <Pressable accessibilityRole="button" accessibilityLabel="Take photo" disabled={!ready || taking} onPress={take} style={{ width: 68, height: 68, borderRadius: 34, borderWidth: 5, borderColor: '#DED3F3', backgroundColor: taking ? C.muted : C.white, opacity: ready ? 1 : 0.5 }} />}
        </View>
      </>}
    </View>
  </Modal>;
}
