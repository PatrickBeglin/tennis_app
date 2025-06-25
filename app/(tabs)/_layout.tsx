import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
        screenOptions={{
            tabBarActiveTintColor:"white",
            tabBarInactiveTintColor: "#939393",
            tabBarStyle:{
                backgroundColor: "black",
                borderTopWidth: 0,
            },
            headerShown: false,
        }}
    >
      <Tabs.Screen name = 'index'
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({color, focused}) =>(

           <Ionicons name="home" size={26} color={color}></Ionicons>
        ),
      }} 
      />
      <Tabs.Screen
        name = 'summary'
        options={{  
            tabBarLabel: "Summary",
            tabBarIcon: ({color, focused}) => (
                <Ionicons name ="bar-chart-outline" size={26} color={color} />
            ),
        }} />
    </Tabs>
  );
}