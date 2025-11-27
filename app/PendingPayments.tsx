import LoadingButton from '@/components/LoadingButton';
import PageHeader from '@/components/PageHeader';
import { getCheckoutBookings } from '@/utils/api';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CheckoutBooking = {
  _id: string;
  BookingId: string;
  rooms: Array<{
    room_id: string;
    room_number: string;
  }>;
  checkin_date: string;
  checkout_date: string;
  actual_checkin_time: string;
  checkin_by: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  total_amount: number;
  advance_amount: number;
  pending_amount: number;
  advance_payment_mode: string;
  status: string;
  guest_name?: string;
  guest_mobile?: string;
  createdAt: string;
  updatedAt: string;
};

type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalBookings: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export default function PendingPayments() {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<CheckoutBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(
    async (pageNum: number = 1, searchTerm?: string, silent = false) => {
      if (!silent) setLoading(true);
      try {
        setError(null);
        const data = await getCheckoutBookings(pageNum, 10, searchTerm || undefined);
        setBookings((data.bookings ?? []) as CheckoutBooking[]);
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.currentPage,
            totalPages: data.pagination.totalPages,
            totalBookings: data.pagination.totalBookings,
            limit: data.pagination.limit,
            hasNextPage: data.pagination.hasNextPage,
            hasPrevPage: data.pagination.hasPrevPage,
          });
        } else {
          setPagination(null);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load checkout bookings');
        setBookings([]);
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchBookings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    if (search === '') return; // Don't fetch on empty search, initial load handles it
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchBookings(1, search);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search, fetchBookings]);

  // Fetch bookings when page changes (but not on initial mount)
  useEffect(() => {
    if (page === 1) return; // Skip if page is 1 (handled by initial load or search)
    fetchBookings(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(page, search, true);
  };

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.back();
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  // Helper function to categorize check-out date
  const getCheckoutCategory = (checkoutDate: string | null | undefined): string => {
    if (!checkoutDate) return 'others';
    try {
      const date = new Date(checkoutDate);
      if (isNaN(date.getTime())) return 'others';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const checkOut = new Date(date);
      checkOut.setHours(0, 0, 0, 0);
      
      if (checkOut.getTime() === today.getTime()) {
        return 'today';
      } else if (checkOut.getTime() === tomorrow.getTime()) {
        return 'tomorrow';
      } else {
        return 'others';
      }
    } catch {
      return 'others';
    }
  };

  // Group bookings by check-out category
  const groupedBookings = useMemo(() => {
    const groups: { category: string; bookings: CheckoutBooking[] }[] = [
      { category: 'today', bookings: [] },
      { category: 'tomorrow', bookings: [] },
      { category: 'others', bookings: [] },
    ];

    bookings.forEach((booking) => {
      const category = getCheckoutCategory(booking.checkout_date);
      const group = groups.find((g) => g.category === category);
      if (group) {
        group.bookings.push(booking);
      }
    });

    // Return only groups that have bookings
    return groups.filter((g) => g.bookings.length > 0);
  }, [bookings]);

  // Flatten grouped bookings into a list with headers and stable S.No
  const flatListData = useMemo(() => {
    let bookingIndex = 0;
    const startSno = pagination ? (pagination.currentPage - 1) * pagination.limit : 0;

    return groupedBookings.flatMap((group) => [
      { type: 'header', category: group.category } as any,
      ...group.bookings.map((booking) => {
        bookingIndex += 1;
        return { type: 'booking', ...booking, sno: startSno + bookingIndex };
      }),
    ]);
  }, [groupedBookings, pagination]);

  const renderBookingItem = ({ item }: { item: any }) => {
    const sno = item.sno;

    // Helper function to safely get room numbers
    const getRoomNumbers = (): string => {
      try {
        if (Array.isArray(item.rooms) && item.rooms.length > 0) {
          const roomNumbers: string[] = [];
          for (const r of item.rooms) {
            if (r && typeof r === 'object' && 'room_number' in r && r.room_number != null) {
              const num = String(r.room_number).trim();
              if (num) roomNumbers.push(num);
            }
          }
          return roomNumbers.length > 0 ? roomNumbers.join(', ') : '-';
        }
        // Fallback for old format (single room object)
        if (item.rooms && typeof item.rooms === 'object' && 'room_number' in item.rooms) {
          const num = (item.rooms as any).room_number;
          return num != null ? String(num) : '-';
        }
        return '-';
      } catch {
        return '-';
      }
    };
    const CapitalizeFirst = (str:any) => {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          router.push(`/CheckoutSummary?bookingId=${encodeURIComponent(String(item.BookingId || ''))}`);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.snoText}>#{String(sno)}</Text>
          <Text style={[styles.statusBadge, styles.statusCheckedIn]}>
            {String(CapitalizeFirst(item.status) || 'Checked In')}
          </Text>
        </View>
        <Text style={styles.bookingIdText}>Booking ID: {String(item.BookingId || '')}</Text>
        <Text style={styles.customerName}>{String(item.customer_name || item.guest_name || 'Customer')}</Text>
        <Text style={styles.phoneText}>{String(item.customer_mobile || item.guest_mobile || '-')}</Text>
        <View style={styles.roomsContainer}>
          <Text style={styles.roomsLabel}>Room: </Text>
          <Text style={styles.roomsText}>{getRoomNumbers()}</Text>
        </View>
        <View style={styles.datesContainer}>
          <Text style={styles.dateText}>
            Check-in: {(() => {
              if (!item.checkin_date) return '-';
              const date = new Date(item.checkin_date);
              return isNaN(date.getTime()) ? '-' : String(date.toLocaleDateString());
            })()}
          </Text>
          {item.actual_checkin_time ? (
            <Text style={styles.timeText}>
              Check-in Time: {(() => {
                const date = new Date(item.actual_checkin_time);
                return isNaN(date.getTime()) ? '-' : String(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
              })()}
            </Text>
          ) : null}
          {item.checkout_date ? (
            <Text style={styles.dateText}>
              Check-out: {(() => {
                const date = new Date(item.checkout_date);
                return isNaN(date.getTime()) ? '-' : String(date.toLocaleDateString());
              })()}
            </Text>
          ) : null}
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.totalAmount}>
            Total: ₹{String(item.total_amount != null ? item.total_amount.toLocaleString() : '0')}
          </Text>
          {item.pending_amount != null && item.pending_amount > 0 && (
            <Text style={styles.pendingAmount}>
              Pending: ₹{String(item.pending_amount.toLocaleString())}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <View style={styles.topBackground} />
      <PageHeader title="Checkout" onBackPress={() => router.back()} />

      <View style={styles.content}>
        <TextInput
          placeholder="Search by phone number..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#43A047" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <LoadingButton title="Retry" onPress={() => fetchBookings(page, search)} style={{ marginTop: 12 }} />
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={flatListData}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  const categoryLabels: Record<string, string> = {
                    today: 'Today Check-out',
                    tomorrow: 'Tomorrow Check-out',
                    others: 'Others',
                  };
                  return (
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryHeaderText}>
                        {categoryLabels[item.category] || 'Others'}
                      </Text>
                    </View>
                  );
                }
                return renderBookingItem({ item });
              }}
              keyExtractor={(item, index) => {
                if (item.type === 'header') {
                  return `header-${item.category}-${index}`;
                }
                return (item as CheckoutBooking)._id || `booking-${index}`;
              }}
              contentContainerStyle={styles.listContent}
              style={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />

            {pagination && pagination.totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={!pagination.hasPrevPage}
                  style={[styles.pageButton, !pagination.hasPrevPage && styles.pageButtonDisabled]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.pageButtonText}>Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {pagination.currentPage} / {pagination.totalPages}
                </Text>
                <TouchableOpacity
                  disabled={!pagination.hasNextPage}
                  style={[styles.pageButton, !pagination.hasNextPage && styles.pageButtonDisabled]}
                  onPress={() => setPage((p) => p + 1)}
                >
                  <Text style={styles.pageButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#ffffff',
    zIndex: 0,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  list: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  bookingCard: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  snoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  statusCheckedIn: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  bookingIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roomsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  roomsLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  roomsText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '700',
  },
  datesContainer: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 2,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C62828',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  pageButtonDisabled: {
    backgroundColor: '#ccc',
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    color: '#666',
  },
  categoryHeader: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  categoryHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
