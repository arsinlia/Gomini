import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PROVIDERS } from '../services/aiService';

export default function SettingsModal({ visible, onClose, settings, onSaveSettings }) {
  const [providerId, setProviderId] = useState(settings?.providerId || 'OPENROUTER');
  const [apiKey, setApiKey] = useState(settings?.apiKey || '');
  const [modelName, setModelName] = useState(settings?.modelName || '');
  const [customBaseUrl, setCustomBaseUrl] = useState(settings?.customBaseUrl || '');
  const [systemPrompt, setSystemPrompt] = useState(settings?.systemPrompt || '');

  useEffect(() => {
    if (settings) {
      setProviderId(settings.providerId || 'OPENROUTER');
      setApiKey(settings.apiKey || '');
      setModelName(settings.modelName || '');
      setCustomBaseUrl(settings.customBaseUrl || '');
      setSystemPrompt(settings.systemPrompt || '');
    }
  }, [settings, visible]);

  const handleProviderChange = (id) => {
    setProviderId(id);
    setModelName(PROVIDERS[id]?.defaultModel || '');
  };

  const handleSave = () => {
    onSaveSettings({
      providerId,
      apiKey,
      modelName,
      customBaseUrl,
      systemPrompt,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>تنظیمات Gomini</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#aaa" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            <Text style={styles.sectionLabel}>انتخاب ارائه‌دهنده (Provider):</Text>
            <View style={styles.providerGrid}>
              {Object.values(PROVIDERS).map((prov) => (
                <TouchableOpacity
                  key={prov.id}
                  style={[
                    styles.providerBtn,
                    providerId === prov.id && styles.providerBtnActive,
                  ]}
                  onPress={() => handleProviderChange(prov.id)}
                >
                  <Text
                    style={[
                      styles.providerBtnText,
                      providerId === prov.id && styles.providerBtnTextActive,
                    ]}
                  >
                    {prov.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>کلید دسترسی (API Key):</Text>
            <TextInput
              style={styles.input}
              placeholder="sk-..."
              placeholderTextColor="#666"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>نام مدل (Model ID):</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: google/gemini-2.5-flash"
              placeholderTextColor="#666"
              value={modelName}
              onChangeText={setModelName}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {providerId === 'ANYROUTER' && (
              <>
                <Text style={styles.inputLabel}>نشانی دلخواه (Custom Base URL):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://api.anyrouter.top/v1/chat/completions"
                  placeholderTextColor="#666"
                  value={customBaseUrl}
                  onChangeText={setCustomBaseUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <Text style={styles.inputLabel}>دستور اولیه سیستم (System Prompt):</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="دستورات رفتاری مدل..."
              placeholderTextColor="#666"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>ذخیره تنظیمات</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollArea: {
    marginBottom: 15,
  },
  sectionLabel: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  providerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  providerBtn: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  providerBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  providerBtnText: {
    color: '#AAA',
    fontSize: 12,
  },
  providerBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#DDD',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3E3E3E',
  },
  textArea: {
    height: 75,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
