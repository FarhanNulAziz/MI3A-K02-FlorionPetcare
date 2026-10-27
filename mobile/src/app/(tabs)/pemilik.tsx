import { useNavigation } from "expo-router/react-navigation";
import OwnerListScreen from '../../screens/owner/OwnerListScreen';

export default function PemilikTab() {
  const navigation = useNavigation();
  return <OwnerListScreen navigation={navigation} />;
}
