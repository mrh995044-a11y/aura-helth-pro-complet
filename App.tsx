import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StoreProvider, useStore } from './lib/store';
import { C } from './lib/theme';
import { GoogleLink, LockScreen, SignIn, SignUp, Welcome } from './screens/Auth';
import { VitalsScreen } from './screens/Vitals';
import { CoachScreen } from './screens/Coach';
import { MedsScreen } from './screens/Meds';
import { VisitsScreen } from './screens/Visits';
import { ProfileScreen } from './screens/Profile';
import { syncMedicationReminders } from './lib/reminders';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.bg,
    card: '#100C1A',
    text: C.text,
    border: C.line,
    primary: C.violet,
  },
};

function Tabs() {
  const { t } = useStore();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#100C1A',
          borderTopColor: C.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: C.pink,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Vitals: 'pulse',
            AuraCoach: 'sparkles',
            Medications: 'medkit-outline',
            Visits: 'calendar-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={map[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Vitals" component={VitalsScreen} options={{ tabBarLabel: t('tab_vitals') }} />
      <Tab.Screen name="AuraCoach" component={CoachScreen} options={{ tabBarLabel: t('tab_coach') }} />
      <Tab.Screen name="Medications" component={MedsScreen} options={{ tabBarLabel: t('tab_meds') }} />
      <Tab.Screen name="Visits" component={VisitsScreen} options={{ tabBarLabel: t('tab_visits') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tab_profile') }} />
    </Tab.Navigator>
  );
}

function Gate() {
  const { ready, session, locked, vault } = useStore();
  const meds = session ? vault.meds : null;
  useEffect(() => {
    if (ready) syncMedicationReminders(meds || []).catch((error) => console.warn('Medication reminders:', error));
  }, [ready, session?.email, meds]);
  const [auth, setAuth] = useState<'welcome' | 'in' | 'up' | 'google'>('welcome');

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.pink} />
      </View>
    );
  }
  if (!session) {
    if (auth === 'in') return <SignIn onBack={() => setAuth('welcome')} onSignUp={() => setAuth('up')} onGoogle={() => setAuth('google')} />;
    if (auth === 'up') return <SignUp onBack={() => setAuth('welcome')} onSignIn={() => setAuth('in')} />;
    if (auth === 'google') return <GoogleLink onBack={() => setAuth('welcome')} />;
    return <Welcome onSignIn={() => setAuth('in')} onSignUp={() => setAuth('up')} onGoogle={() => setAuth('google')} />;
  }
  if (locked) return <LockScreen />;
  return (
    <NavigationContainer theme={navTheme}>
      <Tabs />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1, backgroundColor: '#100C1A' }} edges={['top', 'right', 'bottom', 'left']}>
          <Gate />
        </SafeAreaView>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
