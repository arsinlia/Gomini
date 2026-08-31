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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  loadSettings,
  saveSettings,
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  DEFAULT_SETTINGS,
} from './src/services/storage';
import { sendMessageToAI } from './src/services/aiService';
import SettingsModal from './src/components/SettingsModal';

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
