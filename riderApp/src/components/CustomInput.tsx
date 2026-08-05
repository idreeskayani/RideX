// src/components/CustomInput.tsx
import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, Text } from 'react-native';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

const CustomInput = ({ label, error, style, ...props }: Props) => {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#888"
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default CustomInput;

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  error: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
});