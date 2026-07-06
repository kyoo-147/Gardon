import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';

const ModernCard = ({ 
  children, 
  style, 
  elevation = 2, 
  borderRadius = 16,
  padding = 16,
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  ...props 
}) => {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      elevation,
      borderRadius,
      backgroundColor,
      padding,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    style,
  ];

  return (
    <Surface style={cardStyle} {...props}>
      {children}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
});

export default ModernCard;
