import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import api from '../../api/axios';
import { connectSocket } from '../../services/socket';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; fullName: string; role: string };
}

export default function ChatScreen({ route, navigation }: any) {
  const { rideId, chatId: initialChatId, otherName } = route.params as {
    rideId: string;
    chatId?: string;
    otherName?: string;
  };

  const userId = useSelector((s: RootState) => s.auth.user?.id);

  const [chatId, setChatId] = useState<string | null>(initialChatId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const pendingTempId = useRef<string | null>(null);

  // Create or fetch chat, then load messages
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        let id = chatId;
        if (!id) {
          const res = await api.post('/chat', { rideId });
          id = res.data.id;
          if (mounted) setChatId(id);
        }
        const res = await api.get(`/chat/${id}/messages`);
        if (mounted) setMessages(res.data);
      } catch {}
      finally { if (mounted) setLoading(false); }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // Socket: join ride room and listen for new messages
  useEffect(() => {
    let mounted = true;
    connectSocket().then(socket => {
      if (!mounted) return;
      socket.emit('join-ride', { rideId });
      socket.on('chat-message', (msg: Message) => {
        if (!mounted) return;
        setMessages(prev => {
          // If we have a pending optimistic message, replace it with the real one
          if (pendingTempId.current) {
            const idx = prev.findIndex(m => m.id === pendingTempId.current);
            if (idx !== -1) {
              pendingTempId.current = null;
              const next = [...prev];
              next[idx] = msg;
              return next;
            }
          }
          // Otherwise only append if not already present
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        listRef.current?.scrollToEnd({ animated: true });
      });
    });
    return () => {
      mounted = false;
      connectSocket().then(s => s.off('chat-message'));
    };
  }, [rideId]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !chatId || sending) return;
    const trimmed = text.trim();
    setText('');
    setSending(true);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    pendingTempId.current = tempId;
    const optimistic: Message = {
      id: tempId,
      text: trimmed,
      senderId: userId ?? '',
      createdAt: new Date().toISOString(),
      sender: { id: userId ?? '', fullName: 'You', role: '' },
    };
    setMessages(prev => [...prev, optimistic]);
    listRef.current?.scrollToEnd({ animated: true });

    try {
      // Emit via socket for real-time delivery
      const socket = await connectSocket();
      socket.emit('chat-message', { chatId, rideId, text: trimmed });
    } catch {
      // fallback: remove optimistic on failure
      pendingTempId.current = null;
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  }, [text, chatId, rideId, userId, sending]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === userId || item.sender?.id === userId;
    const isTemp = item.id.startsWith('temp-');
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.sender.fullName?.[0] ?? '?'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {!isMe && (
            <Text style={styles.senderName}>{item.sender.fullName}</Text>
          )}
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.text}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
            {isTemp ? '•••' : new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherName ?? 'Chat'}</Text>
          <Text style={styles.headerSub}>Ride chat</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>

        {loading ? (
          <ActivityIndicator style={styles.loader} color="#2563EB" />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No messages yet. Say hello! 👋</Text>
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}>
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendIcon}>➤</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: { padding: 4, marginRight: 12 },
  backIcon: { fontSize: 22, color: '#111827' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  loader: { flex: 1, marginTop: 40 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 14 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', width: '100%' },
  msgRowMe: { justifyContent: 'flex-end', alignSelf: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start', alignSelf: 'flex-start' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E5E7EB', alignItems: 'center',
    justifyContent: 'center', marginRight: 8,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 3 },
  msgText: { fontSize: 15, color: '#111827', lineHeight: 20 },
  msgTextMe: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendIcon: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
