import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="diet"
        options={{
          title: t('tabs.nutrition'),
          tabBarIcon: ({ color }) => <TabIcon name="cutlery" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('tabs.workouts'),
          tabBarIcon: ({ color }) => <TabIcon name="heartbeat" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tabs.progress'),
          tabBarIcon: ({ color }) => <TabIcon name="line-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calorie-camera"
        options={{
          title: t('tabs.calories'),
          tabBarIcon: ({ color }) => <TabIcon name="camera" color={color} />,
        }}
      />
    </Tabs>
  );
}

