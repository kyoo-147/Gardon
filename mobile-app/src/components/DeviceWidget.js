import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Card,
  Button,
  Switch,
  Text,
  IconButton,
  Chip,
  Portal,
  Dialog,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { Slider } from '@react-native-community/slider';
import ColorPicker from 'react-native-wheel-color-picker';
import { COLORS } from '../constants';

const DeviceWidget = ({ device, onControl, showDetails = false, onRefreshDevice, size = 'normal' }) => {
  // Simple state management - just track UI dialogs and values
  const [localValue, setLocalValue] = useState(device.currentState?.value || 0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [isLoading, setIsLoading] = useState(false);

  // Compact mode styles
  const isCompact = size === 'compact';

  // Update local value when device state changes
  useEffect(() => {
    if (device.currentState?.value !== undefined) {
      setLocalValue(device.currentState.value);
    }
  }, [device.currentState?.value]);

  const handleControl = async (command, value) => {
    // Simple loading state
    if (isLoading) {
      return;
    }

    // Show confirmation dialog if enabled
    if (device.advancedOptions?.confirmOnPublish) {
      Alert.alert(
        '🔧 Xác nhận điều khiển thiết bị',
        `Gửi lệnh "${command}" ${value !== undefined ? `với giá trị "${value}"` : ''} đến ${device.name}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Gửi', onPress: () => sendCommand(command, value) }
        ]
      );
    } else {
      sendCommand(command, value);
    }
  };

  const sendCommand = async (command, value) => {
    setIsLoading(true);
    
    try {
      await onControl(device._id, command, value);
      
      // Refresh device state from server after sending command
      if (onRefreshDevice) {
        setTimeout(async () => {
          try {
            await onRefreshDevice(device._id);
          } catch (error) {
            console.error('Failed to refresh device state:', error);
          }
        }, 1000); // Give device time to update
      }
    } catch (error) {
      console.error('Error sending command:', error);
      Alert.alert('Error', 'Failed to send command to device');
    } finally {
      setIsLoading(false);
    }
  };

  const renderButtonWidget = () => {
    const isOn = device.currentState?.value === 'ON' || 
                 device.currentState?.value === true ||
                 device.currentState?.value === 1;
    
    if (isCompact) {
      return (
        <View style={styles.compactButtonContainer}>
          <Button
            mode={isOn ? "contained" : "outlined"}
            onPress={() => handleControl('ON')}
            style={[
              styles.compactButton, 
              styles.compactOnButton,
              { 
                backgroundColor: isOn ? '#8BC34A' : 'rgba(139, 195, 74, 0.2)',
                borderColor: isOn ? '#8BC34A' : 'rgba(139, 195, 74, 0.5)'
              }
            ]}
            labelStyle={[
              styles.compactButtonLabel,
              { color: '#FFFFFF' }
            ]}
            compact
          >
            ON
          </Button>
          <Button
            mode={!isOn ? "contained" : "outlined"}
            onPress={() => handleControl('OFF')}
            style={[
              styles.compactButton, 
              styles.compactOffButton,
              { 
                backgroundColor: !isOn ? '#FF6B6B' : 'rgba(255, 107, 107, 0.2)',
                borderColor: !isOn ? '#FF6B6B' : 'rgba(255, 107, 107, 0.5)'
              }
            ]}
            labelStyle={[
              styles.compactButtonLabel,
              { color: '#FFFFFF' }
            ]}
            disabled={isLoading}
            compact
          >
            OFF
          </Button>
        </View>
      );
    }
    
    return (
      <View style={styles.buttonContainer}>
        <Button
          mode={isOn ? "contained" : "outlined"}
          onPress={() => handleControl('ON')}
          style={[
            styles.button, 
            isOn ? styles.onButtonActive : styles.onButton
          ]}
          icon="power"
          disabled={isLoading}
          loading={isLoading && device.currentState?.value !== 'ON'}
        >
          {device.uiOptions?.onLabel || 'ON'}
        </Button>
        <Button
          mode={!isOn ? "contained" : "outlined"}
          onPress={() => handleControl('OFF')}
          style={[
            styles.button, 
            !isOn ? styles.offButtonActive : styles.offButton
          ]}
          icon="power-off"
          disabled={isLoading}
          loading={isLoading && device.currentState?.value === 'ON'}
        >
          {device.uiOptions?.offLabel || 'OFF'}
        </Button>
      </View>
    );
  };

  const renderSwitchWidget = () => {
    const isOn = device.currentState?.value === 'ON' || 
                 device.currentState?.value === true ||
                 device.currentState?.value === 1;
    
    if (isCompact) {
      return (
        <View style={styles.compactSwitchContainer}>
          <Button
            mode={isOn ? "contained" : "outlined"}
            onPress={() => handleControl(true)}
            style={[
              styles.compactButton, 
              styles.compactOnButton,
              { 
                backgroundColor: isOn ? '#8BC34A' : 'rgba(139, 195, 74, 0.2)',
                borderColor: isOn ? '#8BC34A' : 'rgba(139, 195, 74, 0.5)'
              }
            ]}
            labelStyle={[
              styles.compactButtonLabel,
              { color: '#FFFFFF' }
            ]}
            compact
          >
            ON
          </Button>
          <Button
            mode={!isOn ? "contained" : "outlined"}
            onPress={() => handleControl(false)}
            style={[
              styles.compactButton, 
              styles.compactOffButton,
              { 
                backgroundColor: !isOn ? '#FF6B6B' : 'rgba(255, 107, 107, 0.2)',
                borderColor: !isOn ? '#FF6B6B' : 'rgba(255, 107, 107, 0.5)'
              }
            ]}
            labelStyle={[
              styles.compactButtonLabel,
              { color: '#FFFFFF' }
            ]}
            compact
          >
            OFF
          </Button>
        </View>
      );
    }
    
    return (
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          {isOn ? (device.uiOptions?.onLabel || 'ON') : (device.uiOptions?.offLabel || 'OFF')}
        </Text>
        <View style={styles.switchControls}>
          <Switch
            value={isOn}
            onValueChange={(value) => handleControl(value ? 'ON' : 'OFF')}
            disabled={isLoading}
          />
          {isLoading && (
            <ActivityIndicator size="small" style={styles.switchLoader} />
          )}
        </View>
      </View>
    );
  };

  const renderSliderWidget = () => {
    const min = device.uiOptions?.min || 0;
    const max = device.uiOptions?.max || 100;
    const step = device.uiOptions?.step || 1;
    const currentValue = Number(device.currentState?.value) || Number(localValue) || 0;

    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>Value: {currentValue}</Text>
          <Text style={styles.sliderRange}>{min} - {max}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={currentValue}
          onValueChange={setLocalValue}
          onSlidingComplete={(value) => handleControl('SET', value)}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor="#E0E0E0"
          disabled={isLoading}
        />
      </View>
    );
  };

  const renderColorPickerWidget = () => (
    <View style={styles.colorContainer}>
      <Button
        mode="contained"
        onPress={() => setShowColorPicker(true)}
        style={[styles.colorButton, { backgroundColor: device.currentState?.value || '#ff0000' }]}
        icon="palette"
        disabled={isLoading}
      >
        Select Color
      </Button>
      
      <Portal>
        <Dialog visible={showColorPicker} onDismiss={() => setShowColorPicker(false)}>
          <Dialog.Title>Choose Color</Dialog.Title>
          <Dialog.Content>
            <ColorPicker
              color={selectedColor}
              onColorChange={(color) => setSelectedColor(color)}
              style={styles.colorPicker}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowColorPicker(false)}>Cancel</Button>
            <Button onPress={() => {
              handleControl('COLOR', selectedColor);
              setShowColorPicker(false);
            }}>
              Apply
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );

  const renderTextInputWidget = () => (
    <View style={styles.textInputContainer}>
      <Button
        mode="outlined"
        onPress={() => setShowTextInput(true)}
        icon="keyboard"
        style={styles.textInputButton}
        disabled={isLoading}
      >
        Send Command
      </Button>
      
      <Portal>
        <Dialog visible={showTextInput} onDismiss={() => setShowTextInput(false)}>
          <Dialog.Title>Send Custom Command</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Command"
              value={textInputValue}
              onChangeText={setTextInputValue}
              placeholder="Enter command..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTextInput(false)}>Cancel</Button>
            <Button onPress={() => {
              if (textInputValue.trim()) {
                handleControl('CUSTOM', textInputValue.trim());
                setTextInputValue('');
                setShowTextInput(false);
              }
            }}>
              Send
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );

  const renderMultiStateWidget = () => {
    const states = device.uiOptions?.states || [];
    const currentValue = device.currentState?.value;

    return (
      <View style={styles.multiStateContainer}>
        {states.map((state, index) => {
          const isActive = state.value === currentValue;
          return (
            <Chip
              key={index}
              mode={isActive ? 'flat' : 'outlined'}
              onPress={() => handleControl('SET', state.value)}
              style={[
                styles.stateChip,
                isActive && { backgroundColor: state.color || COLORS.primary }
              ]}
              textStyle={[
                styles.stateChipText,
                isActive && { color: '#FFF' }
              ]}
              disabled={isLoading}
            >
              {state.label}
            </Chip>
          );
        })}
      </View>
    );
  };

  const renderSensorWidget = () => {
    const value = device.currentState?.value;
    const unit = device.uiOptions?.unit || '';
    
    return (
      <View style={styles.sensorContainer}>
        <Text style={styles.sensorValue}>
          {value !== undefined ? `${value}${unit}` : '--'}
        </Text>
        <Text style={styles.sensorLabel}>Current Reading</Text>
      </View>
    );
  };

  const renderGaugeWidget = () => {
    const value = Number(device.currentState?.value) || 0;
    const min = device.uiOptions?.min || 0;
    const max = device.uiOptions?.max || 100;
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeCircle}>
          <View style={[
            styles.gaugeProgress,
            { 
              transform: [{ rotate: `${(percentage * 3.6) - 90}deg` }]
            }
          ]} />
          <View style={styles.gaugeCenter}>
            <Text style={styles.gaugeValue}>{value}</Text>
            <Text style={styles.gaugeUnit}>{device.uiOptions?.unit || ''}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWidget = () => {
    switch (device.widgetType) {
      case 'button':
        return renderButtonWidget();
      case 'switch':
        return renderSwitchWidget();
      case 'slider':
        return renderSliderWidget();
      case 'colorPicker':
        return renderColorPickerWidget();
      case 'textInput':
        return renderTextInputWidget();
      case 'multiState':
        return renderMultiStateWidget();
      case 'sensor':
        return renderSensorWidget();
      case 'gauge':
        return renderGaugeWidget();
      default:
        return (
          <Text style={styles.unsupportedText}>
            Unsupported widget type: {device.widgetType}
          </Text>
        );
    }
  };

  const formatLastUpdated = () => {
    if (!device.currentState?.lastUpdated) return 'Never';
    return new Date(device.currentState.lastUpdated).toLocaleString();
  };

  // For compact mode, return only the widget controls without any card wrapper
  if (isCompact) {
    return renderWidget();
  }

  return renderWidget();
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1B1F',
  },
  deviceDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 20,
  },
  
  // Button widget
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
  },
  onButton: {
    backgroundColor: COLORS.success,
  },
  onButtonActive: {
    backgroundColor: COLORS.primary,
  },
  offButton: {
    borderColor: COLORS.error,
  },
  offButtonActive: {
    backgroundColor: COLORS.error,
  },
  
  // Switch widget
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  switchControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLoader: {
    marginLeft: 8,
  },
  
  // Slider widget
  sliderContainer: {
    paddingVertical: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sliderRange: {
    fontSize: 12,
    color: '#666',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  
  // Color picker widget
  colorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  colorButton: {
    width: '100%',
  },
  colorPicker: {
    height: 200,
    width: '100%',
  },
  
  // Text input widget
  textInputContainer: {
    paddingVertical: 8,
  },
  textInputButton: {
    width: '100%',
  },
  
  // Multi-state widget
  multiStateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  stateChip: {
    marginRight: 0,
  },
  stateChipText: {
    fontSize: 12,
  },
  
  // Sensor widget
  sensorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  sensorLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // Gauge widget
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  gaugeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#E0E0E0',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeProgress: {
    position: 'absolute',
    width: 2,
    height: 35,
    backgroundColor: COLORS.primary,
    top: 4,
    left: 39,
    transformOrigin: '1px 35px',
  },
  gaugeCenter: {
    alignItems: 'center',
  },
  gaugeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  gaugeUnit: {
    fontSize: 10,
    color: '#666',
  },
  
  // Loading and status
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  unsupportedText: {
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Compact mode styles for device cards
  compactButtonContainer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  compactSwitchContainer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  compactButton: {
    flex: 1,
    borderRadius: 8,
    minHeight: 32,
    paddingHorizontal: 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
  },
  compactOnButton: {
    marginRight: 3,
  },
  compactOffButton: {
    marginLeft: 3,
  },
  compactButtonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 14,
  },
});

export default DeviceWidget;
