import React, { useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Button, 
  FAB,
  IconButton,
  Chip
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMqtt } from '../../context/MqttContext';
import { COLORS } from '../../constants';
import ModernCard from '../../components/ModernCard';

const MqttListScreen = ({ navigation }) => {
  const { configs, deleteConfig, setActiveConfig } = useMqtt();

  const handleDeleteConfig = (config) => {
    Alert.alert(
      'Xóa mạng vườn',
      `Bạn có chắc chắn muốn xóa "${config.name}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: () => deleteConfig(config._id)
        }
      ]
    );
  };

  const getStatusColor = (isConnected) => {
    return isConnected ? COLORS.success : COLORS.error;
  };

  const renderConfigCard = (config) => (
    <ModernCard key={config._id}>
      <View style={styles.configHeader}>
        <View style={styles.configInfo}>
          <Text style={styles.configName}>{config.name}</Text>
          <Text style={styles.configHost}>{config.host}:{config.port}</Text>
        </View>
        
        <View style={styles.configStatus}>
          <View 
            style={[
              styles.statusDot, 
              { backgroundColor: getStatusColor(config.isConnected) }
            ]} 
          />
          <Text style={styles.statusText}>
            {config.isConnected ? 'Đã kết nối' : 'Ngắt kết nối'}
          </Text>
        </View>
      </View>

      {config.isDefault && (
        <Chip 
          mode="flat" 
          compact 
          style={styles.defaultChip}
          textStyle={{ color: COLORS.primary }}
        >
          Mạng mặc định
        </Chip>
      )}

      <View style={styles.configActions}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('EditMqttConfig', { config })}
          icon="pencil"
          style={styles.actionButton}
          theme={{ colors: { outline: COLORS.primary } }}
          textColor={COLORS.primary}
        >
          Chỉnh sửa
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => setActiveConfig(config)}
          icon="connection"
          style={styles.actionButton}
          theme={{ colors: { outline: COLORS.secondary } }}
          textColor={COLORS.secondary}
        >
          Kết nối
        </Button>
        
        <IconButton
          icon="delete"
          iconColor="#D32F2F"
          onPress={() => handleDeleteConfig(config)}
          style={styles.deleteButton}
        />
      </View>
    </ModernCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>🌐 Garden Networks</Text>
            <Text style={styles.subtitle}>
              Quản lý các kết nối broker MQTT của bạn
            </Text>
          </View>

          {configs && configs.length > 0 ? (
            configs.map(renderConfigCard)
          ) : (
            <ModernCard>
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Không có mạng vườn</Text>
                <Text style={styles.emptySubtitle}>
                  Thêm broker MQTT đầu tiên để bắt đầu kết nối các thiết bị vườn của bạn
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('AddMqttConfig')}
                  icon="plus"
                  style={styles.addButton}
                  buttonColor={COLORS.primary}
                >
                  Thêm mạng vườn
                </Button>
              </View>
            </ModernCard>
          )}
        </View>
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddMqttConfig')}
        label="Thêm mạng"
        color={COLORS.white}
        customSize={56}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  configInfo: {
    flex: 1,
  },
  configName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  configHost: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  configStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  defaultChip: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    backgroundColor: COLORS.secondary + '20',
  },
  configActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  deleteButton: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});

export default MqttListScreen;