import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SectionList,
  Alert,
  Share,
  Clipboard,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import {
  Copy,
  Share2,
  RefreshCw,
  PiggyBank,
  ArrowLeft,
  Users,
  Gift,
  Sparkles,
  PlayCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

// === REWARDED AD SETUP ===
const rewardedAdUnitId = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-5133056126463450/2502215887'; // ← Replace with real ID

const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, {
  requestNonPersonalizedAdsOnly: true,
  keywords: ['earn', 'rewards', 'coins', 'watch', 'video', 'india'],
});

const COINS_PER_AD = 50;

interface InvitedUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  joinedAt: string;
}

interface Transaction {
  _id: string;
  title: string;
  amount: number;
  type: 'credit' | 'debit';
  relatedUser?: {
    _id: string;
    name: string;
  };
  date: string;
}

interface Earnings {
  balance: number;
  totalEarned: number;
  transactions: Transaction[];
}

interface SectionData {
  title: string;
  data: any[];
  type: 'referral' | 'apply' | 'watchAd' | 'earnings' | 'users';
  icon?: React.ReactNode;
}

const ReferralScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [referralCode, setReferralCode] = useState<string>('');
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [earnings, setEarnings] = useState<Earnings>({
    balance: 0,
    totalEarned: 0,
    transactions: [],
  });
  const [applyCode, setApplyCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [applyLoading, setApplyLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Rewarded Ad states
  const [adLoaded, setAdLoaded] = useState(false);
  const [isEarning, setIsEarning] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.95))[0];

  // === REWARDED AD LOGIC (Fixed event types) ===
  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => setAdLoaded(true)
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        setIsEarning(false);
        const newBalance = earnings.balance + COINS_PER_AD;

        setEarnings(prev => ({
          ...prev,
          balance: newBalance,
          totalEarned: prev.totalEarned + COINS_PER_AD,
        }));

        await AsyncStorage.setItem('pendingAdCoins', COINS_PER_AD.toString());

        Alert.alert(
          'You earned 50 coins!',
          'Your balance has been updated!',
          [{ text: 'Awesome!', onPress: () => rewarded.load() }]
        );
      }
    );

    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setAdLoaded(false);
        rewarded.load(); // Preload next ad
      }
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, [earnings.balance]);

  // Sync any pending ad coins on mount
  useEffect(() => {
    const syncPending = async () => {
      const pending = await AsyncStorage.getItem('pendingAdCoins');
      if (pending) {
        const amount = parseInt(pending, 10);
        setEarnings(prev => ({
          ...prev,
          balance: prev.balance + amount,
          totalEarned: prev.totalEarned + amount,
        }));
        await AsyncStorage.removeItem('pendingAdCoins');
      }
    };
    syncPending();
  }, []);

  const watchAdAndEarn = () => {
    if (!adLoaded) {
      Alert.alert('Ad not ready', 'Please wait a moment and try again.');
      return;
    }
    setIsEarning(true);
    rewarded.show();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();
    fetchReferralData();
  }, []);

  const fetchReferralData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [invitedRes, earningsRes] = await Promise.all([
        api.get('/referral/invited'),
        api.get('/referral/earnings'),
      ]);

      setReferralCode(user?.referralCode || '');
      setInvitedUsers(invitedRes.data.invitedUsers || []);
      setEarnings(earningsRes.data || { balance: 0, totalEarned: 0, transactions: [] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Network error. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReferralData(true);
  }, []);

  const handleRefreshCode = async () => {
    setError(null);
    try {
      const res = await api.post('/referral/generate');
      setReferralCode(res.data.referralCode);
      Alert.alert('Success', 'New referral code generated!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Try again later');
    }
  };

  const handleCopyCode = () => {
    Clipboard.setString(referralCode);
    Alert.alert('Copied!', `'${referralCode}' copied to clipboard`);
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join me & earn rewards! Use my code: *${referralCode}*\nDownload now: ${Platform.OS === "android" ? "https://play.google.com/store/apps/details?id=com.jymberee&hl=en_IN" : "https://apps.apple.com/us/app/jymberee/id6751540033"}`,
      });
    } catch { }
  };

  const handleApplyCode = async () => {
    const code = applyCode.trim().toUpperCase();
    if (!code || code.length < 4) {
      setError('Enter a valid code');
      return;
    }
    setApplyLoading(true);
    setError(null);
    try {
      await api.post('/referral/apply', { referralCode: code });
      setApplyCode('');
      Alert.alert('Success', 'Code applied! Check your earnings.');
      fetchReferralData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code');
    } finally {
      setApplyLoading(false);
    }
  };

  const sections: SectionData[] = [
    {
      title: 'Your Magic Code',
      data: [{ key: 'code' }],
      type: 'referral',
      icon: <Sparkles color="#8B5CF6" size={20} />,
    },
    {
      title: 'Redeem a Code',
      data: [{ key: 'apply' }],
      type: 'apply',
      icon: <Gift color="#EC4899" size={20} />,
    },
    {
      title: 'Earn More Coins',
      data: [{ key: 'watchAd' }],
      type: 'watchAd',
      icon: <PlayCircle color="#F59E0B" size={20} />,
    },
    {
      title: 'Earnings Dashboard',
      data: earnings.transactions.length ? earnings.transactions : [{ empty: true }],
      type: 'earnings',
      icon: <PiggyBank color="#10B981" size={20} />,
    },
    {
      title: 'Your Tribe',
      data: invitedUsers.length ? invitedUsers : [{ empty: true }],
      type: 'users',
      icon: <Users color="#3B82F6" size={20} />,
    },
  ];

  const renderItem = ({ item, section }: { item: any; section: SectionData }) => {
    if (section.type === 'watchAd') {
      return (
        <TouchableOpacity
          style={[styles.watchAdCard, (isEarning || !adLoaded) && styles.watchAdCardDisabled]}
          onPress={watchAdAndEarn}
          disabled={isEarning || !adLoaded}
        >
          <View style={styles.watchAdContent}>
            <PlayCircle size={48} color="#F59E0B" />
            <View style={styles.watchAdText}>
              <Text style={styles.watchAdTitle}>Watch Video & Earn</Text>
              <Text style={styles.watchAdSubtitle}>Get +50 coins instantly!</Text>
            </View>
          </View>
          {isEarning ? (
            <ActivityIndicator color="#F59E0B" size="small" />
          ) : (
            <Text style={styles.watchAdReward}>+50</Text>
          )}
        </TouchableOpacity>
      );
    }

    switch (section.type) {
      case 'referral':
        return (
          <Animated.View style={[styles.glassCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.codeHeader}>
              <Text style={styles.codeLabel}>Referral Code</Text>
              <Sparkles color="#8B5CF6" size={24} />
            </View>
            <Text style={styles.referralCode}>{referralCode || 'Generating...'}</Text>
            <View style={styles.actionRow}>
              <ActionButton icon={<Copy size={18} />} label="Copy" onPress={handleCopyCode} color="#8B5CF6" />
              <ActionButton icon={<Share2 size={18} />} label="Share" onPress={handleShareCode} color="#EC4899" />
              <ActionButton
                icon={refreshing ? <ActivityIndicator size={18} color="#fff" /> : <RefreshCw size={18} />}
                label="New"
                onPress={handleRefreshCode}
                color="#F59E0B"
              />
            </View>
          </Animated.View>
        );

      case 'apply':
        return (
          <Animated.View style={[styles.glassCard, styles.applyCard]}>
            <TextInput
              style={styles.codeInput}
              placeholder="ABC123"
              placeholderTextColor="#9CA3AF"
              value={applyCode}
              onChangeText={(t) => setApplyCode(t.toUpperCase())}
              maxLength={8}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[styles.applyBtn, applyLoading && styles.applyBtnLoading]}
              onPress={handleApplyCode}
              disabled={applyLoading}
            >
              {applyLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyBtnText}>Apply</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        );

      case 'earnings':
        if (item.empty) {
          return <EmptyState message="No earnings yet. Invite friends!" />;
        }
        return (
          <Animated.View style={styles.transactionCard}>
            <View style={styles.transactionRow}>
              <View>
                <Text style={styles.transactionTitle}>{item.title}</Text>
                {item.relatedUser && (
                  <Text style={styles.relatedUser}>from {item.relatedUser.name}</Text>
                )}
              </View>
              <Text style={[styles.amount, item.type === 'credit' ? styles.credit : styles.debit]}>
                {item.type === 'credit' ? '+' : '-'}{item.amount} pts
              </Text>
            </View>
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </Animated.View>
        );

      case 'users':
        if (item.empty) {
          return <EmptyState message="Your tribe is empty. Share your code!" />;
        }
        return (
          <Animated.View style={styles.userCard}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
              <Text style={styles.joinedAt}>
                Joined {new Date(item.joinedAt || item.date).toLocaleDateString()}
              </Text>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {section.icon}
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.type === 'earnings' && (
        <View style={styles.balanceCard}>
          <PiggyBank color="#10B981" size={28} />
          <View>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceAmount}>{earnings.balance.toLocaleString()} pts</Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading your referral magic...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#fff" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item._id || item.key || Math.random().toString()}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// Reusable Components
const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void; color: string }> = ({
  icon,
  label,
  onPress,
  color,
}) => (
  <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
    {icon}
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#8B5CF6',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  listContent: { padding: 16, paddingTop: 8 },
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  codeLabel: { fontSize: 14, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.2 },
  referralCode: { fontSize: 32, fontWeight: '900', color: '#4C1D95', textAlign: 'center', letterSpacing: 4, marginVertical: 12, fontVariant: ['tabular-nums'] },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, gap: 8, elevation: 4 },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  applyCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  codeInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  applyBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, marginLeft: 12 },
  applyBtnLoading: { opacity: 0.7 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  balanceLabel: { fontSize: 13, color: '#065F46', fontWeight: '600' },
  balanceAmount: { fontSize: 20, fontWeight: '900', color: '#10B981' },
  transactionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#E2E8F0', elevation: 2 },
  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  transactionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  relatedUser: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800' },
  credit: { color: '#10B981' },
  debit: { color: '#EF4444' },
  date: { fontSize: 13, color: '#94A3B8' },
  userCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#3B82F6' },
  userName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  userEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },
  joinedAt: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },
  errorBanner: { backgroundColor: '#FECACA', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FC8181' },
  errorText: { color: '#991B1B', textAlign: 'center', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#64748B', fontWeight: '500' },

  // Watch Ad Card
  watchAdCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#FED7AA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  watchAdCardDisabled: { opacity: 0.7 },
  watchAdContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  watchAdText: { marginLeft: 16 },
  watchAdTitle: { fontSize: 18, fontWeight: '700', color: '#C2410C' },
  watchAdSubtitle: { fontSize: 14, color: '#EA580C', marginTop: 4 },
  watchAdReward: { fontSize: 28, fontWeight: '900', color: '#F59E0B' },
});

export default ReferralScreen;