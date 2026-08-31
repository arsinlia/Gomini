import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- STORAGE & DEFAULT CONSTANTS ---
const SETTINGS_KEY = '@gomini_settings';
const HISTORY_KEY = '@gomini_chat_history';

const DEFAULT_SETTINGS = {
  apiKey: '',
  providerId: 'gemini',
  customBaseUrl: '',
  modelName: 'gemini-1.5-flash',
  systemPrompt: 'You are a helpful and intelligent AI assistant named Gomini.',
};

// --- STORAGE UTILITIES ---
const loadSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
};

const loadChatHistory = async () => {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveChatHistory = async (history) => {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving history', e);
  }
};

const clearChatHistory = async () => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Error clearing history', e);
  }
};

// --- AI SERVICE ---
const sendMessageToAI = async ({
  messages,
  apiKey,
  providerId,
  customBaseUrl,
  modelName,
  systemPrompt,
}) => {
  if (providerId === 'gemini') {
    const model = modelName || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = [];
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `[System Instructions]: ${systemPrompt}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood.' }],
      });
    }

    messages.forEach((m) => {
      contents.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      });
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'خطا در ارتباط با Gemini');
    }
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'پاسخی از سمت مدل دریافت نشد.'
    );
  } else {
    // OpenAI / Custom Base URL standard
    const url = customBaseUrl
      ? `${customBaseUrl.replace(/\/+$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    messages.forEach((m) => {
      formattedMessages.push({ role: m.role, content: m.content });
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'gpt-3.5-turbo',
        messages: formattedMessages,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'خطا در ارتباط با سرور');
    }
    return (
      data.choices?.[0]?.message?.content ||
      'پاسخی از سمت مدل دریافت نشد.'
    );
  }
};

// --- SETTINGS MODAL COMPONENT ---
function SettingsModal({ visible, onClose, settings, onSaveSettings }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [providerId, setProviderId] = useState(settings.providerId || 'gemini');
  const [customBaseUrl, setCustomBaseUrl] = useState(settings.customBaseUrl || '');
  const [modelName, setModelName] = useState(settings.modelName || '');
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt || '');

  useEffect(() => {
    setApiKey(settings.apiKey || '');
    setProviderId(settings.providerId || 'gemini');
    setCustomBaseUrl(settings.customBaseUrl || '');
    setModelName(settings.modelName || '');
    setSystemPrompt(settings.systemPrompt || '');
  }, [settings, visible]);

  const handleSave = () => {
    onSaveSettings({
      apiKey: apiKey.trim(),
      providerId,
      customBaseUrl: customBaseUrl.trim(),
      modelName: modelName.trim(),
      systemPrompt: systemPrompt.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>تنظیمات هوش مصنوعی</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.body}>
            <Text style={modalStyles.label}>ارائه‌دهنده (Provider)</Text>
            <View style={modalStyles.row}>
              <TouchableOpacity
                style={[
                  modalStyles.providerButton,
                  providerId === 'gemini' && modalStyles.activeProvider,
                ]}
                onPress={() => {
                  setProviderId('gemini');
                  if (!modelName || modelName.includes('gpt')) {
                    setModelName('gemini-1.5-flash');
                  }
                }}
              >
                <Text style={modalStyles.btnText}>Google Gemini</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.providerButton,
                  providerId === 'openai' && modalStyles.activeProvider,
                ]}
                onPress={() => {
                  setProviderId('openai');
                  if (!modelName || modelName.includes('gemini')) {
                    setModelName('gpt-4o-mini');
                  }
                }}
              >
                <Text style={modalStyles.btnText}>OpenAI / Custom</Text>
              </TouchableOpacity>
            </View>

            <Text style={modalStyles.label}>API Key</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="کلید API خود را وارد کنید..."
              placeholderTextColor="#666"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
            />

            <Text style={modalStyles.label}>نام مدل (Model Name)</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="مثال: gemini-1.5-flash یا gpt-4o-mini"
              placeholderTextColor="#666"
              value={modelName}
              onChangeText={setModelName}
            />

            {providerId === 'openai' && (
              <>
                <Text style={modalStyles.label}>Custom Base URL (اختیاری)</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="https://api.openai.com/v1"
                  placeholderTextColor="#666"
                  value={customBaseUrl}
                  onChangeText={setCustomBaseUrl}
                  autoCapitalize="none"
                />
              </>
            )}

            <Text style={modalStyles.label}>دستور پایه (System Prompt)</Text>
            <TextInput
              style={[modalStyles.input, { height: 75, textAlignVertical: 'top' }]}
              placeholder="دستورالعمل رفتار هوش مصنوعی..."
              placeholderTextColor="#666"
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              multiline
            />
          </ScrollView>

          <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave}>
            <Text style={modalStyles.saveButtonText}>ذخیره تنظیمات</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [modalVisible, setModalVisible] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    (async () => {
      const storedSettings = await loadSettings();
      setSettings(storedSettings);
      const history = await loadChatHistory();
      setMessages(history);
    })();
  }, []);

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'پاکسازی گفتگو',
      'آیا از حذف تمام تاریخچه پیام‌ها مطمئن هستید؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setMessages([]);
            await clearChatHistory();
          },
        },
      ]
    );
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    if (!settings.apiKey) {
      Alert.alert('تنظیمات ناقص', 'لطفاً ابتدا کلید API خود را در بخش تنظیمات وارد کنید.');
      setModalVisible(true);
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const replyText = await sendMessageToAI({
        messages: newMessages,
        apiKey: settings.apiKey,
        providerId: settings.providerId,
        customBaseUrl: settings.customBaseUrl,
        modelName: settings.modelName,
        systemPrompt: settings.systemPrompt,
      });

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      await saveChatHistory(finalMessages);
    } catch (error) {
      Alert.alert('خطا در دریافت پاسخ', error.message || 'خطایی رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="settings-outline" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Gomini</Text>
          <Text style={styles.modelSubtitle} numberOfLines={1}>
            {settings.modelName || settings.providerId}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearHistory}>
          <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#444" />
            <Text style={styles.emptyText}>گفتگو با هوش مصنوعی را آغاز کنید</Text>
            <Text style={styles.emptySubText}>
              ارائه‌دهنده فعال: {settings.providerId}
            </Text>
          </View>
        }
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingText}>در حال دریافت پاسخ...</Text>
        </View>
      )}

      {/* Input Field */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            placeholder="پیام خود را بنویسید..."
            placeholderTextColor="#777"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Settings Modal */}
      <SettingsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  titleContainer: {
    alignItems: 'center',
    maxWidth: '70%',
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modelSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  chatContainer: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
    marginTop: 10,
  },
  emptySubText: {
    color: '#444',
    fontSize: 12,
    marginTop: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: '82%',
  },
  userBubble: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  botBubble: {
    backgroundColor: '#222',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFF',
  },
  botText: {
    color: '#EEE',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loadingText: {
    color: '#888',
    fontSize: 12,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: '#181818',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#252525',
    color: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#2563EB',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
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
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  body: {
    marginBottom: 16,
  },
  label: {
    color: '#AAA',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  providerButton: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeProvider: {
    backgroundColor: '#2563EB',
  },
  btnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
