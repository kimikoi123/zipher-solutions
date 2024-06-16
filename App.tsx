import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Text,
  PermissionsAndroid,
  Platform,
  Alert,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import {
  BleManager,
  Device,
  Characteristic,
  Service,
} from 'react-native-ble-plx';
import {Buffer} from 'buffer';

const manager = new BleManager();

interface BLEDevice extends Device {
  id: string;
  name: string | null;
}

const App: React.FC = () => {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(
    null,
  );
  const [selectedServiceUUID, setSelectedServiceUUID] = useState<string | null>(
    null,
  );
  const [selectedCharacteristicUUID, setSelectedCharacteristicUUID] = useState<
    string | null
  >(null);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#333' : '#fff',
  };

  const scanForDevices = () => {
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        return;
      }
      if (device) {
        setDevices(prevDevices => {
          if (!prevDevices.some(d => d.id === device.id)) {
            return [...prevDevices, device as BLEDevice];
          }
          return prevDevices;
        });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
    }, 5000); // Stop scanning after 5 seconds
  };

  const connectToDevice = (device: BLEDevice) => {
    manager
      .connectToDevice(device.id)
      .then(device => device.discoverAllServicesAndCharacteristics())
      .then(device => {
        setConnectedDevice(device as BLEDevice);
        return device.services();
      })
      .then(services => {
        if (services.length > 0) {
          const service = services[0];
          setSelectedServiceUUID(service.uuid);
          return service.characteristics();
        } else {
          throw new Error('No services found');
        }
      })
      .then(characteristics => {
        if (characteristics.length > 0) {
          const characteristic = characteristics[0];
          setSelectedCharacteristicUUID(characteristic.uuid);
          Alert.alert(
            'Connected to device',
            `Service and Characteristic automatically selected.`,
          );
        } else {
          throw new Error('No characteristics found');
        }
      })
      .catch(error => {
        console.error(error);
        Alert.alert('Connection error', error.message);
      });
  };

  const sendDummyMessage = () => {
    if (!connectedDevice) {
      Alert.alert('No device connected', 'Please connect to a device first.');
      return;
    }
    if (!selectedServiceUUID || !selectedCharacteristicUUID) {
      Alert.alert(
        'No characteristic selected',
        'Failed to automatically select a characteristic.',
      );
      return;
    }

    const message = 'Hello BLE Device';
    const base64Message = Buffer.from(message).toString('base64');

    connectedDevice
      .writeCharacteristicWithResponseForService(
        selectedServiceUUID,
        selectedCharacteristicUUID,
        base64Message,
      )
      .then((characteristic: Characteristic) => {
        Alert.alert('Message sent', `Message: ${message}`);
      })
      .catch(error => {
        console.error(error);
        Alert.alert('Failed to send message', 'Error sending message');
      });
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ).then(result => {
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          scanForDevices();
        } else {
          Alert.alert(
            'Permission denied',
            'Location permission is required to scan for BLE devices.',
          );
        }
      });
    } else {
      scanForDevices();
    }

    // Cleanup manager on component unmount
    return () => {
      manager.destroy();
    };
  }, []);

  return (
    <SafeAreaView style={[backgroundStyle, styles.container]}>
      <Text style={[styles.title, {color: isDarkMode ? '#fff' : '#000'}]}>
        Bluetooth Devices:
      </Text>
      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => connectToDevice(item)}
            style={styles.deviceButton}>
            <Text
              style={[
                styles.deviceText,
                {color: isDarkMode ? '#fff' : '#000'},
              ]}>
              {item.name || 'Unnamed Device'}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
      {connectedDevice && (
        <TouchableOpacity onPress={sendDummyMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send Dummy Message</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginVertical: 16,
    textAlign: 'center',
  },
  list: {
    flexGrow: 1,
  },
  deviceButton: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: '#007bff',
    borderRadius: 8,
    alignItems: 'center',
  },
  deviceText: {
    fontSize: 18,
    fontWeight: '500',
  },
  sendButton: {
    padding: 16,
    marginVertical: 16,
    backgroundColor: 'blue',
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default App;
