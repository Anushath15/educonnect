import { Tabs } from "expo-router"
import { Text } from "react-native"

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1E293B",
          borderTopColor: "#334155",
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>Home</Text>,
        }}
      />
      <Tabs.Screen
        name="teachers"
        options={{
          title: "Teachers",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>Staff</Text>,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: "Classes",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>Cls</Text>,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: "Timetable",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>Time</Text>,
        }}
      />
      <Tabs.Screen
        name="substitutions"
        options={{
          title: "Subs",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>Sub</Text>,
        }}
      />
      <Tabs.Screen
        name="swap-requests"
        options={{
          title: "Swaps",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>Swap</Text>,
        }}
      />
    </Tabs>
  )
}