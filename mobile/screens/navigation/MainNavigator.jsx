import ServiceListScreen from "../screens/service/ServiceListScreen";
import ServiceFormScreen from "../screens/service/ServiceFormScreen";

// Di dalam Stack Navigator:
<>
  // Di dalam Stack Navigator:
  <>
    // Di dalam Stack Navigator:
    <Stack.Screen
      name="ServiceList"
      component={ServiceListScreen}
      options={{ title: "Master Layanan" }}
    />
    <Stack.Screen
      name="ServiceForm"
      component={ServiceFormScreen}
      options={{ title: "Tambah Layanan" }}
    />
  </>
  <Tab.Screen
    name="LayananTab"
    component={ServiceListScreen}
    options={{
      tabBarLabel: "Layanan",
      tabBarIcon: ({ color, size }) => (
        <Text style={{ fontSize: size, color }}>💉</Text>
      ),
    }}
  />
</>;
