// AdminDashboard.tsx
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import PageHeader from "../components/PageHeader";
import { RevenueSection } from "../components/RevenueSection";
import {
    cancelBooking,
    getBookingHistory,
    getCurrentBookings,
    getDashboardOverview,
    getFutureAndCheckinBookings,
    getOccupancyDashboard,
    getPastBookings,
    getRevenueDashboard
} from "../utils/api";

type Booking = {
  _id: string;
  BookingId: string;
  RoomNumber: string[];
  BookedRoomNo: string[];
  customerPhone: string;
  customerName?: string;
  TotalAmountType: string;
  TotalAmount: number;
  PendingAmount?: number;
  paymentStatus?: string;
  CheckInDate: string;
  CheckOutDate?: string | null;
  CustomerIdProof?: string | { url?: string; path?: string };
  customerVechileIdProof?: string | { url?: string; path?: string };
  guest_proof_url?: string | null;
  customer_proof_url?: string | null;
  status?: string;
};

type OccupancyData = {
  totalRooms: number;
  bookedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  bookingPercentage: number;
};

type DashboardTotals = {
  totalBookings: number;
  totalAdvance: number;
  totalPending: number;
  totalAmount: number;
};

type DashboardResponse = {
  daily: DashboardTotals;
  weekly: DashboardTotals;
  monthly: DashboardTotals;
  overall: DashboardTotals;
  bookingPercentage: { percentage: number; bookedRooms: number; totalRooms: number };
};

type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalBookings: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type RevenueData = {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalRevenue: number;
  revenueByPaymentMode: Array<{
    mode: string;
    total: number;
  }>;
  dailyGraph: Array<{
    date: string;
    revenue: number;
  }>;
  weeklyGraph?: Array<{
    week: string;
    revenue: number;
  }>;
  monthlyGraph: Array<{
    month: string;
    revenue: number;
  }>;
};

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [bookedRooms, setBookedRooms] = useState<string[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentSearch, setCurrentSearch] = useState("");
  const [pastSearch, setPastSearch] = useState("");
  const [pastMonth, setPastMonth] = useState<string | undefined>(undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPagination, setCurrentPagination] = useState<PaginationInfo | null>(null);

  const [pastPage, setPastPage] = useState(1);
  const [pastPagination, setPastPagination] = useState<PaginationInfo | null>(null);

  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Handle Android back button - exit app on dashboard
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  // Fetch current bookings (future and check-in)
  const fetchCurrentBookings = useCallback(
    async (page = currentPage, search?: string, silent = false) => {
      if (!silent) setLoadingCurrent(true);
      try {
        const response = await getFutureAndCheckinBookings(page, 10, search);
        
        if (response.success) {
          // Combine both future and check-in bookings
          const futureBookings = (response.futureBookings || []).map((item: any) => ({
            _id: item._id,
            BookingId: item.BookingId,
            RoomNumber: item.rooms?.map((r: any) => r.room_number) || [],
            BookedRoomNo: item.rooms?.map((r: any) => r.room_number) || [],
            customerPhone: item.customer_mobile,
            customerName: item.customer_name,
            TotalAmountType: item.advance_payment_mode,
            TotalAmount: item.total_amount,
            PendingAmount: item.pending_amount,
            paymentStatus: item.pending_amount > 0 ? "Pending" : "Paid",
            CheckInDate: item.checkin_date,
            CheckOutDate: item.checkout_date,
            status: item.status,
          })) as Booking[];

          const checkinBookings = (response.checkinBookings || []).map((item: any) => ({
            _id: item._id,
            BookingId: item.BookingId,
            RoomNumber: item.rooms?.map((r: any) => r.room_number) || [],
            BookedRoomNo: item.rooms?.map((r: any) => r.room_number) || [],
            customerPhone: item.customer_mobile,
            customerName: item.customer_name,
            TotalAmountType: item.advance_payment_mode,
            TotalAmount: item.total_amount,
            PendingAmount: item.pending_amount,
            paymentStatus: item.pending_amount > 0 ? "Pending" : "Paid",
            CheckInDate: item.checkin_date,
            CheckOutDate: item.checkout_date,
            status: item.status,
          })) as Booking[];
          
          // Combine both arrays
          const allBookings = [...futureBookings, ...checkinBookings];
          setCurrent(allBookings);
          
          if (response.pagination) {
            // Calculate total bookings from both arrays
            const totalBookings = (response.pagination.totalFutureBookings || 0) + (response.pagination.totalCheckinBookings || 0);
            setCurrentPagination({
              currentPage: response.pagination.currentPage,
              totalPages: response.pagination.totalPages,
              totalBookings: totalBookings,
              limit: response.pagination.limit,
              hasNextPage: response.pagination.hasNextPage || false,
              hasPrevPage: response.pagination.hasPrevPage || false,
            } as PaginationInfo);
          } else {
            setCurrentPagination(null);
          }
        }
      } catch (e: any) {
        // Fallback to old API if new one fails
        try {
          const curJson = await getCurrentBookings(page, search || undefined);
          setCurrent((curJson.bookings ?? []) as Booking[]);
          setBookedRooms(curJson.bookedRooms ?? []);
          if (curJson.paginationInfo) {
            setCurrentPagination(curJson.paginationInfo as PaginationInfo);
          } else {
            setCurrentPagination(null);
          }
        } catch (err: any) {
          setError(err?.message ?? "Something went wrong");
        }
      } finally {
        if (!silent) setLoadingCurrent(false);
      }
    },
    [currentPage]
  );

  // Fetch past bookings using booking history API
  const fetchPastBookings = useCallback(
    async (page: number, silent = false) => {
      if (!silent) {
        setLoadingPast(true);
        setError(null); // Clear previous errors
      }
      try {
        // Format month as YYYY-MM if provided
        const monthParam = pastMonth ? pastMonth : undefined;
        const mobileParam = pastSearch || undefined;
        
        const historyJson = await getBookingHistory(page, 10, monthParam, mobileParam);
        
        if (historyJson.success && historyJson.data) {
          // Transform booking history data to match Booking type
          const transformedBookings = historyJson.data.map((item: any) => ({
            _id: item.BookingId || item._id,
            BookingId: item.BookingId,
            RoomNumber: item.roomNumbers || [],
            BookedRoomNo: item.roomNumbers || [],
            customerPhone: item.mobile,
            customerName: item.guest_name,
            TotalAmountType: item.payment_mode,
            TotalAmount: item.final_total,
            PendingAmount: item.pending_amount,
            // Use paymentStatus from API response directly
            paymentStatus: item.paymentStatus || (item.pending_amount > 0 ? "Pending" : "Paid"),
            CheckInDate: item.checkin_date,
            CheckOutDate: item.checkout_date,
            CustomerIdProof: item.customer_proof_url,
            customerVechileIdProof: item.guest_proof_url,
            customer_proof_url: item.customer_proof_url,
            guest_proof_url: item.guest_proof_url,
            status: item.status || "checked_out", // Keep status for internal use
          })) as Booking[];
          
          setPast(transformedBookings);
          
          if (historyJson.pagination) {
            setPastPagination({
              currentPage: historyJson.pagination.currentPage,
              totalPages: historyJson.pagination.totalPages,
              totalBookings: historyJson.pagination.totalItems,
              limit: historyJson.pagination.itemsPerPage,
              hasNextPage: historyJson.pagination.hasNextPage || false,
              hasPrevPage: historyJson.pagination.hasPreviousPage || false,
            } as PaginationInfo);
          }
        } else {
          // If API returns success: false, show error
          const errorMsg = historyJson.message || 'Failed to fetch booking history';
          setError(errorMsg);
          if (!silent) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: errorMsg,
            });
          }
        }
      } catch (e: any) {
        console.error('Failed to fetch booking history:', e);
        const errorMsg = e?.message || 'Failed to fetch booking history';
        setError(errorMsg);
        if (!silent) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: errorMsg,
          });
        }
        // Fallback to old API if new one fails
        try {
          const pastJson = await getPastBookings(page, pastSearch || undefined, pastMonth || undefined);
          setPast((pastJson.bookings ?? []) as Booking[]);
          if (pastJson.paginationInfo) {
            setPastPagination(pastJson.paginationInfo as PaginationInfo);
          }
          // Clear error if fallback succeeds
          setError(null);
        } catch (err: any) {
          const fallbackError = err?.message ?? "Something went wrong";
          setError(fallbackError);
          if (!silent) {
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: fallbackError,
            });
          }
        }
      } finally {
        if (!silent) setLoadingPast(false);
      }
    },
    [pastSearch, pastMonth]
  );

  // Fetch overview (optional - may not be available)
  const fetchOverview = useCallback(async () => {
    try {
      const dash = await getDashboardOverview();
      setDashboard(dash as DashboardResponse);
    } catch (e: any) {
      // Silently fail - dashboard overview is optional
      // The occupancy API is the primary source for room data
      console.log('Dashboard overview not available, using occupancy API only');
      setDashboard(null);
    }
  }, []);

  // Fetch occupancy data
  const fetchOccupancy = useCallback(async () => {
    setLoadingOccupancy(true);
    try {
      const response = await getOccupancyDashboard();
      if (response.success && response.data) {
        setOccupancyData(response.data as OccupancyData);
      }
    } catch (e: any) {
      console.error('Failed to fetch occupancy:', e);
      setOccupancyData(null);
    } finally {
      setLoadingOccupancy(false);
    }
  }, []);


  // Fetch revenue data
  const fetchRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    try {
      const response = await getRevenueDashboard();
      if (response.success && response.data) {
        setRevenueData(response.data as RevenueData);
      }
    } catch (e: any) {
      console.error('Failed to fetch revenue:', e);
      // Silently fail - revenue is optional
      setRevenueData(null);
    } finally {
      setLoadingRevenue(false);
    }
  }, []);

  // Initial load
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOverview(),
        fetchOccupancy(),
        fetchRevenue(),
        fetchCurrentBookings(currentPage, currentSearch || undefined),
        fetchPastBookings(1, true)
      ]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [currentPage, currentSearch, fetchCurrentBookings, fetchOverview, fetchOccupancy, fetchPastBookings, fetchRevenue]);

  useEffect(() => {
    fetchAll();
  }, []);

  // Debounce current search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrentBookings(1, currentSearch);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [currentSearch, fetchCurrentBookings]);

  useEffect(() => {
    fetchCurrentBookings(currentPage, currentSearch);
  }, [currentPage, fetchCurrentBookings]);

  // Debounce past search/month
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPastPage(1);
      fetchPastBookings(1);
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [pastSearch, pastMonth, fetchPastBookings]);

  useEffect(() => {
    fetchPastBookings(pastPage);
  }, [pastPage]);

  const confirmMonthSelection = (year: number, month: number) => {
    const monthStr = month.toString().padStart(2, "0");
    setPastMonth(`${year}-${monthStr}`);
    setShowMonthPicker(false);
  };

  // Download individual proof file
  const downloadProof = async (url: string | null | undefined, type: string) => {
    if (!url) {
      Alert.alert('Not Available', `${type} proof is not available for this booking.`);
      return;
    }

    try {
      const proofUrl = typeof url === 'string' ? url : (url as any)?.url || '';
      if (!proofUrl) {
        Alert.alert('Error', 'Invalid proof URL');
        return;
      }

      // Check if URL can be opened
      const canOpen = await Linking.canOpenURL(proofUrl);
      if (canOpen) {
        await Linking.openURL(proofUrl);
      } else {
        Alert.alert('Error', 'Cannot open this URL. Please check the link.');
      }
    } catch (e: any) {
      Alert.alert('Error', `Failed to open ${type} proof: ${e?.message || 'Unknown error'}`);
    }
  };

  // Cancel booking with confirmation
  const handleCancelBooking = (bookingId: string, customerName?: string) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking ${bookingId}${customerName ? ` for ${customerName}` : ''}?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingCurrent(true);
              const response = await cancelBooking(bookingId);
              if (response.success) {
                Alert.alert('Success', 'Booking cancelled successfully');
                // Refresh current bookings
                fetchCurrentBookings(currentPage, currentSearch || undefined);
              } else {
                Alert.alert('Error', response.message || 'Failed to cancel booking');
              }
            } catch (e: any) {
              Alert.alert('Error', `Failed to cancel booking: ${e?.message || 'Unknown error'}`);
            } finally {
              setLoadingCurrent(false);
            }
          },
        },
      ]
    );
  };

  const percent = Math.max(0, Math.min(100, occupancyData?.occupancyRate ?? occupancyData?.bookingPercentage ?? 0));
  const bookedCount = occupancyData?.bookedRooms ?? bookedRooms.length;
  const totalRooms = occupancyData?.totalRooms ?? Math.max(bookedCount, bookedRooms.length);
  const availableCount = occupancyData?.availableRooms ?? Math.max(0, totalRooms - bookedCount);

  // Occupancy Gauge - Modern Card Design
  const OccupancyGauge = ({ percentage, bookedCount, availableCount, totalRooms }: { percentage: number; bookedCount: number; availableCount: number; totalRooms: number }) => {
    const clamped = Math.max(0, Math.min(100, percentage || 0));
    const getOccupancyColor = (percent: number) => {
      if (percent >= 80) return "#EF4444"; // Red for high occupancy
      if (percent >= 50) return "#F59E0B"; // Orange for medium
      return "#22C55E"; // Green for low
    };
    
    return (
      <View style={[gaugeStyles.container, styles.card]}>
        <View style={gaugeStyles.header}>
          <Text style={gaugeStyles.title}>Occupancy Overview</Text>
          <View style={[gaugeStyles.percentageBadge, { backgroundColor: getOccupancyColor(clamped) + "15" }]}>
            <Text style={[gaugeStyles.percentageText, { color: getOccupancyColor(clamped) }]}>
              {clamped}%
            </Text>
          </View>
        </View>

        <View style={gaugeStyles.statsContainer}>
          <View style={gaugeStyles.statCard}>
            <View style={[gaugeStyles.statIcon, { backgroundColor: "#FEE2E2" }]}>
              <Text style={[gaugeStyles.statIconText, { color: "#DC2626" }]}>📦</Text>
            </View>
            <Text style={gaugeStyles.statValue}>{bookedCount}</Text>
            <Text style={gaugeStyles.statLabel}>Booked</Text>
          </View>

          <View style={gaugeStyles.statCard}>
            <View style={[gaugeStyles.statIcon, { backgroundColor: "#DCFCE7" }]}>
              <Text style={[gaugeStyles.statIconText, { color: "#16A34A" }]}>✓</Text>
            </View>
            <Text style={gaugeStyles.statValue}>{availableCount}</Text>
            <Text style={gaugeStyles.statLabel}>Available</Text>
          </View>

          <View style={gaugeStyles.statCard}>
            <View style={[gaugeStyles.statIcon, { backgroundColor: "#DBEAFE" }]}>
              <Text style={[gaugeStyles.statIconText, { color: "#2563EB" }]}>🏨</Text>
            </View>
            <Text style={gaugeStyles.statValue}>{totalRooms}</Text>
            <Text style={gaugeStyles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={gaugeStyles.progressContainer}>
          <View style={gaugeStyles.progressBar}>
            <View 
              style={[
                gaugeStyles.progressFill, 
                { 
                  width: `${clamped}%`,
                  backgroundColor: getOccupancyColor(clamped)
                }
              ]} 
            />
          </View>
          <View style={gaugeStyles.progressLabels}>
            <Text style={gaugeStyles.progressLabel}>0%</Text>
            <Text style={gaugeStyles.progressLabel}>50%</Text>
            <Text style={gaugeStyles.progressLabel}>100%</Text>
          </View>
        </View>
      </View>
    );
  };

  // Table row renderer
  const renderRow = ({ index, item, isPast, columnWidths }: { index: number; item: Booking; isPast?: boolean; columnWidths: Record<string, number> }) => {
    let sno = index + 1;
    const pagination = isPast ? pastPagination : currentPagination;
    if (pagination) {
      sno = (pagination.currentPage - 1) * pagination.limit + (index + 1);
    }

    const roomsSource = isPast ? item.RoomNumber : item.BookedRoomNo;
    const roomsToShow = Array.isArray(roomsSource) ? roomsSource : [];

    // Highlight canceled bookings with red background
    const isCanceled = item.status === "canceled" || item.status === "cancelled";
    const rowBackgroundColor = isCanceled 
      ? "#FEE2E2" // Light red background for canceled
      : (index % 2 === 0 ? "#fafafa" : "#fff");

    return (
      <View style={[tableStyles.tableRow, { backgroundColor: rowBackgroundColor }]}>
        <Text style={[tableStyles.tableCell, { width: columnWidths.sno, textAlign: "center" }]}>{sno}</Text>
        <Text style={[tableStyles.tableCell, { width: columnWidths.name }]} numberOfLines={2}>{item.customerName || item.customerPhone}</Text>
        <Text style={[tableStyles.tableCell, { width: columnWidths.phone, color: "#666" }]} numberOfLines={1}>{item.customerPhone || "-"}</Text>
        <View style={{ width: columnWidths.rooms, gap: 2 }}>
          {roomsToShow.length > 0 ? (
            roomsToShow.map((room) => (
              <Text key={room} style={[tableStyles.tableCell, tableStyles.roomCell, { width: columnWidths.rooms }]}> 
                {room}
              </Text>
            ))
          ) : (
            <Text style={[tableStyles.tableCell, { color: "#666" }]}>-</Text>
          )}
        </View>
        {isPast ? (
          <>
            <Text style={[tableStyles.tableCell, { width: columnWidths.checkIn, color: "#666" }]}>
              {new Date(item.CheckInDate).toLocaleDateString()}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.checkOut, color: "#666" }]}>
              {item.CheckOutDate ? new Date(item.CheckOutDate).toLocaleDateString() : "-"}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.total, textAlign: "right", fontWeight: "700" }]}>
              ₹{item.TotalAmount?.toLocaleString?.() ?? item.TotalAmount ?? 0}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.status, textAlign: "center", fontWeight: "500", color: isCanceled ? "#DC2626" : (item.paymentStatus === "Pending" ? "#E53935" : "#43A047") }]}> 
              {isCanceled ? "Canceled" : (item.paymentStatus || "Paid")}
            </Text>
            {/* Download buttons for proofs */}
            <View style={[tableStyles.tableCell, { width: columnWidths.downloads, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 }]}>
              <TouchableOpacity
                onPress={() => downloadProof(item.customer_proof_url || item.CustomerIdProof as string, 'Customer')}
                style={[
                  tableStyles.downloadBtn,
                  tableStyles.downloadBtnGreen,
                  (!item.customer_proof_url && !item.CustomerIdProof) && tableStyles.downloadBtnDisabled
                ]}
                disabled={!item.customer_proof_url && !item.CustomerIdProof}
              >
                <Text style={tableStyles.downloadBtnIcon}>👤</Text>
                <Text style={tableStyles.downloadBtnLabel}>C</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => downloadProof(item.guest_proof_url, 'Guest')}
                style={[
                  tableStyles.downloadBtn,
                  tableStyles.downloadBtnGreen,
                  !item.guest_proof_url && tableStyles.downloadBtnDisabled
                ]}
                disabled={!item.guest_proof_url}
              >
                <Text style={tableStyles.downloadBtnIcon}>👥</Text>
                <Text style={tableStyles.downloadBtnLabel}>G</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => downloadProof(item.customerVechileIdProof as string, 'Vehicle')}
                style={[
                  tableStyles.downloadBtn,
                  tableStyles.downloadBtnGreen,
                  !item.customerVechileIdProof && tableStyles.downloadBtnDisabled
                ]}
                disabled={!item.customerVechileIdProof}
              >
                <Text style={tableStyles.downloadBtnIcon}>🚗</Text>
                <Text style={tableStyles.downloadBtnLabel}>V</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={[tableStyles.tableCell, { width: columnWidths.pending, textAlign: "right", fontWeight: "700", color: "#C62828" }]}> 
              ₹{item.PendingAmount?.toLocaleString?.() ?? item.PendingAmount ?? 0}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.bookingStatus, textAlign: "center", fontWeight: "600", color: item.status === "checked_in" ? "#3B82F6" : "#F59E0B" }]}> 
              {item.status === "checked_in" ? "Checked In" : item.status === "future" ? "Future" : item.status || "-"}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.paymentStatus, textAlign: "center", fontWeight: "500", color: item.paymentStatus === "Pending" ? "#E53935" : "#43A047" }]}> 
              {item.paymentStatus || "Pending"}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.checkIn, color: "#666" }]}>
              {new Date(item.CheckInDate).toLocaleDateString()}
            </Text>
            <Text style={[tableStyles.tableCell, { width: columnWidths.checkOut, color: "#666" }]}>
              {item.CheckOutDate ? new Date(item.CheckOutDate).toLocaleDateString() : "-"}
            </Text>
            {/* Cancel button for future bookings */}
            {item.status === 'future' ? (
              <View style={[tableStyles.tableCell, { width: columnWidths.cancel, justifyContent: "center", alignItems: "center" }]}>
                <TouchableOpacity
                  onPress={() => handleCancelBooking(item.BookingId, item.customerName)}
                  style={tableStyles.cancelBtn}
                >
                  <Text style={tableStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[tableStyles.tableCell, { width: columnWidths.cancel, textAlign: "center", fontWeight: "500", color: "#43A047" }]}> 
                {"-"}
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  const Table = ({ title, data, isPast, loading, controls }: { title: string; data: Booking[]; isPast?: boolean; loading?: boolean; controls?: React.ReactNode }) => {
    const columnWidths: Record<string, number> = isPast
      ? {
          sno: 60,
          name: 140,
          phone: 110,
          rooms: 110,
          checkIn: 120,
          checkOut: 120,
          total: 110,
          status: 90,
          downloads: 140,
        }
      : {
          sno: 60,
          name: 130,
          phone: 110,
          rooms: 100,
          pending: 100,
          bookingStatus: 100,
          paymentStatus: 90,
          checkIn: 110,
          checkOut: 110,
          cancel: 80,
        };
    const minWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
    return (
      <View style={[styles.card, { marginBottom: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111" }}>{title}</Text>
          {controls}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#43A047" style={{ margin: 10 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth }}>
              {data.length > 0 ? (
                <View style={tableStyles.tableHeaderRow}>
                  <Text style={[tableStyles.tableHeader, { width: columnWidths.sno, textAlign: "center" }]}>S.No</Text>
                  <Text style={[tableStyles.tableHeader, { width: columnWidths.name }]}>Name</Text>
                  <Text style={[tableStyles.tableHeader, { width: columnWidths.phone }]}>Phone</Text>
                  <Text style={[tableStyles.tableHeader, { width: columnWidths.rooms }]}>Rooms</Text>
                  {isPast ? (
                    <>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.checkIn }]}>Check-in</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.checkOut }]}>Check-out</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.total, textAlign: "right" }]}>Total</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.status, textAlign: "center" }]}>Status</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.downloads, textAlign: "center" }]}>Proofs</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.pending, textAlign: "right" }]}>Pending</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.bookingStatus, textAlign: "center" }]}>Booking</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.paymentStatus, textAlign: "center" }]}>Payment</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.checkIn }]}>Check-in</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.checkOut }]}>Check-out</Text>
                      <Text style={[tableStyles.tableHeader, { width: columnWidths.cancel, textAlign: "center" }]}>Action</Text>
                    </>
                  )}
                </View>
              ) : null}
              <FlatList
                data={data}
                keyExtractor={(i) => i._id}
                renderItem={({ index, item }) => renderRow({ index, item, isPast, columnWidths })}
                scrollEnabled={false}
                getItemLayout={(_, idx) => ({ length: 55, offset: 55 * idx, index: idx })}
                ListEmptyComponent={<Text style={{ paddingVertical: 12, color: "#666", textAlign: "left", width: minWidth }}>No data</Text>}
              />
            </View>
          </ScrollView>
        )}
      </View>
    );
  };

  const MonthYearPicker = ({ visible, onCancel, onConfirm, onClear }: { visible: boolean; onCancel: () => void; onConfirm: (year: number, month: number) => void; onClear: () => void }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return (
      <Modal transparent visible={visible} animationType="slide">
        <View style={pickerStyles.backdrop}>
          <View style={pickerStyles.container}>
            <View style={pickerStyles.yearSelector}>
              <TouchableOpacity onPress={() => setYear(year - 1)} style={pickerStyles.yearBtn}><Text style={pickerStyles.yearBtnText}>{"<"}</Text></TouchableOpacity>
              <Text style={pickerStyles.yearText}>{year}</Text>
              <TouchableOpacity onPress={() => setYear(year + 1)} style={pickerStyles.yearBtn}><Text style={pickerStyles.yearBtnText}>{">"}</Text></TouchableOpacity>
            </View>
            <View style={pickerStyles.monthGrid}>
              {months.map((m, idx) => (<TouchableOpacity key={m} style={pickerStyles.monthBtn} onPress={() => onConfirm(year, idx + 1)}><Text style={pickerStyles.monthText}>{m}</Text></TouchableOpacity>))}
            </View>
            <View style={{ flexDirection:"row", justifyContent:"space-between", marginTop:12 }}>
              <TouchableOpacity onPress={onClear} style={[pickerStyles.cancelBtn,{ flex:1, marginRight:8 }]}><Text style={pickerStyles.cancelText}>Clear</Text></TouchableOpacity>
              <TouchableOpacity onPress={onCancel} style={[pickerStyles.cancelBtn,{ flex:1, marginLeft:8 }]}><Text style={pickerStyles.cancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f6f8" }}>
      <PageHeader
        title="Admin Dashboard"
        showBack={false}
        rightLabel="⎋"
        onRightPress={() => {
          Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Logout",
              style: "destructive",
              onPress: async () => {
                const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
                await AsyncStorage.removeItem("userToken");
                await AsyncStorage.removeItem("userData");
                router.replace("/login");
              },
            },
          ]);
        }}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#43A047" />
          <Text style={{ marginTop: 10, color: "#666" }}>Loading...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1, padding: 16 }}
            contentContainerStyle={{ paddingBottom: Math.max(180, insets.bottom + 180) }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchAll()} />}
          >
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Image source={require("../assets/harirams_logo.png")} style={{ width: 120, height: 120, resizeMode: "contain" }} />
            </View>

            {/* Enterprise Revenue Section */}
            {revenueData && (
              <RevenueSection revenueData={revenueData} navigation={navigator} />
            )}

            {/* Booking % Gauge */}
            <View style={{ marginBottom: 12 }}>
              {loadingOccupancy ? (
                <ActivityIndicator size="large" color="#43A047" style={{ marginVertical: 40 }} />
              ) : occupancyData ? (
                <OccupancyGauge 
                  percentage={percent} 
                  bookedCount={bookedCount} 
                  availableCount={availableCount}
                  totalRooms={totalRooms}
                />
              ) : (
                <View style={[styles.card, { padding: 20, alignItems: 'center' }]}>
                  <Text style={{ color: '#666', fontSize: 14 }}>Failed to load occupancy data</Text>
                </View>
              )}
            </View>

            {/* Current bookings */}
            <TextInput placeholder="Search today bookings (phone)" placeholderTextColor="#000" value={currentSearch} onChangeText={setCurrentSearch} style={[styles.inputLike, { marginBottom: 10 }]} />
            <Table title="Current Bookings" data={current} loading={loadingCurrent} />

            {currentPagination && (
              <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16, gap: 12 }}>
                <TouchableOpacity
                  disabled={!currentPagination.hasPrevPage}
                  style={[styles.smallBtn, { backgroundColor: currentPagination.hasPrevPage ? "#43A047" : "#ccc" }]}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <Text style={styles.smallBtnText}>Prev</Text>
                </TouchableOpacity>
                <Text style={{ alignSelf: "center" }}>Page {currentPagination.currentPage} / {currentPagination.totalPages}</Text>
                <TouchableOpacity
                  disabled={!currentPagination.hasNextPage}
                  style={[styles.smallBtn, { backgroundColor: currentPagination.hasNextPage ? "#43A047" : "#ccc" }]}
                  onPress={() => setCurrentPage((p) => p + 1)}
                >
                  <Text style={styles.smallBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Past bookings */}
            <View style={[styles.filterBar, { marginTop: 10, marginBottom: 10 }] }>
              <TextInput placeholder="Search past bookings (phone)" placeholderTextColor="#000" value={pastSearch} onChangeText={setPastSearch} style={[styles.inputLike, { flex: 1 }]} />
              <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={[styles.inputLike, { width: 140, justifyContent: "center" }]}><Text>{pastMonth || "Select Month"}</Text></TouchableOpacity>
            </View>

            <MonthYearPicker visible={showMonthPicker} onCancel={() => setShowMonthPicker(false)} onClear={() => { setPastMonth(undefined); setShowMonthPicker(false); }} onConfirm={confirmMonthSelection} />

            <Table title="Past Bookings" data={past} isPast loading={loadingPast} />

            {pastPagination && (
              <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 16, gap: 12 }}>
                <TouchableOpacity disabled={!pastPagination.hasPrevPage} style={[styles.smallBtn, { backgroundColor: pastPagination.hasPrevPage ? "#43A047" : "#ccc" }]} onPress={() => setPastPage((p) => Math.max(1, p - 1))}><Text style={styles.smallBtnText}>Prev</Text></TouchableOpacity>
                <Text style={{ alignSelf: "center" }}>Page {pastPagination.currentPage} / {pastPagination.totalPages}</Text>
                <TouchableOpacity disabled={!pastPagination.hasNextPage} style={[styles.smallBtn, { backgroundColor: pastPagination.hasNextPage ? "#43A047" : "#ccc" }]} onPress={() => setPastPage((p) => p + 1)}><Text style={styles.smallBtnText}>Next</Text></TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* FAB buttons */}
          <TouchableOpacity style={[styles.fab, { bottom: Math.max(90, insets.bottom + 20) }]} onPress={() => router.push("/staffDashboard")}>
            <Text style={styles.fabText}>+ Create and Update Booking</Text>
          </TouchableOpacity>
      
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  inputLike: { padding: 10, borderRadius: 8, backgroundColor: "#fff", marginBottom: 8, marginRight:3, borderWidth: 1, borderColor: "#ddd", minHeight: 42 },
  filterBar: { flexDirection: "row", alignItems: "center" },
  fab: { position: "absolute", right: 16, backgroundColor: "#43A047", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 20, elevation: 4 },
  fabText: { color: "#fff", fontWeight: "600" },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#43A047", borderRadius: 6 },
  smallBtnText: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
});

const tableStyles = StyleSheet.create({
  tableHeaderRow: { flexDirection: "row", paddingVertical: 8, backgroundColor: "#a9f29d", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomWidth: 2, borderColor: "#43A047" },
  tableHeader: { fontSize: 13, fontWeight: "700", color: "black", paddingHorizontal: 10 },
  tableRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderColor: "#f0f0f0", alignItems: "center", minHeight: 55 },
  tableCell: { fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, color: "#111" },
  roomCell: { fontWeight: "600", paddingVertical: 2 },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  downloadBtnGreen: {
    backgroundColor: "#22C55E",
    borderColor: "#16A34A",
  },
  downloadBtnDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    opacity: 0.6,
  },
  downloadBtnIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  downloadBtnLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: -2,
  },
  cancelBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});

const gaugeStyles = StyleSheet.create({
  container: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 20, 
    shadowColor: "#000", 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    shadowOffset: { width: 0, height: 2 }, 
    elevation: 3 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#0F172A" 
  },
  percentageBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconText: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
});

const pickerStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
  container: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, alignItems: "center" },
  yearSelector: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  yearBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#eee", borderRadius: 6, marginHorizontal: 10 },
  yearBtnText: { fontSize: 18, fontWeight: "600" },
  yearText: { fontSize: 18, fontWeight: "700" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  monthBtn: { width: "25%", paddingVertical: 10, alignItems: "center" },
  monthText: { fontSize: 14, fontWeight: "600" },
  cancelBtn: { paddingVertical: 10, backgroundColor: "#ccc", borderRadius: 6, alignItems: "center" },
  cancelText: { color: "#111", fontWeight: "600" },
});
