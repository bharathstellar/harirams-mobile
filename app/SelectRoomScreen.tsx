import { API_CONFIG } from '@/utils/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import LoadingButton from '../components/LoadingButton';
import PageHeader from '../components/PageHeader';
import { setCheckInDate, setCheckOutDate, setSelectedRoomIds, setSelectedRooms } from '../store/slices/bookingSlice';

type RoomStatus = 'Available' | 'Booked' | string;

type RoomItem = {
  id: string;
  name: string;
  status: RoomStatus;
};

const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const calculateNights = (start: Date, end: Date) => {
  const normalizedStart = normalizeDate(start);
  const normalizedEnd = normalizeDate(end);
  const diff = normalizedEnd.getTime() - normalizedStart.getTime();
  if (diff <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return normalizeDate(next);
};

const formatDisplayDate = (date: Date | null) => {
  if (!date) return 'Select date';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const SelectRoomScreen = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lockedStatus, setLockedStatus] = useState<RoomStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isManager, setIsManager] = useState<boolean>(false);
  const [nextLoading, setNextLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState<Date | null>(null);
  const [tempCheckOut, setTempCheckOut] = useState<Date | null>(null);
  const [tempNights, setTempNights] = useState<number | null>(null);
  const [activeDateField, setActiveDateField] = useState<'checkin' | 'checkout'>('checkin');

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };


  const handleConfirmDates = useCallback(() => {
    if (!tempCheckIn || !tempCheckOut) return;
    const normalizedCheckIn = normalizeDate(tempCheckIn);
    const normalizedCheckOut = normalizeDate(tempCheckOut);
    setCheckIn(normalizedCheckIn);
    setCheckOut(normalizedCheckOut);
    dispatch(setCheckInDate(formatDate(normalizedCheckIn)));
    dispatch(setCheckOutDate(formatDate(normalizedCheckOut)));
    setDateModalVisible(false);
  }, [dispatch, tempCheckIn, tempCheckOut]);

  const handleCloseModal = useCallback(() => {
    setDateModalVisible(false);
    setTempCheckIn(null);
    setTempCheckOut(null);
    setTempNights(null);
    setActiveDateField('checkin');
  }, []);

  const effectiveToday = useMemo(() => normalizeDate(new Date()), []);
  const effectiveTempCheckIn = useMemo(() => {
    if (tempCheckIn) return normalizeDate(tempCheckIn);
    if (checkIn) return normalizeDate(checkIn);
    return effectiveToday;
  }, [checkIn, tempCheckIn, effectiveToday]);
  const effectiveTempCheckOut = useMemo(() => {
    if (tempCheckOut && tempCheckOut > effectiveTempCheckIn) return normalizeDate(tempCheckOut);
    if (checkOut && checkOut > effectiveTempCheckIn) return normalizeDate(checkOut);
    return addDays(effectiveTempCheckIn, 1);
  }, [checkOut, effectiveTempCheckIn, tempCheckOut]);

const openAndroidCheckoutPicker = useCallback(
  (baseCheckIn: Date) => {
    const minCheckout = addDays(baseCheckIn, 1);
    DateTimePickerAndroid.open({
      value: effectiveTempCheckOut > baseCheckIn ? effectiveTempCheckOut : minCheckout,
      mode: 'date',
      minimumDate: minCheckout,
      onChange: (event, selectedDate) => {
        if (event.type !== 'set' || !selectedDate) return;
        const normalized = normalizeDate(selectedDate);
        const safeCheckout = normalized <= baseCheckIn ? addDays(baseCheckIn, 1) : normalized;
        setTempCheckOut(safeCheckout);
        setTempNights(calculateNights(baseCheckIn, safeCheckout));
      },
    });
  },
  [effectiveTempCheckOut]
);

  const handleInlineDateChange = useCallback(
    (_event: DateTimePickerEvent, selectedDate?: Date) => {
      if (!selectedDate) return;
      const normalized = normalizeDate(selectedDate);
      if (activeDateField === 'checkin') {
        const safeCheckIn = normalized < effectiveToday ? effectiveToday : normalized;
        const prospectiveCheckout =
          (tempCheckOut && tempCheckOut > safeCheckIn) ? normalizeDate(tempCheckOut) : addDays(safeCheckIn, 1);
        setTempCheckIn(safeCheckIn);
        setTempCheckOut(prospectiveCheckout);
        setTempNights(calculateNights(safeCheckIn, prospectiveCheckout));
        // Automatically switch to checkout date picker
        setActiveDateField('checkout');
        // For iOS, the inline picker will automatically show checkout since activeDateField changed
        // For Android, trigger checkout picker
        if (Platform.OS === 'android') {
          setTimeout(() => {
            openAndroidCheckoutPicker(safeCheckIn);
          }, 300);
        }
      } else {
        const baseCheckIn = tempCheckIn ? normalizeDate(tempCheckIn) : effectiveTempCheckIn;
        const safeCheckout = normalized <= baseCheckIn ? addDays(baseCheckIn, 1) : normalized;
        setTempCheckOut(safeCheckout);
        setTempNights(calculateNights(baseCheckIn, safeCheckout));
      }
    },
    [activeDateField, effectiveTempCheckIn, effectiveToday, tempCheckIn, tempCheckOut, openAndroidCheckoutPicker]
  );

const handleAndroidPicker = useCallback(
  (field: 'checkin' | 'checkout') => {
    const today = effectiveToday;
    if (field === 'checkin') {
      DateTimePickerAndroid.open({
        value: effectiveTempCheckIn,
        mode: 'date',
        minimumDate: today,
        onChange: (event, selectedDate) => {
          if (event.type !== 'set' || !selectedDate) return;
          const normalized = normalizeDate(selectedDate);
          const safeCheckIn = normalized < today ? today : normalized;
          const prospectiveCheckout =
            (tempCheckOut && tempCheckOut > safeCheckIn) ? normalizeDate(tempCheckOut) : addDays(safeCheckIn, 1);
          setTempCheckIn(safeCheckIn);
          setTempCheckOut(prospectiveCheckout);
          setTempNights(calculateNights(safeCheckIn, prospectiveCheckout));
          setActiveDateField('checkout');
          setTimeout(() => {
            openAndroidCheckoutPicker(safeCheckIn);
          }, 250);
        },
      });
    } else {
      const baseCheckIn = tempCheckIn ? normalizeDate(tempCheckIn) : effectiveTempCheckIn;
      openAndroidCheckoutPicker(baseCheckIn);
    }
  },
  [effectiveTempCheckIn, effectiveToday, openAndroidCheckoutPicker, tempCheckIn, tempCheckOut]
);

  const handleOpenDateModal = useCallback(() => {
    setTempCheckIn(checkIn);
    setTempCheckOut(checkOut);
    setTempNights(checkIn && checkOut ? calculateNights(checkIn, checkOut) : null);
    setActiveDateField('checkin');
    setDateModalVisible(true);
    if (Platform.OS === 'android') {
      setTimeout(() => {
        handleAndroidPicker('checkin');
      }, 200);
    }
  }, [checkIn, checkOut, handleAndroidPicker]);

  const selectedNights = useMemo(
    () => (checkIn && checkOut ? calculateNights(checkIn, checkOut) : 0),
    [checkIn, checkOut]
  );

  const fetchRooms = async (checkInParam?: string, checkOutParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (checkInParam) params.append('checkInDate', checkInParam);
      if (checkOutParam) params.append('checkOutDate', checkOutParam);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AvilableRooms}${qs}`);
      const raw = await response.json();

      const arrayish: any[] = Array.isArray(raw)
        ? raw
        : (raw?.data || raw?.rooms || raw?.result || raw?.items || raw?.Records || []);

      const mapped: RoomItem[] = arrayish.map((r, idx) => ({
        id: String(r?.id ?? r?.RoomId ?? r?.RoomID ?? idx + 1),
        name: String(
          r?.RoomNumber ??
          r?.RoomName ??
          r?.Name ??
          r?.roomName ??
          r?.room_no ??
          r?.RoomNo ??
          `HR${101 + idx}`
        ),
        status: (r?.StatusOnDate ?? r?.Status ?? r?.status ?? r?.State ?? 'Available') as RoomStatus,
      }));

      if (mapped.length === 0) {
        throw new Error('Empty rooms list');
      }

      setRooms(mapped);
    } catch (e) {
      setError('Failed to load rooms from server');
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          const roleRaw = String((parsed?.role || parsed?.Role || parsed?.UserRole) || '').toLowerCase();
          const admin = roleRaw === 'admin' || parsed?.isAdmin === true;
          const manager = roleRaw === 'manager';
          setIsAdmin(!!admin);
          setIsManager(!!manager);
        } else {
          setIsAdmin(false);
          setIsManager(false);
        }
      } catch {
        setIsAdmin(false);
        setIsManager(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (checkIn && checkOut) {
      const ci = formatDate(checkIn);
      const co = formatDate(checkOut);
      fetchRooms(ci, co);
    }
  }, [checkIn, checkOut]);

  useEffect(() => {
    // default check-in to today on mount
    const today = new Date();
    const min = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const defaultCheckout = new Date(min);
    defaultCheckout.setDate(defaultCheckout.getDate() + 1);
    setCheckIn(min);
    setCheckOut(defaultCheckout);
    dispatch(setCheckInDate(formatDate(min)));
    dispatch(setCheckOutDate(formatDate(defaultCheckout)));
  }, []);

  // Handle Android back button - navigate back properly
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.back();
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  const isAvailable = useCallback((status: RoomStatus) => {
    return String(status).toLowerCase() === 'available';
  }, []);

  const toggleSelect = useCallback((room: RoomItem) => {
    if (!isAvailable(room.status)) {
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      const desiredLock = lockedStatus ?? room.status;
      if (lockedStatus && lockedStatus !== room.status) return next;
      if (next.has(room.id)) next.delete(room.id);
      else next.add(room.id);
      if (next.size === 0) setLockedStatus(null);
      else setLockedStatus(desiredLock);
      return next;
    });
  }, [lockedStatus]);

  const renderRoomItem = ({ item }: { item: RoomItem }) => {
    const available = isAvailable(item.status);
    const roomNameColor = available ? '#2E7D32' : '#C62828';
    const cardBg = available ? '#E8F5E9' : '#FFEBEE';
    const selected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.roomContainer,
          { backgroundColor: cardBg, borderColor: selected && available ? '#4CAF50' : 'transparent' },
        ]}
        onPress={available ? () => toggleSelect(item) : undefined}
        activeOpacity={available ? 0.8 : 1}
      >
        {available ? (
          <View
            style={[
              styles.checkbox,
              selected && styles.checkboxSelected,
            ]}
          >
            {selected ? <Text style={[styles.checkboxTick, { color: '#2e7d32' }]}>✓</Text> : null}
          </View>
        ) : null}
        <MaterialCommunityIcons
          name={available ? 'bed-king-outline' : 'bed-empty'}
          size={48}
          color={available ? '#2E7D32' : '#C62828'}
          style={{ marginBottom: 5 }}
        />
        <Text style={[styles.roomName, { color: roomNameColor }]}>
          {item.name}
        </Text>
        <Text style={[styles.roomStatus, { color: roomNameColor }]}>{available ? 'Available' : 'Booked'}</Text>
      </TouchableOpacity>
    );
  };

  const handleNext = async () => {
    const hasSelectedRooms = selectedIds.size > 0;
    if (!hasSelectedRooms) {
      Toast.show({ type: 'error', text1: 'Please select at least one room' });
      return;
    }
    const selectedRoomsData = rooms.filter(r => selectedIds.has(r.id));
    const selectedRoomNames = selectedRoomsData.map(r => r.name);
    const selectedRoomIds = selectedRoomsData.map(r => r.id);
    dispatch(setSelectedRooms(selectedRoomNames));
    dispatch(setSelectedRoomIds(selectedRoomIds));

    setNextLoading(true);
    try {
      router.push('/phonenumber');
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to proceed. Please try again.' });
    } finally {
      setNextLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <PageHeader
        title="Room Selection"
        showBack={true}
        onBackPress={() => router.back()}
      />

      <View style={styles.content}>
        <View style={styles.logoAndTitleContainer}>
          <View style={styles.topInfoRow}>
            <Image
              source={require('../assets/harirams_logo.png')}
              style={styles.logo}
            />
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>Room Details</Text>
            <TouchableOpacity style={styles.checkInButtonSide} onPress={handleOpenDateModal}>
              <MaterialCommunityIcons name="calendar-month" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.checkInButtonText}>Select Date</Text>
            </TouchableOpacity>
          </View>

          {checkIn && checkOut && (
            <View style={styles.selectionSummary}>
              <MaterialCommunityIcons name="calendar-range" size={22} color="#2E7D32" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.selectionSummaryText}>{formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)}</Text>
                <Text style={styles.selectionSummarySub}>
                  {selectedNights} {selectedNights === 1 ? 'day' : 'days'} stay
                </Text>
              </View>
            </View>
          )}

          {/* Legend Row with Refresh Button */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FFEBEE', borderColor: '#C62828' }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                setRefreshing(true);
                fetchRooms(
                  checkIn ? formatDate(checkIn) : undefined,
                  checkOut ? formatDate(checkOut) : undefined
                );
              }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <>
                  <MaterialCommunityIcons name="refresh" size={20} color="#4CAF50" />
                  <Text style={styles.refreshText}>Refresh</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!checkIn || !checkOut ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Please choose check-in and check-out dates</Text>
          </View>
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#43A047" />
            <Text style={{ marginTop: 10, color: "#666" }}>Loading Rooms...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : rooms.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No rooms available for the selected date</Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={rooms}
            renderItem={renderRoomItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={[styles.roomList, { paddingBottom: insets.bottom + 100 }]}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}

        <View style={[styles.bottomBar, { paddingBottom: Math.max(10, insets.bottom) }]}>
          <LoadingButton
            title="Next"
            onPress={handleNext}
            loading={nextLoading}
            loadingText="Processing..."
            style={styles.nextButton}
            textStyle={styles.nextButtonText}
          />
        </View>

        <Modal visible={dateModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Stay Dates</Text>
              <Text style={styles.modalHint}>Choose your check-in and check-out dates.</Text>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Check-In</Text>
                <Text style={styles.modalSummaryValue}>{tempCheckIn ? formatDisplayDate(tempCheckIn) : '--'}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Check-Out</Text>
                <Text style={styles.modalSummaryValue}>{tempCheckOut ? formatDisplayDate(tempCheckOut) : '--'}</Text>
              </View>
              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalSummaryLabel}>Days</Text>
                <Text style={styles.modalSummaryValue}>{tempNights ?? '--'}</Text>
              </View>
              <View style={styles.modalToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.modalToggleBtn,
                    activeDateField === 'checkin' && styles.modalToggleBtnActive,
                  ]}
                  onPress={() => setActiveDateField('checkin')}
                >
                  <Text
                    style={[
                      styles.modalToggleText,
                      activeDateField === 'checkin' && styles.modalToggleTextActive,
                    ]}
                  >
                    Check-In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalToggleBtn,
                    activeDateField === 'checkout' && styles.modalToggleBtnActive,
                  ]}
                  onPress={() => setActiveDateField('checkout')}
                >
                  <Text
                    style={[
                      styles.modalToggleText,
                      activeDateField === 'checkout' && styles.modalToggleTextActive,
                    ]}
                  >
                    Check-Out
                  </Text>
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' ? (
                <View style={styles.modalPickerContainer}>
                  <DateTimePicker
                    value={activeDateField === 'checkin' ? effectiveTempCheckIn : effectiveTempCheckOut}
                    mode="date"
                    display="inline"
                    minimumDate={
                      activeDateField === 'checkin'
                        ? effectiveToday
                        : addDays(effectiveTempCheckIn, 1)
                    }
                    onChange={handleInlineDateChange}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.androidPickerTrigger}
                  activeOpacity={0.8}
                  onPress={() => handleAndroidPicker(activeDateField)}
                >
                  <MaterialCommunityIcons name="calendar-month" size={24} color="#FFFFFF" style={{ marginRight: 12 }} />
                  <View>
                    <Text style={styles.androidPickerTitle}>
                      {activeDateField === 'checkin' ? 'Select Check-In Date' : 'Select Check-Out Date'}
                    </Text>
                    <Text style={styles.androidPickerSubtitle}>
                      {activeDateField === 'checkin'
                        ? formatDisplayDate(tempCheckIn || effectiveTempCheckIn)
                        : formatDisplayDate(tempCheckOut || effectiveTempCheckOut)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalConfirm,
                    (!tempCheckIn || !tempCheckOut) && styles.modalButtonDisabled,
                  ]}
                  onPress={handleConfirmDates}
                  disabled={!tempCheckIn || !tempCheckOut}
                >
                  <Text style={[styles.modalButtonText, styles.modalConfirmText]}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 0 },
  content: { paddingHorizontal: 10, flex: 1 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 16, backgroundColor: 'transparent', alignItems: 'center' },
  logoAndTitleContainer: { width: '100%', marginBottom: 24 },
  topInfoRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 120, height: 120, resizeMode: 'contain' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, width: '100%' },
  title: { fontSize: 20, fontWeight: 'bold', flex: 1 },
  checkInButtonSide: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 12, 
    backgroundColor: '#4CAF50', 
    borderWidth: 1, 
    borderColor: '#2E7D32', 
    shadowColor: '#4CAF50', 
    shadowOpacity: 0.25, 
    shadowRadius: 6, 
    shadowOffset: { width: 0, height: 2 }, 
    elevation: 4 
  },
  checkInButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  selectionSummary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7', marginTop: 16 },
  selectionSummaryText: { fontSize: 15, fontWeight: '700', color: '#2E7D32' },
  selectionSummarySub: { fontSize: 13, fontWeight: '600', color: '#388E3C', marginTop: 2 },
  roomList: { justifyContent: 'center', alignItems: 'center' },
  list: { width: '100%' },
  columnWrapper: { justifyContent: 'space-evenly' },
  roomContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    width: '40%',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  checkbox: { position: 'absolute', top: -2, left: -2, width: 22, height: 22, borderWidth: 2, borderColor: '#888', backgroundColor: '#fff', borderRadius: 4, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkboxSelected: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  checkboxTick: { fontSize: 14, fontWeight: 'bold', lineHeight: 14 },
  roomName: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  roomStatus: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, marginRight: 6 },
  legendText: { fontSize: 13, color: '#333', fontWeight: '600' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E0F2F1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  refreshText: { marginLeft: 4, fontSize: 14, color: '#4CAF50', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalHint: { fontSize: 14, color: '#546E7A', marginTop: 6 },
  modalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  modalSummaryLabel: { fontSize: 14, color: '#607D8B', fontWeight: '600' },
  modalSummaryValue: { fontSize: 14, color: '#263238', fontWeight: '700' },
  modalToggleRow: { flexDirection: 'row', backgroundColor: '#ECEFF1', borderRadius: 12, padding: 4, marginTop: 18 },
  modalToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  modalToggleBtnActive: { backgroundColor: '#4CAF50' },
  modalToggleText: { fontSize: 15, fontWeight: '700', color: '#455A64' },
  modalToggleTextActive: { color: '#FFFFFF' },
  modalPickerContainer: { marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: '#CFD8DC', overflow: 'hidden' },
  androidPickerTrigger: { marginTop: 16, borderRadius: 12, backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  androidPickerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  androidPickerSubtitle: { fontSize: 14, fontWeight: '600', color: '#E8F5E9', marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, marginLeft: 12 },
  modalButtonText: { fontSize: 15, fontWeight: '600', color: '#37474F' },
  modalCancel: { borderColor: '#CFD8DC', backgroundColor: '#ECEFF1' },
  modalConfirm: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  modalConfirmText: { color: '#1B5E20' },
  modalButtonDisabled: { opacity: 0.5 },
  nextButton: { backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorContainer: { alignItems: 'center', padding: 20, marginTop: 40 },
  errorText: { fontSize: 16, color: '#d32f2f', fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  errorSubText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SelectRoomScreen;
